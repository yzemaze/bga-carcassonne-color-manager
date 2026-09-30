/**
 * Color Picker Module for BGA Carcassonne Color Manager Extension
 *
 * Provides a color wheel with saturation slider for selecting custom colors.
 * Based on HSL color space with separate hue wheel and saturation/lightness controls.
 *
 * @module ColorPicker
 */

class ColorPicker {
	constructor(container, onColorSelect) {
		this.container = container;
		this.wheelCanvas = this.container.querySelector("#color-wheel");
		this.saturationCanvas = this.container.querySelector("#saturation-slider");
		this.wheelCtx = this.wheelCanvas.getContext("2d");
		this.satCtx = this.saturationCanvas.getContext("2d");
		this.hexInput = this.container.querySelector("#hex-input");

		this.onColorSelect = onColorSelect;
		this.activeSwatch = null;
		
		// Current HSL values
		this.currentHue = 0;
		this.currentSaturation = 1;
		this.currentLightness = 0.5;
		
		this.drawColorWheel();
		this.drawSaturationSlider();
		this.setupEventListeners();
	}

	drawColorWheel() {
		const centerX = this.wheelCanvas.width / 2;
		const centerY = this.wheelCanvas.height / 2;
		const radius = Math.min(centerX, centerY) - 10;
		
		// Clear canvas
		this.wheelCtx.clearRect(0, 0, this.wheelCanvas.width, this.wheelCanvas.height);
		
		// Create image data for pixel-perfect color wheel
		const imageData = this.wheelCtx.createImageData(this.wheelCanvas.width, this.wheelCanvas.height);
		const data = imageData.data;
		
		for (let x = 0; x < this.wheelCanvas.width; x++) {
			for (let y = 0; y < this.wheelCanvas.height; y++) {
				const dx = x - centerX;
				const dy = y - centerY;
				const distance = Math.sqrt(dx * dx + dy * dy);
				
				if (distance <= radius) {
					// Calculate hue from angle
					let angle = Math.atan2(dy, dx) * 180 / Math.PI;
					if (angle < 0) angle += 360;
					
					const [r, g, b] = this.hslToRgb(angle, 1, 0.5);
					const index = (y * this.wheelCanvas.width + x) * 4;
					
					data[index] = r;     // Red
					data[index + 1] = g; // Green
					data[index + 2] = b; // Blue
					data[index + 3] = 255; // Alpha
				}
			}
		}
		
		this.wheelCtx.putImageData(imageData, 0, 0);
	}

	drawSaturationSlider() {
		const width = this.saturationCanvas.width;
		const height = this.saturationCanvas.height;
		
		// Clear canvas
		this.satCtx.clearRect(0, 0, width, height);
		
		// Draw saturation gradient
		const gradient = this.satCtx.createLinearGradient(0, 0, width, 0);
		gradient.addColorStop(0, `hsl(${this.currentHue}, 0%, ${this.currentLightness * 100}%)`);
		gradient.addColorStop(1, `hsl(${this.currentHue}, 100%, ${this.currentLightness * 100}%)`);
		
		this.satCtx.fillStyle = gradient;
		this.satCtx.fillRect(0, 0, width, height);
		
		// Draw lightness gradient overlay (top half lighter, bottom half darker)
		const lightnessGradient = this.satCtx.createLinearGradient(0, 0, 0, height);
		lightnessGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
		lightnessGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
		lightnessGradient.addColorStop(0.5, "rgba(0, 0, 0, 0)");
		lightnessGradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
		
		this.satCtx.fillStyle = lightnessGradient;
		this.satCtx.fillRect(0, 0, width, height);
	}

