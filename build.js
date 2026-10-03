#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";
import chalk from "chalk";
import ora from "ora";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { glob } from "glob";
import { minify } from "terser";
import { execFile } from "child_process";
import util from "util";

const execFileAsync = util.promisify(execFile);

// Configuration
const CONFIG = {
	sourceDir: ".",
	buildDir: "build",
	distDir: "dist",
	browsers: ["firefox", "chrome"],
	version: null, // Will be read from manifest.json

	copyPatterns: [
		"_locales/**/*",
		"background/**/*",
		"content/**/*",
		"icons/**/*",
		"popup/**/*",
		"shared/**/*",
		"manifest.json",
		"README.md",
		"LICENSE",
	],

	// Files to exclude (only system files that might be within copyPatterns)
	excludePatterns: ["**/.DS_Store", "**/Thumbs.db", "**/*.log", "**/node_modules/**"],
};

// CLI argument parsing
const argv = yargs(hideBin(process.argv))
	.option("dev", {
		alias: "development",
		type: "boolean",
		description: "Build for development (unminified)",
	})
	.option("prod", {
		alias: "production",
		type: "boolean",
		description: "Build for production (Chrome minified)",
	})
	.option("firefox", {
		type: "boolean",
		description: "Build only for Firefox",
	})
	.option("chrome", {
		type: "boolean",
		description: "Build only for Chrome",
	})
	.option("pack", {
		type: "boolean",
		description: "Create ZIP packages after building",
	})
	.option("dist", {
		type: "boolean",
		description: "Create distribution packages (XPI for Firefox, ZIP for Chrome)",
	})
	.option("clean", {
		type: "boolean",
		description: "Clean build directories before building",
	})
	.option("upload", {
		type: "boolean",
		description: "Upload distribution packages to GitHub using gh CLI",
	})
	.option("verbose", {
		alias: "v",
		type: "boolean",
		description: "Enable verbose logging",
	})
	.help()
	.alias("help", "h").argv;

// Logger utility
class Logger {
	constructor(verbose = false) {
		this.verbose = verbose;
	}

	info(message) {
		console.log(chalk.blue("ℹ"), message);
	}

	success(message) {
		console.log(chalk.green("✓"), message);
	}

	warn(message) {
		console.warn(chalk.yellow("⚠"), message);
	}

	error(message) {
		console.error(chalk.red("✗"), message);
	}

	debug(message) {
		if (this.verbose) {
			console.log(chalk.gray("→"), message);
		}
	}
}

// Main build class
export class ExtensionBuilder {
	constructor(config, logger) {
		this.config = config;
		this.logger = logger;
		this.sourceManifest = null;
	}

	async initialize() {
		// Load package.json to get version
		const packagePath = path.join(this.config.sourceDir, "package.json");
		const packageJson = await fs.readJson(packagePath);

		// Load source manifest to get version
		const manifestPath = path.join(this.config.sourceDir, "manifest.json");
		if (!(await fs.pathExists(manifestPath))) {
			throw new Error(`Manifest file not found at ${manifestPath}`);
		}

		this.sourceManifest = await fs.readJson(manifestPath);

		// Ensure versions are synchronized
		if (this.sourceManifest.version !== packageJson.version) {
			this.logger.warn(`Version mismatch: manifest.json (${this.sourceManifest.version}) and package.json (${packageJson.version}). Syncing to manifest.json.`);
			packageJson.version = this.sourceManifest.version;
			await fs.writeJson(packagePath, packageJson, { spaces: 2 });
		}

		const lockPath = path.join(this.config.sourceDir, "package-lock.json");
		if (await fs.pathExists(lockPath)) {
			const lock = await fs.readJson(lockPath);
			if (lock.version !== this.sourceManifest.version) {
				lock.version = this.sourceManifest.version;
				lock.packages[""].version = this.sourceManifest.version;
				await fs.writeJson(lockPath, lock, { spaces: 2 });
			}
		}

		this.config.version = this.sourceManifest.version;

		this.logger.info(`Building extension version ${this.config.version}`);
	}

