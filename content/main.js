/**
 * @fileoverview Main content script for BGA Carcassonne Color Manager WebExtension
 *
 * Entry point that detects Carcassonne games, loads settings and applies player colors.
 * Module loading order is defined in manifest.json content_scripts section.
 */

(function () {
	"use strict";

	if (window.bgaCarcassonneColorManager) {
		debugLog("Main", "Extension already initialized, skipping");
		return;
	}
	window.bgaCarcassonneColorManager = true;

	async function main() {
		if (!window.Utils.isCarcassonne()) {
			return;
		}

		try {
			debugLog("Main", "Starting initialization", null, "info");

			const settingsManager = new window.Utils.SettingsManager();
			await settingsManager.init();
			window.settingsManager = settingsManager;

			await window.Utils.waitForElement(".player-name > a");

			await settingsManager.applySettings();
		} catch (error) {
			debugLog("Main", chrome.i18n.getMessage("errorMain"), error, "error");
		}
	}

	main();
})();
