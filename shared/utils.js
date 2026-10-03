/**
 * Utils Module for BGA Carcassonne Color Manager Extension
 * Provides logging, color conversion, settings management and DOM helpers.
 *
 * @module utils
 */

/**
 * Debug logging helper for all modules with log level support
 * @param {string} module - Module name (e.g., "PlayerColors")
 * @param {string} message - Log message
 * @param {*} data - Optional data to log (only logged if verboseLogging is enabled)
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {boolean} verbose - Whether this is verbose logging (requires both debug and verbose modes)
 * @param {boolean} stackTrace - Whether to include stacktrace when verbose mode is enabled
 */
function debugLog(module, message, data = null, level = "info", verbose = false, stackTrace = false) {
	if (!shouldProcessLog(level, verbose, module, message, data)) {
		return;
	}

	const normalizedLevel = level === "log" ? "info" : level;
	
	if (!shouldDisplayLogLevel(normalizedLevel)) {
		return;
	}

	const logData = prepareLogData(data, stackTrace, verbose);
	const logMethod = getLogMethod(normalizedLevel);
	
	outputLog(logMethod, module, message, logData, verbose);
}

/**
 * Checks if a log should be processed based on settings and mode
 * @param {string} level - Log level
 * @param {boolean} verbose - Whether this is verbose logging
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {*} data - Log data
 * @returns {boolean} True if log should be processed
 */
function shouldProcessLog(level, verbose, module, message, data) {
	// If settingsManager isn't available, only allow error-level logs as a fallback
	if (!window.settingsManager) {
		if (level === "error") {
			console.error(`[${module}] ${message}`, data || "");
		}
		return false;
	}

	const verboseMode = window.settingsManager.getSetting("verboseLogging");

	// For verbose logs, require verbose mode to be enabled
	return !verbose || verboseMode;
}

/**
 * Checks if a log level should be displayed based on threshold
 * @param {string} normalizedLevel - Normalized log level
 * @returns {boolean} True if should display
 */
function shouldDisplayLogLevel(normalizedLevel) {
	const logLevels = {
		"debug": 1,
		"info": 2, 
		"warn": 3,
		"error": 4
	};

	const currentLogLevel = window.settingsManager.getSetting("logLevel") || "warn";
	const messageLevel = logLevels[normalizedLevel] || logLevels["info"];
	const thresholdLevel = logLevels[currentLogLevel] || logLevels["warn"];
	
	return messageLevel >= thresholdLevel;
}

/**
 * Prepares log data with optional stacktrace
 * @param {*} data - Original log data
 * @param {boolean} stackTrace - Whether to include stacktrace
 * @param {boolean} verbose - Whether verbose mode is enabled
 * @returns {*} Prepared log data
 */
function prepareLogData(data, stackTrace, _verbose) {
	let logData = data;

	if (stackTrace && window.settingsManager?.getSetting("verboseLogging") && data !== null) {
		const stack = new Error().stack;
		const trace = stack.split("\n") || "unknown";
		logData = typeof data === "object" ? { ...data, trace } : { value: data, trace };
	}

	return logData;
}

/**
 * Gets the appropriate console method for the log level
 * @param {string} normalizedLevel - Normalized log level
 * @returns {Function} Console method to use
 */
function getLogMethod(normalizedLevel) {
	if (normalizedLevel === "warn") {
		return console.warn;
	} else if (normalizedLevel === "error") {
		return console.error;
	} else {
		// For info, debug, and other levels, use console.warn as fallback
		// eslint-disable-next-line no-console
		return console.log;
	}
}

/**
 * Outputs the log message using the appropriate method
 * @param {Function} logMethod - Console method to use
 * @param {string} module - Module name
 * @param {string} message - Log message
 * @param {*} logData - Log data
 * @param {boolean} verbose - Whether verbose mode is enabled
 */
function outputLog(logMethod, module, message, logData, _verbose) {
	const verboseMode = window.settingsManager.getSetting("verboseLogging");
	
	if (logData !== null && verboseMode) {
		logMethod(`[${module}] ${message}`, logData);
	} else {
		logMethod(`[${module}] ${message}`);
	}
}

