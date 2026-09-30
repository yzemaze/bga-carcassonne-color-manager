/**
 * Player Colors Module for BGA Carcassonne Color Manager Extension
 *
 * Applies user-defined colors to player texts, meeples and tile borders
 * and optionally reorders player colors by preference.
 * Clicking a player board toggles between normal and reversed color order.
 *
 * @module PlayerColors
 */

const COLOR_NAMES = { b: "Blue", y: "Yellow", r: "Red", k: "Black", g: "Green" };

// BGA's original player colors as used in inline styles and class names
const BGA_COLORS = {
	b: { hex: "0000ff", rgb: "rgb(0, 0, 255)" },
	y: { hex: "ffa500", rgb: "rgb(255, 165, 0)" },
	r: { hex: "ff0000", rgb: "rgb(255, 0, 0)" },
	k: { hex: "000000", rgb: "rgb(0, 0, 0)" },
	g: { hex: "008000", rgb: "rgb(0, 128, 0)" },
};

/**
 * Gets a setting with fallback to its default value
 * @param {string} key - Setting key
 * @returns {*} Setting value
 */
function getSettingOrDefault(key) {
	return window.Utils.getSetting(key) || window.DEFAULT_SETTINGS[key];
}

/**
 * Gets user colors of a color group
 * @param {string} settingPrefix - "tileBorder", "playerText" or "meepleColor"
 * @returns {Object} Hex colors without # keyed by color key
 */
function getColors(settingPrefix) {
	const colors = {};
	for (const [key, name] of Object.entries(COLOR_NAMES)) {
		colors[key] = getSettingOrDefault(`${settingPrefix}${name}`).replace("#", "");
	}
	return colors;
}

/**
 * Gets the preferred color order from settings
 * @returns {string[]} Array of color keys in preferred order
 */
function getPreferredColorOrder() {
	return getSettingOrDefault("colorOrder").split("").filter((s) => /[ybkrg]/.test(s));
}

/**
 * Converts hex color to RGB values
 * @param {string} hex - Hex color string (with or without #)
 * @returns {Array<number>} [red, green, blue] values (0-255)
 */
function hexToRgb(hex) {
	hex = hex.replace("#", "");
	return [
		parseInt(hex.substring(0, 2), 16),
		parseInt(hex.substring(2, 4), 16),
		parseInt(hex.substring(4, 6), 16)
	];
}

/**
 * Calculates tint colors based on user-selected base color
 * @param {string} baseColor - User-selected base hex color (e.g., "c504ca")
 * @returns {Object} Base and dark color for SVG styling
 */
function calculateTintColors(baseColor) {
	const [r, g, b] = hexToRgb(baseColor);
	const darkFactor = 0.7;
	
	return {
		base: `#${baseColor}`, // User-selected color
		dark: `#${Math.round(r * darkFactor).toString(16).padStart(2, "0")}${Math.round(g * darkFactor).toString(16).padStart(2, "0")}${Math.round(b * darkFactor).toString(16).padStart(2, "0")}`, // Dark parts and strokes
	};
}

/**
 * Creates SVG meeple element with specified colors
 * @param {string} type - Type of meeple ("standing" or "field")
 * @param {Object} colors - Color object with base, dark properties
 * @returns {string} SVG string for the meeple
 */