	async clean() {
		const spinner = ora("Cleaning build directories").start();

		try {
			await fs.remove(this.config.buildDir);
			await fs.remove(this.config.distDir);
			spinner.succeed("Build directories cleaned");
		} catch (error) {
			spinner.fail("Failed to clean build directories");
			throw error;
		}
	}

	async createDirectories() {
		const dirs = [
			this.config.buildDir,
			this.config.distDir,
			...this.config.browsers.map((browser) => path.join(this.config.buildDir, browser)),
		];

		for (const dir of dirs) {
			await fs.ensureDir(dir);
			this.logger.debug(`Created directory: ${dir}`);
		}
	}

	async copyFiles(browser) {
		const targetDir = path.join(this.config.buildDir, browser);
		const spinner = ora(`Copying and processing files for ${browser}`).start();

		try {
			// Copy all files matching patterns
			for (const pattern of this.config.copyPatterns) {
				const files = await glob(pattern, {
					cwd: this.config.sourceDir,
					nodir: true,
					ignore: this.config.excludePatterns
				});

				for (const file of files) {
					const sourcePath = path.join(this.config.sourceDir, file);
					const targetPath = path.join(targetDir, file);

					// Ensure target directory exists
					await fs.ensureDir(path.dirname(targetPath));

					// Process or copy file
					await this.processAndCopyFile(sourcePath, targetPath, browser);
				}
			}

			spinner.succeed(`Files processed for ${browser}`);
		} catch (error) {
			spinner.fail(`Failed to process files for ${browser}`);
			throw error;
		}
	}

	async processAndCopyFile(sourcePath, targetPath, browser) {
		const ext = path.extname(sourcePath);

		if (ext === ".js") {
			await this.processJsFile(sourcePath, targetPath, browser);
		} else {
			await fs.copy(sourcePath, targetPath);
		}
	}

	async processJsFile(sourcePath, targetPath, browser) {
		let content = await fs.readFile(sourcePath, "utf8");

		// AMO requires source code submission for minified code, so Firefox builds stay readable
		if ((argv.prod || argv.dist) && browser !== "firefox") {
			try {
				const minified = await minify(content, {
					compress: {
						passes: 2,
					},
					mangle: true,
					format: {
						comments: false,
					},
				});
				if (minified.code) {
					content = minified.code;
				}
			} catch (error) {
				this.logger.warn(`Failed to minify ${path.basename(sourcePath)}: ${error.message}`);
			}
		}
		
		await fs.writeFile(targetPath, content);
	}

	async modifyManifest(browser) {
		const manifestPath = path.join(this.config.buildDir, browser, "manifest.json");
		const manifest = await fs.readJson(manifestPath);

		// Browser-specific modifications
		if (browser === "firefox") {
			this.modifyFirefoxManifest(manifest);
		} else if (browser === "chrome") {
			this.modifyChromeManifest(manifest);
		}

		if (argv.dev) {
			manifest.name += " (Dev)";
		}

		await fs.writeJson(manifestPath, manifest, { spaces: 2 });
		this.logger.debug(`Modified manifest for ${browser}`);
	}

	modifyFirefoxManifest(manifest) {
		// Firefox doesn't support background service workers
		if (manifest.background?.service_worker) {
			manifest.background = { scripts: [manifest.background.service_worker] };
		}

		delete manifest.minimum_chrome_version;

		this.logger.debug("Applied Firefox-specific manifest modifications");
	}

	modifyChromeManifest(manifest) {
		delete manifest.browser_specific_settings;

		this.logger.debug("Applied Chrome-specific manifest modifications");
	}

	async buildBrowser(browser) {
		const spinner = ora(`Building ${browser} extension`).start();
		const targetDir = path.join(this.config.buildDir, browser);

		try {
			// Ensure we start with a clean target directory for this browser build
			await fs.emptyDir(targetDir);
			
			await this.copyFiles(browser);
			await this.modifyManifest(browser);

			spinner.succeed(`${browser} extension built successfully`);
		} catch (error) {
			spinner.fail(`Failed to build ${browser} extension`);
			throw error;
		}
	}