/**
 * Converts RGB color string to Hex
 * @param {string} rgb - RGB color string like "rgb(255, 0, 0)"
 * @returns {string} Hex color string like "#ff0000"
 */
function rgbToHex(rgb) {
	if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "#000000";
	
	// Check if it's already hex
	if (rgb.startsWith("#")) return rgb;

	const rgbMatch = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	if (!rgbMatch) return "#000000";

	const r = parseInt(rgbMatch[1]);
	const g = parseInt(rgbMatch[2]);
	const b = parseInt(rgbMatch[3]);

	return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Settings Manager - handles loading and applying extension settings
 */
class SettingsManager {
	constructor() {
		this.settings = null;
		this.defaultSettings = window.DEFAULT_SETTINGS;
	}

	async init() {
		debugLog("Utils", "Initializing SettingsManager", null, "info");
		await this.loadSettings();
		this.setupStorageListener();
		debugLog("Utils", "SettingsManager initialization complete", null, "info");
	}

	async loadSettings() {
		debugLog("Utils", "Loading settings from storage", null, "info");
		try {
			const result = await chrome.storage.local.get("settings");
			this.settings = { ...this.defaultSettings, ...(result.settings || {}) };

			if (!result.settings) {
				debugLog("Utils", "No settings found in storage, saving defaults", null, "info");
				await this.saveSettings();
			}

			debugLog("Utils", "Settings loaded successfully", {
				settingsKeys: Object.keys(this.settings).length,
				hasCustomSettings: !!result.settings
			}, "info");
		} catch (error) {
			debugLog("Utils", "Failed to load settings", error, "error");
			this.settings = { ...this.defaultSettings };
		}
	}

	// Storage events reach all open game tabs, whether the popup or the keyboard shortcut changed settings
	setupStorageListener() {
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area !== "local" || !changes.settings) {
				return;
			}

			const previousSettings = { ...this.settings };
			this.settings = { ...this.defaultSettings, ...changes.settings.newValue };

			const diff = {};
			Object.keys(this.settings).forEach(key => {
				if (this.settings[key] !== previousSettings[key]) {
					diff[key] = { from: previousSettings[key], to: this.settings[key] };
				}
			});
			if (Object.keys(diff).length > 0) {
				debugLog("Utils", "Settings updated", diff, "info");
			}

			this.applySettings(previousSettings);
		});
	}

	async applySettings(previousSettings = null) {
		if (!this.settings || !window.PlayerColors) {
			debugLog("Utils", "Cannot apply settings", null, "warn");
			return;
		}

		const logSettings = ["logLevel", "verboseLogging"];
		const colorsChanged = !previousSettings || Object.keys(this.settings).some(
			(key) => !logSettings.includes(key) && previousSettings[key] !== this.settings[key]
		);

		if (colorsChanged) {
			debugLog("Utils", "Color settings changed, updating player colors", null, "log", true);
			await window.PlayerColors.initializePlayerColors();
			window.PlayerColors.setupPlayerColors();
		}
	}

	getSetting(key) {
		return this.settings ? this.settings[key] : this.defaultSettings[key];
	}

	async saveSettings() {
		try {
			await chrome.storage.local.set({ settings: this.settings });
		} catch (error) {
			debugLog("Utils", "Error saving settings", error, "error");
		}
	}
}

/**
 * Centralized game detection for Carcassonne
 * Checks if the current page is a Carcassonne game
 * @returns {boolean} True if on a Carcassonne game page
 */
function isCarcassonne() {
	const wrapper = document.querySelector("#leftright_page_wrapper");
	return wrapper?.className === "bgagame-carcassonne";
}

/**
 * Waits for a DOM element to become available
 *
 * @param {string} selector - CSS selector for the element
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns {Promise<Element|null>} The found element or null if timeout
 */
async function waitForElement(selector, timeout = 10000) {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const element = document.querySelector(selector);
		if (element) {
			return element;
		}
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}

	debugLog("Utils", "waitForElement timeout", { selector, timeout }, "warn");
	return null;
}

window.Utils = {
	isCarcassonne,
	debugLog,
	rgbToHex,
	waitForElement,
	SettingsManager,

	getSetting(key, defaultValue = null) {
		return window.settingsManager?.getSetting(key) ?? defaultValue;
	},
};
