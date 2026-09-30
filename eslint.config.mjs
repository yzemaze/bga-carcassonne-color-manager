import js from "@eslint/js";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";

export default [
	{
		ignores: ["build/", "dist/", "**/.*"],
	},
	js.configs.recommended,
	sonarjs.configs.recommended,
	{
		rules: {
			"sonarjs/no-identical-functions": "warn",
			"sonarjs/cognitive-complexity": ["warn", 15],
			"no-unused-vars": [
				"warn",
				{
					"args": "after-used",
					"ignoreRestSiblings": true,
					"argsIgnorePattern": "^_",
				},
			],
			"no-console": ["warn", { "allow": ["warn", "error"] }],
			"semi": ["error", "always"],
			"quotes": ["error", "double"],
		},
	},
	{
		// Extension files are classic scripts sharing globals via window
		files: ["content/**/*.js", "popup/**/*.js", "shared/**/*.js"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "script",
			globals: {
				...globals.browser,
				...globals.webextensions,
				debugLog: "readonly",
			},
		},
	},
	{
		files: ["shared/utils.js"],
		languageOptions: {
			globals: { debugLog: "off" },
		},
	},
	{
		files: ["*.js", "*.mjs"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: globals.node,
		},
	},
];
