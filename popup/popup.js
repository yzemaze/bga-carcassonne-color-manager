// Popup functionality for BGA Carcassonne Color Manager

/* global ColorPicker */

class PopupManager {
	constructor() {
		this.settings = {};
		this.defaultSettings = window.DEFAULT_SETTINGS;

		this.init();
	}

	async init() {
		try {
			await this.loadSettings();
			this.setupI18n();
			this.colorPicker = new ColorPicker(document.getElementById("color-picker-container"), (color) => {
				if (this.colorPicker.activeSwatch) {
					const settingName = this.colorPicker.activeSwatch.dataset.setting;
					this.settings[settingName] = color;
					this.colorPicker.activeSwatch.style.backgroundColor = color;
					this.saveSettings();
					if (settingName.startsWith("meepleColor")) {
						this.updateColorOrderVisual();
					}
				}
			});
			this.setupEventListeners();
			this.displayVersion();
			this.updateUI();
		} catch (error) {
			debugLog("Popup", "Failed to initialize popup", error, "error");
		}
	}

	displayVersion() {
		try {
			const manifest = chrome.runtime.getManifest();
			const versionElement = document.getElementById("extension-version");
			if (versionElement) {
				versionElement.textContent = manifest.version;
			}
		} catch (error) {
			debugLog("Popup", "Failed to display version", error, "error");
		}
	}

	async loadSettings() {
		try {
			const result = await chrome.storage.local.get("settings");
			this.settings = { ...this.defaultSettings, ...(result.settings || {}) };
		} catch (error) {
			debugLog("Popup", "Failed to load settings", error, "error");
			this.settings = { ...this.defaultSettings };
		}
	}