	async createZipPackage(browser) {
		const buildPath = path.join(this.config.buildDir, browser);
		const zipName = `${browser}-extension-v${this.config.version}${argv.dev ? "-dev" : ""}.zip`;
		const zipPath = path.join(this.config.distDir, zipName);

		const spinner = ora(`Creating ${browser} ZIP package`).start();

		try {
			const output = fs.createWriteStream(zipPath);
			const archive = archiver("zip", { zlib: { level: 9 } });

			return new Promise((resolve, reject) => {
				output.on("close", () => {
					const size = (archive.pointer() / 1024).toFixed(2);
					spinner.succeed(`${browser} ZIP created: ${zipName} (${size} KB)`);
					resolve();
				});

				archive.on("error", reject);
				output.on("error", reject);

				archive.pipe(output);
				archive.directory(buildPath, false);
				archive.finalize();
			});
		} catch (error) {
			spinner.fail(`Failed to create ${browser} ZIP package`);
			throw error;
		}
	}

	async createDistributionPackage(browser) {
		const config = this.getDistributionConfig(browser);
		const buildPath = path.join(this.config.buildDir, browser);
		const packagePath = path.join(this.config.distDir, config.filename);

		const spinner = ora(`Creating ${config.displayName}`).start();

		try {
			const output = fs.createWriteStream(packagePath);
			const archive = archiver("zip", {
				zlib: { level: 9 },
				comment: config.comment
			});

			return new Promise((resolve, reject) => {
				output.on("close", () => {
					const size = (archive.pointer() / 1024).toFixed(2);
					spinner.succeed(`${config.displayName} created: ${config.filename} (${size} KB)`);
					resolve(packagePath);
				});

				archive.on("error", reject);
				output.on("error", reject);

				archive.pipe(output);
				archive.directory(buildPath, false);
				archive.finalize();
			});
		} catch (error) {
			spinner.fail(`Failed to create ${config.displayName}`);
			throw error;
		}
	}

	getDistributionConfig(browser) {
		const devSuffix = argv.dev ? "-dev" : "";
		const version = this.config.version;

		if (browser === "firefox") {
			return {
				filename: `bga-carcassonne-color-manager-v${version}${devSuffix}.xpi`,
				displayName: "Firefox XPI package",
				comment: `BGA Carcassonne Color Manager v${version} - Firefox Extension`
			};
		} else if (browser === "chrome") {
			return {
				filename: `bga-carcassonne-color-manager-v${version}${devSuffix}-chrome-webstore.zip`,
				displayName: "Chrome Web Store package",
				comment: `BGA Carcassonne Color Manager v${version} - Chrome Web Store Package`
			};
		}
		
		throw new Error(`Unsupported browser for distribution: ${browser}`);
	}

	async uploadToGithub(browsersToBuild) {
		const spinner = ora("Uploading to GitHub repository yzemaze/bga-carcassonne-color-manager").start();

		try {
			const filesToUpload = [];
			for (const browser of browsersToBuild) {
				const config = this.getDistributionConfig(browser);
				const packagePath = path.join(this.config.distDir, config.filename);
				if (await fs.pathExists(packagePath)) {
					filesToUpload.push(packagePath);
				}
			}

			if (filesToUpload.length === 0) {
				spinner.warn("No distribution files found to upload.");
				return;
			}

			const version = this.config.version;
			const repo = "yzemaze/bga-carcassonne-color-manager";
			const tag = `v${version}`;
			const title = `v${version}`;
			const notes = `Release of BGA Carcassonne Color Manager version ${version}`;

			await execFileAsync("gh", ["release", "create", tag, ...filesToUpload, "--repo", repo, "--title", title, "--notes", notes]);
			spinner.succeed(`Successfully uploaded ${filesToUpload.length} files to ${repo} as release ${tag}`);
		} catch (error) {
			spinner.fail(`Failed to upload to GitHub: ${error.message}`);
			if (error.stderr) {
				this.logger.error(`GH CLI Error: ${error.stderr}`);
			}
			throw error;
		}
	}