function createMeepleSvg(type, colors) {
	if (type === "standing") {
		return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="f">
            <stop style="stop-color:${colors.base};stop-opacity:1" offset=".3"/>
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset="1"/>
        </linearGradient>
        <linearGradient id="e">
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset="0"/>
            <stop style="stop-color:${colors.base};stop-opacity:1" offset="1"/>
        </linearGradient>
        <linearGradient id="d">
            <stop style="stop-color:${colors.base};stop-opacity:1" offset=".725"/>
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset="1"/>
        </linearGradient>
        <linearGradient id="c">
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset="0"/>
            <stop style="stop-color:${colors.base};stop-opacity:1" offset=".434"/>
        </linearGradient>
        <linearGradient id="b">
            <stop style="stop-color:${colors.base};stop-opacity:1" offset=".495"/>
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset="1"/>
        </linearGradient>
        <linearGradient id="a">
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset="0"/>
            <stop style="stop-color:${colors.base};stop-opacity:1" offset=".202"/>
        </linearGradient>
        <linearGradient href="#a" id="h" x1="28.627" y1="13.701" x2="17.462" y2="12.527" gradientUnits="userSpaceOnUse"/>
        <linearGradient href="#c" id="j" x1=".966" y1="12.443" x2="9.531" y2="13.343" gradientUnits="userSpaceOnUse"/>
        <linearGradient href="#d" id="g" x1="22.462" y1="22.076" x2="31.038" y2="22.978" gradientUnits="userSpaceOnUse"/>
        <linearGradient href="#e" id="k" x1="3.214" y1="25.168" x2="7.094" y2="25.168" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1 0 0 1.01275 0 -.362)"/>
        <linearGradient href="#f" id="l" x1="17.764" y1="6.972" x2="13.213" y2="35.704" gradientUnits="userSpaceOnUse"/>
        <radialGradient href="#b" id="i" cx="13.55" cy="8.927" fx="13.55" fy="8.927" r="5.054" gradientTransform="matrix(.98475 .10128 -.6471 6.29202 5.983 -48.613)" gradientUnits="userSpaceOnUse" spreadMethod="pad"/>
    </defs>
    <path d="m27.548 20.82.542-5.546c1.353 1.04 2.497 2.056 2.8 3.171.048.178.088.316.104.456.005.048.008.1.003.153L29.95 29.781a.729.729 0 0 0-.003-.153c-.016-.14-.056-.278-.104-.456-.337-1.242-1.718-2.36-3.269-3.527-1.342-1.009-2.846-2.062-4.072-3.208.903-.066 1.92-.219 2.81-.425.598-.139 1.133-.3 1.54-.491.203-.097.376-.2.509-.332a.6.6 0 0 0 .187-.36v-.01z" style="fill:url(#g);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.124431;stroke-linecap:round;stroke-linejoin:round;font-variation-settings:normal;opacity:1;vector-effect:none;fill-opacity:1;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;-inkscape-stroke:none;stop-color:${colors.dark};stop-opacity:1"/>
    <path d="m17.494 16.136 1.048-10.727c2.05.671 4.304 1.348 6.158 2.04.973.364 1.835.729 2.515 1.121.68.393 1.239 1.011 1.38 1.533L27.548 20.82a.489.489 0 0 0-.017-.167c-.141-.521-.684-.963-1.365-1.356-.68-.392-1.541-.757-2.514-1.12-1.854-.693-4.108-1.37-6.158-2.041z" style="fill:url(#h);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.124;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"/>
    <path d="M8.559 15.035 9.607 4.308c.039-.398.152-.794.368-1.16.468-.797 1.482-1.43 3.13-1.43 1.649 0 3.006.633 3.907 1.43a5.34 5.34 0 0 1 1.53 2.26l-1.048 10.728a5.342 5.342 0 0 0-1.53-2.262c-.901-.796-2.258-1.43-3.907-1.43-1.648 0-2.662.634-3.13 1.43a2.807 2.807 0 0 0-.368 1.16z" style="fill:url(#i);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.124431;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1"/>
    <path d="M1.005 20.307 2.053 9.58c.036-.375.3-.707.66-1.01.467-.392 1.13-.757 1.906-1.12 1.427-.668 3.233-1.323 4.873-1.97l-.933 9.555c-.037.374-.007.75.064 1.1-1.687.672-3.573 1.35-5.052 2.042-.776.363-1.44.728-1.907 1.12-.36.303-.623.635-.66 1.01z" style="fill:url(#j);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.124431;stroke-linecap:round;stroke-linejoin:round;font-variation-settings:normal;opacity:1;vector-effect:none;fill-opacity:1;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;-inkscape-stroke:none;stop-color:${colors.dark};stop-opacity:1"/>
    <path d="m3.276 28.345.62-6.434.097.02c1.001.209 2.1.364 3.04.43-.606 1.162-1.538 2.228-2.333 3.25-.71.914-1.334 1.798-1.424 2.734z" style="fill:url(#k);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.125222;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1"/>
    <path d="M5.132 30.238c-.211 0-.42.003-.627-.014a1.434 1.434 0 0 1-.645-.182.063.063 0 0 0 0-.002.865.865 0 0 1-.362-.418c-.023-.065-.12-.375-.14-.451a2.236 2.236 0 0 1-.07-.809c.116-1.023.8-1.875 1.42-2.681.819-1.042 1.718-2.047 2.35-3.235a.063.063 0 0 0-.004-.014.063.063 0 0 0 .012-.01.063.063 0 0 0-.024-.025.063.063 0 0 0-.01-.036.063.063 0 0 0-.015.006.063.063 0 0 0-.01-.012 23.996 23.996 0 0 1-3.047-.426c-.613-.127-1.222-.273-1.806-.49a3.52 3.52 0 0 1-.68-.328c-.193-.128-.374-.288-.436-.5a4.847 4.847 0 0 1-.032-.326c.041-.396.338-.716.642-.974.568-.467 1.234-.802 1.902-1.119 1.65-.764 3.37-1.369 5.063-2.045l.011-.004a.063.063 0 0 0 .018-.041.063.063 0 0 0 .02-.03 3.69 3.69 0 0 1-.063-1.087c.038-.4.157-.796.361-1.14.62-1.05 1.926-1.417 3.092-1.408h0a.063.063 0 0 0 .002 0c1.409-.005 2.824.488 3.882 1.423a5.32 5.32 0 0 1 1.522 2.245.063.063 0 0 0 .026.014.063.063 0 0 0 .013.025c2.066.679 4.15 1.295 6.187 2.05.861.324 1.72.666 2.517 1.12a.063.063 0 0 0 0 .002h.001c.55.332 1.15.708 1.344 1.327l.011.148a3.556 3.556 0 0 1-.172.33c-.137.135-.311.234-.491.32-.486.225-1.01.364-1.535.488-.926.212-1.869.355-2.815.426a.063.063 0 0 0-.016.018.063.063 0 0 0-.023.002.063.063 0 0 0 0 .025.063.063 0 0 0-.018.022.063.063 0 0 0 .02.016.063.063 0 0 0 0 .025c1.277 1.189 2.71 2.185 4.096 3.228h.001l.001.001c1.25.997 2.736 1.952 3.26 3.51v0h.001l.001.004h0c.021.08.09.385.102.45l.002.13a1.377 1.377 0 0 1-.131.264c-.14.121-.338.16-.534.177-.206.016-.416.01-.628.012h-6.843c-.43 0-.867.02-1.252-.148a.063.063 0 0 0-.002 0c-.382-.146-.665-.463-.964-.758a.063.063 0 0 0-.002 0l-.006-.005-.002-.003-.004-.005a41.574 41.574 0 0 0-1.788-1.76c-.45-.412-.91-.819-1.403-1.185a4.697 4.697 0 0 0-.54-.351.063.063 0 0 0-.004.002.063.063 0 0 0-.002-.004l-.083-.033a.063.063 0 0 0-.025.01.063.063 0 0 0-.028-.008l-.063.033a.063.063 0 0 0-.002.006.063.063 0 0 0-.006 0c-.136.103-.25.228-.355.355a.063.063 0 0 0 0 .002.063.063 0 0 0-.002 0c-.298.37-.538.778-.764 1.19a19.516 19.516 0 0 0-.834 1.763l-.002.003-.002.004-.002.004c-.136.29-.254.607-.536.74a.063.063 0 0 0 0 .002.063.063 0 0 0-.002 0c-.343.182-.752.139-1.154.145H5.132z" style="baseline-shift:baseline;display:inline;overflow:visible;opacity:1;fill:url(#l);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.12462;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;enable-background:accumulate;stop-color:${colors.dark};stop-opacity:1;fill-opacity:1;stroke-opacity:1"/>
</svg>`;
	} else if (type === "field") {
		return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
<defs>
        <linearGradient id="d">
            <stop style="stop-color:${colors.base};stop-opacity:1" offset=".272"/>
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset=".898"/>
        </linearGradient>
        <linearGradient id="c">
            <stop style="stop-color:${colors.base};stop-opacity:1" offset=".102"/>
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset=".712"/>
        </linearGradient>
        <linearGradient id="b">
            <stop style="stop-color:${colors.base};stop-opacity:1" offset="0"/>
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset=".69"/>
        </linearGradient>
        <linearGradient id="a">
            <stop style="stop-color:${colors.dark};stop-opacity:1" offset=".413"/>
            <stop style="stop-color:${colors.base};stop-opacity:1" offset="1"/>
        </linearGradient>
        <linearGradient href="#a" id="h" x1="1.823" y1="30.785" x2="16.791" y2="21.988" gradientUnits="userSpaceOnUse" gradientTransform="translate(.232 .358) scale(.96665)"/>
        <linearGradient href="#d" id="e" x1="22.224" y1="9.458" x2="17.82" y2="2.122" gradientUnits="userSpaceOnUse" gradientTransform="translate(.232 .358) scale(.96665)"/>
        <radialGradient href="#b" id="g" cx="30.123" cy="27.224" fx="30.123" fy="27.224" r="6.302" gradientTransform="matrix(.40958 -.68616 4.59853 2.74494 -107.886 -27.145)" gradientUnits="userSpaceOnUse"/>
        <radialGradient href="#c" id="f" cx="29.569" cy="15.293" fx="29.569" fy="15.293" r="4.224" gradientTransform="matrix(.39265 -.88331 2.40154 1.06754 -19.175 24.175)" gradientUnits="userSpaceOnUse"/>
    </defs>
    <path d="M21.57 8.504c-.085-.91-.358-1.869-.888-2.716-.34-.541-.823-.988-1.39-1.345l-2.243-1.41c.436.315.755.528 1.199 1.285.484.826.847 2.093.9 3.096.797.367 1.598.72 2.421 1.09z" style="baseline-shift:baseline;display:inline;overflow:visible;opacity:1;fill:url(#e);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.10592;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1;enable-background:accumulate;stop-color:#000;stop-opacity:1"/>
    <path d="M5.18 17.139c-.527-.233-2.555-1.24-2.555-1.24.336.134 1.144.419 1.538.522.918.24 1.938.394 2.84.449-.156.28-.493.842-.493.842z" style="baseline-shift:baseline;display:inline;overflow:visible;opacity:1;fill:${colors.dark};fill-opacity:1;fill-rule:evenodd;stroke:${colors.dark};stroke-width:.0966652;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1;enable-background:accumulate;stop-color:#000;stop-opacity:1"/>
    <path d="m24.997 17.58-2.557-1.433a16.149 16.149 0 0 0 2.92-.736c.634-.226 1.211-.479 1.67-.772.228-.146.43-.3.597-.496.168-.195.316-.457.316-.77 0-.735-.422-1.338-.995-1.865-.505-.465-1.158-.894-1.904-1.312l2.556 1.432c.747.419 1.4.847 1.905 1.312.572.527.995 1.13.995 1.866 0 .313-.149.575-.316.77-.168.195-.37.35-.598.496-.458.293-1.036.546-1.67.771-.944.335-2 .601-2.919.737z" style="fill:url(#f);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.107298;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1"/>
    <path d="M18.423 27.212c.357.2.71.155 1.185.133l6.796-.318c.248-.012.441-.018.633-.049.191-.03.426-.094.619-.297.192-.203.247-.45.268-.648.022-.197.02-.393.02-.643 0-1.753-1.076-3.28-2.308-4.867-1.066-1.373-2.282-2.802-3.196-4.376l2.557 1.433c.914 1.574 2.13 3.003 3.196 4.376 1.231 1.587 2.307 3.114 2.307 4.866 0 .25.003.447-.02.644-.02.197-.076.445-.268.648s-.428.267-.62.297c-.19.03-.384.037-.632.048l-6.796.319c-.475.022-.827.067-1.184-.133z" style="fill:url(#g);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.107298;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1"/>
    <path d="M16.474 24.016c-.354-.598-.911-1.488-1.245-1.906a4.096 4.096 0 0 0-.493-.519 4.572 4.572 0 0 0-.522.567c-.334.449-.717 1.078-1.07 1.708-.708 1.261-1.3 2.526-1.3 2.526l-.005.01-.006.011c-.264.513-.399.853-.768 1.116-.369.264-.73.25-1.216.273l-6.826.32c-.243.011-.434.023-.624.01a1.06 1.06 0 0 1-.45-.118l-.003-.002a.776.776 0 0 1-.164-.123c-.19-.186-.242-.426-.263-.62-.022-.195-.019-.39-.019-.64 0-1.753 1.075-3.38 2.307-5.084 1.066-1.473 2.282-3.015 3.196-4.675a15.288 15.288 0 0 1-2.919-.463c-.635-.166-1.212-.365-1.67-.615l-.041-.023a2.241 2.241 0 0 1-.557-.417 1.08 1.08 0 0 1-.316-.74c0-.735.423-1.379.995-1.96.573-.58 1.333-1.13 2.206-1.683 1.663-1.054 3.729-2.107 5.594-3.141.05-1.023.304-2.2.915-3.232.683-1.155 1.867-2.105 3.512-2.182.808-.038 1.504.146 2.085.47.601.338 1.127.8 1.426 1.383.507.987.865 2.129.915 3.147 1.865.86 3.93 1.718 5.594 2.616.102.055.203.11.302.166.746.418 1.399.847 1.904 1.312.573.527.995 1.13.995 1.865 0 .313-.148.575-.316.77-.168.195-.369.35-.598.496-.458.293-1.035.546-1.67.772-.943.335-2 .6-2.919.736.914 1.574 2.13 3.003 3.196 4.376 1.232 1.588 2.307 3.114 2.307 4.867 0 .25.003.446-.019.643-.021.198-.076.445-.268.648-.193.203-.428.267-.62.297-.191.03-.384.037-.632.049l-6.796.318c-.475.022-.828.067-1.185-.133a1.139 1.139 0 0 1-.041-.024c-.372-.228-.508-.557-.773-1.045l-.005-.01-.005-.01s-.419-.913-1.125-2.107z" style="fill:${colors.base};fill-opacity:1;fill-rule:evenodd;stroke:${colors.dark};stroke-width:.107298;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1"/>
    <path d="M4.945 29.585a1.058 1.058 0 0 1-.453-.119l-2.553-1.431c.15.083.312.109.45.118.19.013.38.001.624-.01l6.826-.32c.486-.023.846-.01 1.216-.273.369-.263.503-.603.768-1.116l.005-.01.005-.01s.593-1.266 1.3-2.527c.353-.63.736-1.26 1.07-1.708.167-.225.41-.464.522-.567.113.092.327.31.494.52.333.417.89 1.307 1.244 1.905a20.95 20.95 0 0 0-.774 1.283c-.707 1.26-1.299 2.526-1.299 2.526l-.005.01-.006.011c-.264.513-.399.853-.768 1.116-.369.263-.73.25-1.216.273l-6.826.32c-.243.01-.434.022-.624.01z" style="fill:url(#h);fill-rule:evenodd;stroke:${colors.dark};stroke-width:.107298;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1"/>		</svg>`;
	}
	return "";
}