	async saveSettings() {
		try {
			await chrome.storage.local.set({ settings: this.settings });

			// Notify content scripts about settings change
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				const [activeTab] = tabs;
				if (activeTab) {
					chrome.tabs
						.sendMessage(activeTab.id, {
							type: "settingsUpdated",
							settings: this.settings,
						})
						.catch(() => {
							// Silently fail if content script is not available
						});
				}
			});
		} catch (error) {
			debugLog("Popup", "Failed to save settings", error, "error");
		}
	}

	setupI18n() {
		const elements = document.querySelectorAll("[data-i18n]");
		elements.forEach((element) => {
			const key = element.getAttribute("data-i18n");
			const message = chrome.i18n.getMessage(key);
			if (message) {
				element.textContent = message;
			}
		});

		const titledElements = document.querySelectorAll("[data-i18n-title]");
		titledElements.forEach((element) => {
			const key = element.getAttribute("data-i18n-title");
			const message = chrome.i18n.getMessage(key);
			if (message) {
				element.title = message;
			}
		});
	}

	setupEventListeners() {
		this.setupBorderWidthSlider();

		document.querySelectorAll(".custom-color-swatch").forEach((swatch) => {
			swatch.addEventListener("click", (e) => {
				e.stopPropagation(); // Prevent the picker's outside click listener from hiding it immediately
				this.colorPicker.show(e.target);
			});
		});

		document.getElementById("reset-colors").addEventListener("click", () => {
			this.resetColors();
		});

		this.setupTabs();

		document.getElementById("popup-log-level").addEventListener("change", (e) => {
			this.settings.logLevel = e.target.value;
			this.saveSettings();
		});

		document.getElementById("popup-verbose-logging").addEventListener("change", (e) => {
			this.settings.verboseLogging = e.target.checked;
			this.saveSettings();
		});

		document.getElementById("popup-player-colors").addEventListener("change", (e) => {
			this.settings.playerColors = e.target.checked;
			this.saveSettings();
			this.updateColorOrderSetting();
		});

		this.makeSortable(document.getElementById("color-order-visual"));
	}

	setupTabs() {
		const tabButtons = document.querySelectorAll(".tab-button");
		const tabContents = document.querySelectorAll(".tab-content");

		tabButtons.forEach((button) => {
			button.addEventListener("click", () => {
				const targetTab = button.dataset.tab;

				tabButtons.forEach((btn) => btn.classList.remove("active"));
				tabContents.forEach((content) => content.classList.remove("active"));
				button.classList.add("active");
				document.getElementById(`${targetTab}-tab`).classList.add("active");
			});
		});
	}

	setupBorderWidthSlider() {
		const slider = document.getElementById("popup-tile-border-width");
		const input = document.getElementById("popup-tile-border-width-input");

		const update = (e) => {
			const value = parseInt(e.target.value);
			slider.value = value;
			input.value = value;
			this.settings.tileBorderWidth = value;
			this.saveSettings();
		};

		slider.addEventListener("input", update);
		input.addEventListener("input", update);
	}

	updateUI() {
		document.getElementById("popup-player-colors").checked = this.settings.playerColors;
		document.getElementById("popup-tile-border-width").value = this.settings.tileBorderWidth;
		document.getElementById("popup-tile-border-width-input").value = this.settings.tileBorderWidth;
		document.querySelectorAll(".custom-color-swatch").forEach((swatch) => {
			swatch.style.backgroundColor = this.settings[swatch.dataset.setting];
		});

		document.getElementById("popup-log-level").value = this.settings.logLevel;
		document.getElementById("popup-verbose-logging").checked = this.settings.verboseLogging;

		this.updateColorOrderSetting();
		this.updateColorOrderVisual();
	}

	async resetColors() {
		try {
			const colorSettings = [
				"playerColors", "colorOrder",
				"playerTextGreen", "playerTextYellow", "playerTextRed", "playerTextBlue", "playerTextBlack",
				"meepleColorGreen", "meepleColorYellow", "meepleColorRed", "meepleColorBlue", "meepleColorBlack",
				"tileBorderGreen", "tileBorderYellow", "tileBorderRed", "tileBorderBlue", "tileBorderBlack"
			];

			colorSettings.forEach(setting => {
				this.settings[setting] = this.defaultSettings[setting];
			});

			this.updateUI();
			await this.saveSettings();
		} catch (error) {
			debugLog("Popup", "Failed to reset colors", error, "error");
		}
	}

	makeSortable(container) {
		let draggedElement = null;
		let ghostElement = null;

		const updateGhostPosition = (e) => {
			if (!ghostElement) return;
			ghostElement.style.left = `${e.clientX - 9}px`;
			ghostElement.style.top = `${e.clientY - 9}px`;
		};

		container.addEventListener("mousedown", (e) => {
			const square = e.target.closest(".color-square");
			if (!square) return;

			draggedElement = square;
			draggedElement.classList.add("dragging");

			ghostElement = document.createElement("div");
			ghostElement.className = "color-square-ghost";
			ghostElement.style.backgroundColor = draggedElement.style.backgroundColor;
			document.body.appendChild(ghostElement);

			updateGhostPosition(e);

			e.preventDefault();
		});

		document.addEventListener("mousemove", (e) => {
			if (!draggedElement) return;

			updateGhostPosition(e);

			const overElement = document.elementFromPoint(e.clientX, e.clientY);
			const overSquare = overElement ? overElement.closest(".color-square") : null;

			container.querySelectorAll(".color-square").forEach((s) => s.classList.remove("drag-over"));
			if (overSquare && overSquare !== draggedElement) {
				overSquare.classList.add("drag-over");
			}
		});

		document.addEventListener("mouseup", (e) => {
			if (!draggedElement) return;

			const overElement = document.elementFromPoint(e.clientX, e.clientY);
			const overSquare = overElement ? overElement.closest(".color-square") : null;

			if (overSquare && overSquare !== draggedElement) {
				const fromIndex = parseInt(draggedElement.dataset.index);
				const toIndex = parseInt(overSquare.dataset.index);
				this.reorderColors(fromIndex, toIndex);
			}

			draggedElement.classList.remove("dragging");
			container.querySelectorAll(".color-square").forEach((s) => s.classList.remove("drag-over"));

			if (ghostElement) {
				document.body.removeChild(ghostElement);
			}

			draggedElement = null;
			ghostElement = null;
		});
	}

	updateColorOrderVisual() {
		const container = document.getElementById("color-order-visual");
		if (!container) return;

		const orderString = this.settings.colorOrder || "ybkrg";
		const colorOrder = orderString.split("");

		container.innerHTML = "";

		const colorMap = {
			y: this.settings.meepleColorYellow,
			b: this.settings.meepleColorBlue,
			k: this.settings.meepleColorBlack,
			r: this.settings.meepleColorRed,
			g: this.settings.meepleColorGreen,
		};

		colorOrder.forEach((colorChar, index) => {
			const square = document.createElement("div");
			square.className = "color-square";
			square.dataset.color = colorChar;
			square.dataset.index = index;
			square.style.backgroundColor = colorMap[colorChar];
			square.title = chrome.i18n.getMessage("colorOrderVisualTitle");
			container.appendChild(square);
		});

		this.syncSwatchOrder(colorOrder);
	}

	syncSwatchOrder(colorOrder) {
		const colorNames = { y: "Yellow", b: "Blue", k: "Black", r: "Red", g: "Green" };
		document.querySelectorAll(".color-swatches").forEach((group) => {
			colorOrder.forEach((colorChar) => {
				const swatch = [...group.querySelectorAll(".custom-color-swatch")]
					.find((s) => s.dataset.setting?.endsWith(colorNames[colorChar]));
				if (swatch) group.appendChild(swatch);
			});
		});
	}

	reorderColors(fromIndex, toIndex) {
		const orderString = this.settings.colorOrder || "ybkrg";
		const colors = orderString.split("");

		const [movedColor] = colors.splice(fromIndex, 1);
		colors.splice(toIndex, 0, movedColor);

		this.settings.colorOrder = colors.join("");

		this.updateColorOrderVisual();
		this.saveSettings();
	}

	updateColorOrderSetting() {
		const playerColorsSubs = document.querySelectorAll(".player-colors-sub");
		playerColorsSubs.forEach(element => {
			element.style.display = this.settings.playerColors ? "flex" : "none";
		});
	}
}

// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	// eslint-disable-next-line sonarjs/constructor-for-side-effects
	new PopupManager();
});

document.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		window.close();
	}
});