	async validateBuild(browser) {
		const buildPath = path.join(this.config.buildDir, browser);
		const manifestPath = path.join(buildPath, "manifest.json");

		// Check if manifest exists and is valid JSON
		if (!(await fs.pathExists(manifestPath))) {
			throw new Error(`Manifest not found for ${browser} build`);
		}

		try {
			const manifest = await fs.readJson(manifestPath);

			// Basic validation
			if (!manifest.name || !manifest.version) {
				throw new Error(`Invalid manifest for ${browser}: missing name or version`);
			}

			// Check required files exist
			const requiredFiles = ["background/background.js", "content/main.js"];

			for (const file of requiredFiles) {
				const filePath = path.join(buildPath, file);
				if (!(await fs.pathExists(filePath))) {
					this.logger.warn(`Missing file in ${browser} build: ${file}`);
				}
			}

			this.logger.debug(`Validation passed for ${browser} build`);
		} catch (error) {
			throw new Error(`Manifest validation failed for ${browser}: ${error.message}`);
		}
	}

	async build() {
		try {
			await this.initialize();
			await this.performCleanIfRequested();
			await this.createDirectories();

			const browsersToBuild = this.determineBrowsersToBuild();
			await this.buildAllBrowsers(browsersToBuild);
			await this.createPackagesIfRequested(browsersToBuild);

			if (argv.upload) {
				await this.uploadToGithub(browsersToBuild);
			}

			this.logger.success("Build completed successfully!");
			this.displayBuildSummary(browsersToBuild);
		} catch (error) {
			this.handleBuildError(error);
		}
	}
	async performCleanIfRequested() {
		if (argv.clean) {
			await this.clean();
		}
	}

	determineBrowsersToBuild() {
		let browsersToBuild = [...this.config.browsers];
		if (argv.firefox && !argv.chrome) {
			browsersToBuild = ["firefox"];
		} else if (argv.chrome && !argv.firefox) {
			browsersToBuild = ["chrome"];
		}
		return browsersToBuild;
	}

	async buildAllBrowsers(browsersToBuild) {
		for (const browser of browsersToBuild) {
			await this.buildBrowser(browser);
			await this.validateBuild(browser);
		}
	}

	async createPackagesIfRequested(browsersToBuild) {
		if (argv.pack) {
			for (const browser of browsersToBuild) {
				await this.createZipPackage(browser);
			}
		}

		if (argv.dist) {
			for (const browser of browsersToBuild) {
				await this.createDistributionPackage(browser);
			}
		}
	}

	displayBuildSummary(browsersToBuild) {
		console.log("\n" + chalk.bold("Build Summary:"));
		console.log(`Version: ${this.config.version}`);
		console.log(`Browsers: ${browsersToBuild.join(", ")}`);
		
		let mode = "default";
		if (argv.dev) {
			mode = "development";
		} else if (argv.prod) {
			mode = "production";
		}
		console.log(`Mode: ${mode}`);
		console.log(`Output: ${path.resolve(this.config.buildDir)}`);
		
		if (argv.pack || argv.dist) {
			console.log(`Packages: ${path.resolve(this.config.distDir)}`);
			if (argv.dist) {
				console.log("Distribution packages ready for store submission");
			}
		}
	}

	handleBuildError(error) {
		this.logger.error(`Build failed: ${error.message}`);
		if (argv.verbose) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}

// Main execution
async function main() {
	const logger = new Logger(argv.verbose);
	const builder = new ExtensionBuilder(CONFIG, logger);

	const buildFlags = ["dev", "prod", "firefox", "chrome", "pack", "dist", "upload"];
	if (argv.clean && !buildFlags.some((flag) => argv[flag])) {
		await builder.clean();
		logger.success("Clean completed");
		return;
	}

	await builder.build();
}

// Run if called directly
if (import.meta.url.startsWith("file:")) {
	const modulePath = fileURLToPath(import.meta.url);
	if (process.argv[1] === modulePath) {
		main().catch((error) => {
			console.error(chalk.red("Fatal error:"), error.message);
			process.exit(1);
		});
	}
}