/**
 * Generates SVG backgrounds for all meeple colors
 * @returns {Object} Standing and field meeple CSS backgrounds keyed by color key
 */
function generateMeepleBackgrounds() {
	const toUrl = (svg) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
	const backgrounds = {};

	for (const [key, baseColor] of Object.entries(getColors("meepleColor"))) {
		const tints = calculateTintColors(baseColor);
		backgrounds[key] = {
			standing: toUrl(createMeepleSvg("standing", tints)),
			field: toUrl(createMeepleSvg("field", tints)),
		};
	}

	return backgrounds;
}

let defaultSheet = null;
let normalSheet = null;
let alternateSheet = null;
let initPromise = null;
let showAlternate = false;
const boardsWithListener = new WeakSet();

function createStyleSheet(id) {
	const sheet = document.createElement("style");
	sheet.id = id;
	document.head.appendChild(sheet);
	return sheet;
}

/**
 * Initializes the player colors stylesheets once player boards are available
 * @returns {Promise<void>}
 */
function initializePlayerColors() {
	initPromise ??= (async () => {
		await window.Utils.waitForElement("#player_boards");
		// style elements instead of CSSStyleSheet for content script compatibility
		defaultSheet = createStyleSheet("player-colors-default");
		normalSheet = createStyleSheet("player-colors-normal");
		alternateSheet = createStyleSheet("player-colors-alternate");
	})();
	return initPromise;
}