	setupEventListeners() {
		// Color wheel click handler
		this.wheelCanvas.addEventListener("click", (e) => {
			const rect = this.wheelCanvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			
			const centerX = this.wheelCanvas.width / 2;
			const centerY = this.wheelCanvas.height / 2;
			const radius = Math.min(centerX, centerY) - 10;
			
			const dx = x - centerX;
			const dy = y - centerY;
			const distance = Math.sqrt(dx * dx + dy * dy);
			
			if (distance <= radius) {
				// Calculate hue from angle
				let angle = Math.atan2(dy, dx) * 180 / Math.PI;
				if (angle < 0) angle += 360;
				
				this.currentHue = angle;
				this.currentSaturation = 1;
				this.currentLightness = 0.5;
				
				this.drawSaturationSlider();
				this.selectColor();
			}
		});
		
		// Saturation slider click handler
		this.saturationCanvas.addEventListener("click", (e) => {
			const rect = this.saturationCanvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			
			const saturation = Math.max(0, Math.min(1, x / this.saturationCanvas.width));
			const lightness = Math.max(0, Math.min(1, 1 - (y / this.saturationCanvas.height)));
			
			this.currentSaturation = saturation;
			this.currentLightness = lightness;
			
			this.selectColor();
		});

		// Hex input handler
		this.hexInput.addEventListener("input", (e) => {
			const val = e.target.value;
			if (/^#[0-9A-F]{6}$/i.test(val)) {
				const r = parseInt(val.slice(1, 3), 16);
				const g = parseInt(val.slice(3, 5), 16);
				const b = parseInt(val.slice(5, 7), 16);
				const [h, s, l] = this.rgbToHsl(r, g, b);
				this.currentHue = h;
				this.currentSaturation = s;
				this.currentLightness = l;
				this.drawSaturationSlider();
				if (this.onColorSelect) this.onColorSelect(val.toUpperCase());
			}
		});
		
		// Hide picker when clicking outside
		document.addEventListener("click", (e) => {
			if (!this.container.contains(e.target) && this.container.style.display !== "none") {
				this.hide();
			}
		});
	}

	selectColor() {
		const [r, g, b] = this.hslToRgb(this.currentHue, this.currentSaturation, this.currentLightness);
		const hexColor = this.rgbToHex(r, g, b);
		
		this.hexInput.value = hexColor.toUpperCase();

		if (this.onColorSelect) {
			this.onColorSelect(hexColor);
		}
	}

	hslToRgb(h, s, l) {
		h = h / 360;
		let r, g, b;
		
		if (s === 0) {
			r = g = b = l; // achromatic
		} else {
			const hue2rgb = (p, q, t) => {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			};
			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}
		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}

	rgbToHex(r, g, b) {
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, "0");
	}

	show(swatchElement) {
		this.activeSwatch = swatchElement;
		
		// Add visual highlight to active swatch
		document.querySelectorAll(".custom-color-swatch").forEach(swatch => {
			swatch.classList.remove("active-swatch");
		});
		swatchElement.classList.add("active-swatch");
		
		// Get current color from swatch to initialize picker
		const currentColor = window.getComputedStyle(swatchElement).backgroundColor;
		if (currentColor && currentColor !== "rgba(0, 0, 0, 0)") {
			const rgb = currentColor.match(/\d+/g);
			if (rgb?.length >= 3) {
				const r = parseInt(rgb[0]);
				const g = parseInt(rgb[1]);
				const b = parseInt(rgb[2]);
				const [h, s, l] = this.rgbToHsl(r, g, b);
				this.currentHue = h;
				this.currentSaturation = s;
				this.currentLightness = l;
				this.hexInput.value = this.rgbToHex(r, g, b).toUpperCase();
				this.drawSaturationSlider();
			}
		}
		
		const containerRect = swatchElement.closest(".color-swatches").getBoundingClientRect();
		
		// Simple positioning: above swatches, moved up 20px more, left at 10px
		const top = containerRect.top - 170 - 20; // 170 for picker height + 20px higher
		const left = 10; // Fixed left position
		
		this.container.style.top = `${top}px`;
		this.container.style.left = `${left}px`;
		this.container.style.width = "170px";
		this.container.style.display = "block";
	}

	hide() {
		this.container.style.display = "none";
		// Remove highlight from active swatch
		if (this.activeSwatch) {
			this.activeSwatch.classList.remove("active-swatch");
		}
		this.activeSwatch = null;
	}
	
	rgbToHsl(r, g, b) {
		r /= 255;
		g /= 255;
		b /= 255;
		
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const diff = max - min;
		const sum = max + min;
		
		let h = 0;
		let s = 0;
		const l = sum / 2;

		if (diff !== 0) {
			s = l > 0.5 ? diff / (2 - sum) : diff / sum;
			
			switch (max) {
				case r: 
					h = ((g - b) / diff) + (g < b ? 6 : 0);
					break;
				case g: 
					h = (b - r) / diff + 2;
					break;
				case b: 
					h = (r - g) / diff + 4;
					break;
			}
			h *= 60;
		}

		return [h, s, l];
	}
}

window.ColorPicker = ColorPicker;