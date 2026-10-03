/**
 * @fileoverview Background script for BGA Carcassonne Color Manager WebExtension
 * Handles the keyboard shortcut that turns the extension on or off.
 */

chrome.commands.onCommand.addListener(async (command) => {
	if (command !== "toggle-enabled") {
		return;
	}
	const { settings = {} } = await chrome.storage.local.get("settings");
	// A missing value means the user never turned the extension off
	await chrome.storage.local.set({ settings: { ...settings, enabled: settings.enabled === false } });
});