/**
 * Converts a player color string to its color key
 * @param {string} color - RGB or hex color string
 * @returns {string|undefined} Color key or undefined if not found
 */
function rgbToColorKey(color) {
	const hex = window.Utils.rgbToHex(color).replace("#", "").toLowerCase();
	return Object.keys(BGA_COLORS).find((key) => BGA_COLORS[key].hex === hex);
}

/**
 * Gets original player colors from player name elements
 * @returns {string[]} Array of RGB color strings
 */
function getOriginalPlayerColors() {
	return [...document.querySelectorAll(".player-name > a")].map((link) => link.style.color);
}

/**
 * Sets tile border width and colors for all BGA colors
 */
function updateDefaultSheet() {
	const width = getSettingOrDefault("tileBorderWidth");
	const borderColors = getColors("tileBorder");
	let rules = ".bgagame-carcassonne .player-board { cursor: pointer; }\n";

	for (const [key, { hex }] of Object.entries(BGA_COLORS)) {
		rules += `.bgagame-carcassonne .tile_last_${hex} .tile_border { border: ${width}px solid #${borderColors[key]}; }\n`;
	}

	defaultSheet.textContent = rules;
}

/**
 * Builds CSS rules mapping one BGA color to a user color
 * @param {string} oldColor - Original color key
 * @param {string} newColor - New color key
 * @param {Object} colors - Text, border and meeple colors
 * @returns {string} CSS rules
 */
function buildColorRules(oldColor, newColor, colors) {
	const { hex, rgb } = BGA_COLORS[oldColor];
	let rules = "";

	if (window.Utils.getSetting("playerColors")) {
		rules += `
			[style*="background: #${hex}"],
			[style*="background: ${rgb}"]
			{ background: #${BGA_COLORS[newColor].hex} !important; }
		`;
	}

	rules += `
		.player-name > [style*="${hex}"],
		.playername[style*="${hex}"],
		span[style*="${hex}"],
		.pointscored[style*="${rgb}"],
		.player-summary[style*="${hex}"],
		.player-summary[style*="${rgb}"],
		.stats-player-header[style*="${hex}"],
		.stats-player-header[style*="${rgb}"],
		.log-player-header[style*="${hex}"],
		.log-player-header[style*="${rgb}"]
		{ color: #${colors.text[newColor]} !important; }

		.partisan.partisanboard.partisan_${hex},
		.partisan.partisan_${hex}
		{ background-image: ${colors.meeple[newColor].standing}; background-size: 32px; background-repeat: no-repeat; background-position: center; filter: drop-shadow(2px 2px 3px rgba(0,0,0,1)); }

		.partisan.partisanboard.partisan_${hex}.fieldpartisan,
		.partisan_${hex}.fieldpartisan
		{ background-image: ${colors.meeple[newColor].field}; background-size: 32px; background-repeat: no-repeat; background-position: center; filter: drop-shadow(2px 2px 3px rgba(0,0,0,1)); }

		.bgagame-carcassonne .tile_last_${hex} .tile_border
		{ border-color: #${colors.border[newColor]} !important; }
	`;

	return rules;
}

function applyScheme() {
	normalSheet.disabled = showAlternate;
	alternateSheet.disabled = !showAlternate;
}

/**
 * Toggles between normal and alternate color order
 */
function togglePlayerColors() {
	if (!window.Utils.getSetting("playerColors")) {
		return;
	}
	showAlternate = !showAlternate;
	applyScheme();
	window.Utils.debugLog("PlayerColors", "Toggled color scheme", { showAlternate });
}

/**
 * Adds click handlers to player boards for manual color toggling
 */
function addPlayerBoardClickHandlers() {
	document.querySelectorAll("#player_boards > .player-board").forEach((playerBoard) => {
		if (boardsWithListener.has(playerBoard)) {
			return;
		}
		playerBoard.addEventListener("click", togglePlayerColors);
		boardsWithListener.add(playerBoard);
	});
}

/**
 * (Re)builds all color rules from current settings
 */
function setupPlayerColors() {
	if (!defaultSheet) {
		window.Utils.debugLog("PlayerColors", "System not initialized, cannot setup", null, "warn");
		return;
	}

	try {
		updateDefaultSheet();

		const originalColors = getOriginalPlayerColors();
		const playerCount = originalColors.length;
		if (playerCount === 0) {
			window.Utils.debugLog("PlayerColors", "No players found, skipping setup", null, "info", true);
			return;
		}

		const reorder = window.Utils.getSetting("playerColors");
		const preferredOrder = reorder ? getPreferredColorOrder() : [];
		const colors = {
			text: getColors("playerText"),
			border: getColors("tileBorder"),
			meeple: generateMeepleBackgrounds(),
		};
		let normalRules = "";
		let alternateRules = "";

		originalColors.forEach((color, i) => {
			const key = rgbToColorKey(color);
			if (!key) {
				window.Utils.debugLog("PlayerColors", `Unknown color: ${color}`, null, "warn");
				return;
			}
			normalRules += buildColorRules(key, preferredOrder[i] ?? key, colors);
			alternateRules += buildColorRules(key, preferredOrder[playerCount - 1 - i] ?? key, colors);
		});

		normalSheet.textContent = normalRules;
		alternateSheet.textContent = alternateRules;
		// replacing textContent creates new stylesheets, which resets their disabled state
		applyScheme();

		window.Utils.debugLog("PlayerColors", "Colors set up", {
			playerCount,
			preferredOrder: reorder ? preferredOrder : "none",
			originalColors: originalColors.map(rgbToColorKey),
		});

		addPlayerBoardClickHandlers();
	} catch (error) {
		debugLog("PlayerColors", "Failed to setup player colors", error, "error");
	}
}

window.PlayerColors = {
	initializePlayerColors,
	setupPlayerColors,
};
