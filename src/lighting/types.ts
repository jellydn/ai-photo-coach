/**
 * Lighting quality analysis types and utilities
 * Computes luminance statistics and classifies lighting conditions
 */

import type { FaceBounds } from "../faceDetection/types";

/**
 * Lighting classification result
 */
export type LightingClass = "too_dark" | "too_bright" | "backlit" | "good";

/**
 * Histogram analysis result
 */
export interface HistogramStats {
	/** Percentage of pixels in shadows (0-20 luminance) */
	shadowPercentage: number;
	/** Percentage of pixels in highlights (235-255 luminance) */
	highlightPercentage: number;
	/** Whether histogram is clipped in shadows */
	isShadowClipped: boolean;
	/** Whether histogram is clipped in highlights */
	isHighlightClipped: boolean;
}

/**
 * Lighting statistics for a frame or region
 */
export interface LightingStats {
	/** Mean luminance (0-255) */
	meanLuminance: number;
	/** Histogram statistics */
	histogram: HistogramStats;
	/** Frame dimensions used for calculation */
	frameDimensions: { width: number; height: number };
}

/**
 * Lighting statistics with region-specific data for backlit detection
 */
export interface LightingStatsWithRegions extends LightingStats {
	/** Face region brightness (0-255), if face detected */
	faceBrightness?: number;
	/** Background brightness (0-255) - area outside face region */
	backgroundBrightness: number;
	/** Brightness ratio (face / background), higher means more backlit */
	brightnessRatio: number;
}

/**
 * Lighting analysis configuration thresholds
 */
export interface LightingThresholds {
	/** Mean luminance below this is too dark (0-255) */
	tooDarkThreshold: number;
	/** Mean luminance above this is too bright (0-255) */
	tooBrightThreshold: number;
	/** Shadow clip threshold - percentage of pixels in shadows to trigger warning */
	shadowClipThreshold: number;
	/** Highlight clip threshold - percentage of pixels in highlights to trigger warning */
	highlightClipThreshold: number;
	/** Backlit detection: brightness ratio threshold (face/background) */
	backlitRatioThreshold: number;
	/** Minimum face brightness difference to trigger backlit warning */
	minFaceBrightnessDiff: number;
}

/**
 * Default lighting thresholds
 * These are conservative values suitable for most scenarios
 */
export const DEFAULT_LIGHTING_THRESHOLDS: LightingThresholds = {
	tooDarkThreshold: 40, // Below 40/255 is quite dark
	tooBrightThreshold: 220, // Above 220/255 is quite bright
	shadowClipThreshold: 30, // 30% in shadows is significant clipping
	highlightClipThreshold: 25, // 25% in highlights is significant clipping
	backlitRatioThreshold: 0.6, // Face 40% darker than background suggests backlighting
	minFaceBrightnessDiff: 30, // At least 30/255 difference to trigger backlit
};

/**
 * Compute histogram statistics from luminance values
 * @param luminanceValues - Array of luminance values (0-255)
 * @returns Histogram statistics
 */
export function computeHistogramStats(
	luminanceValues: number[],
	thresholds: Pick<
		LightingThresholds,
		"shadowClipThreshold" | "highlightClipThreshold"
	> = DEFAULT_LIGHTING_THRESHOLDS,
): HistogramStats {
	if (luminanceValues.length === 0) {
		return {
			shadowPercentage: 0,
			highlightPercentage: 0,
			isShadowClipped: false,
			isHighlightClipped: false,
		};
	}

	const totalPixels = luminanceValues.length;
	let shadows = 0;
	let highlights = 0;

	for (const value of luminanceValues) {
		if (value <= 20) shadows++;
		if (value >= 235) highlights++;
	}

	const shadowPercentage = (shadows / totalPixels) * 100;
	const highlightPercentage = (highlights / totalPixels) * 100;

	return {
		shadowPercentage,
		highlightPercentage,
		isShadowClipped: shadowPercentage > thresholds.shadowClipThreshold,
		isHighlightClipped: highlightPercentage > thresholds.highlightClipThreshold,
	};
}

/**
 * Calculate mean luminance from pixel data
 * Uses simple RGB-to-luminance conversion: Y = 0.299R + 0.587G + 0.114B
 * @param pixelData - Uint8Array of RGBA pixel data
 * @returns Mean luminance (0-255)
 */
export function calculateMeanLuminance(pixelData: Uint8Array): number {
	if (pixelData.length === 0) return 128; // Neutral gray default

	const pixelCount = pixelData.length / 4; // RGBA = 4 bytes per pixel
	let totalLuminance = 0;

	for (let i = 0; i < pixelData.length; i += 4) {
		const r = pixelData[i];
		const g = pixelData[i + 1];
		const b = pixelData[i + 2];
		// Standard RGB to luminance conversion
		const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
		totalLuminance += luminance;
	}

	return Math.round(totalLuminance / pixelCount);
}

/**
 * Extract luminance values from pixel data
 * @param pixelData - Uint8Array of RGBA pixel data
 * @returns Array of luminance values (0-255)
 */
export function extractLuminanceValues(pixelData: Uint8Array): number[] {
	const values: number[] = [];

	for (let i = 0; i < pixelData.length; i += 4) {
		const r = pixelData[i];
		const g = pixelData[i + 1];
		const b = pixelData[i + 2];
		const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
		values.push(luminance);
	}

	return values;
}

/**
 * Calculate mean luminance for a specific region (e.g., face area)
 * @param pixelData - Full frame pixel data
 * @param frameWidth - Full frame width
 * @param bounds - Normalized bounds (0-1) of region to analyze
 * @returns Mean luminance for the region
 */
export function calculateRegionLuminance(
	pixelData: Uint8Array,
	frameWidth: number,
	bounds: FaceBounds,
): number {
	const frameHeight = pixelData.length / 4 / frameWidth;

	// Convert normalized bounds to pixel coordinates
	const x1 = Math.floor(bounds.x * frameWidth);
	const y1 = Math.floor(bounds.y * frameHeight);
	const x2 = Math.floor((bounds.x + bounds.width) * frameWidth);
	const y2 = Math.floor((bounds.y + bounds.height) * frameHeight);

	let totalLuminance = 0;
	let pixelCount = 0;

	for (let y = y1; y < y2; y++) {
		for (let x = x1; x < x2; x++) {
			const idx = (y * frameWidth + x) * 4;
			if (idx + 2 < pixelData.length) {
				const r = pixelData[idx];
				const g = pixelData[idx + 1];
				const b = pixelData[idx + 2];
				totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
				pixelCount++;
			}
		}
	}

	return pixelCount > 0 ? Math.round(totalLuminance / pixelCount) : 128;
}

/**
 * Calculate background brightness (outside face region)
 * @param pixelData - Full frame pixel data
 * @param frameWidth - Frame width
 * @param frameHeight - Frame height
 * @param faceBounds - Face bounds (normalized 0-1), undefined if no face
 * @returns Mean background brightness
 */
export function calculateBackgroundBrightness(
	pixelData: Uint8Array,
	frameWidth: number,
	frameHeight: number,
	faceBounds?: FaceBounds,
): number {
	if (!faceBounds) {
		// No face detected, use full frame
		return calculateMeanLuminance(pixelData);
	}

	// Calculate brightness excluding face region
	const faceX1 = Math.floor(faceBounds.x * frameWidth);
	const faceY1 = Math.floor(faceBounds.y * frameHeight);
	const faceX2 = Math.floor((faceBounds.x + faceBounds.width) * frameWidth);
	const faceY2 = Math.floor((faceBounds.y + faceBounds.height) * frameHeight);

	let totalLuminance = 0;
	let pixelCount = 0;

	for (let y = 0; y < frameHeight; y++) {
		for (let x = 0; x < frameWidth; x++) {
			// Skip pixels inside face region
			if (x >= faceX1 && x < faceX2 && y >= faceY1 && y < faceY2) {
				continue;
			}

			const idx = (y * frameWidth + x) * 4;
			if (idx + 2 < pixelData.length) {
				const r = pixelData[idx];
				const g = pixelData[idx + 1];
				const b = pixelData[idx + 2];
				totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
				pixelCount++;
			}
		}
	}

	return pixelCount > 0 ? Math.round(totalLuminance / pixelCount) : 128;
}

/**
 * Classify lighting conditions based on statistics
 * Pure function - can be unit tested with fixture inputs
 * @param stats - Lighting statistics (with optional region data for backlit detection)
 * @param thresholds - Lighting classification thresholds
 * @returns Lighting classification
 */
export function classifyLighting(
	stats: LightingStats | LightingStatsWithRegions,
	thresholds: LightingThresholds = DEFAULT_LIGHTING_THRESHOLDS,
): LightingClass {
	const { meanLuminance, histogram } = stats;

	// Check for overall darkness/brightness first
	if (meanLuminance < thresholds.tooDarkThreshold) {
		return "too_dark";
	}

	if (meanLuminance > thresholds.tooBrightThreshold) {
		return "too_bright";
	}

	// Check for backlit conditions (Portrait mode with face detection)
	if ("brightnessRatio" in stats && stats.faceBrightness !== undefined) {
		const { faceBrightness, backgroundBrightness, brightnessRatio } = stats;
		const brightnessDiff = backgroundBrightness - faceBrightness;

		// Backlit if face is significantly darker than background
		if (
			brightnessRatio < thresholds.backlitRatioThreshold &&
			brightnessDiff > thresholds.minFaceBrightnessDiff
		) {
			return "backlit";
		}
	}

	// Check for histogram clipping (severe over/under exposure in parts of frame)
	if (histogram.isShadowClipped && !histogram.isHighlightClipped) {
		// Mostly shadow clipping - could be too dark or high contrast
		if (meanLuminance < 80) {
			return "too_dark";
		}
	}

	if (histogram.isHighlightClipped && !histogram.isShadowClipped) {
		// Mostly highlight clipping - could be too bright
		if (meanLuminance > 180) {
			return "too_bright";
		}
	}

	// All checks passed
	return "good";
}

/**
 * Compute lighting statistics from frame pixel data
 * @param pixelData - RGBA pixel data
 * @param frameWidth - Frame width in pixels
 * @param frameHeight - Frame height in pixels
 * @param thresholds - Lighting thresholds
 * @returns Lighting statistics
 */
export function computeLightingStats(
	pixelData: Uint8Array,
	frameWidth: number,
	frameHeight: number,
	thresholds: LightingThresholds = DEFAULT_LIGHTING_THRESHOLDS,
): LightingStats {
	const luminanceValues = extractLuminanceValues(pixelData);
	const meanLuminance =
		luminanceValues.length > 0
			? Math.round(
					luminanceValues.reduce((a, b) => a + b, 0) / luminanceValues.length,
				)
			: 128;

	const histogram = computeHistogramStats(luminanceValues, thresholds);

	return {
		meanLuminance,
		histogram,
		frameDimensions: { width: frameWidth, height: frameHeight },
	};
}

/**
 * Compute lighting statistics with region analysis for backlit detection
 * @param pixelData - RGBA pixel data
 * @param frameWidth - Frame width
 * @param frameHeight - Frame height
 * @param faceBounds - Optional face bounds for backlit detection
 * @param thresholds - Lighting thresholds
 * @returns Lighting statistics with region data
 */
export function computeLightingStatsWithRegions(
	pixelData: Uint8Array,
	frameWidth: number,
	frameHeight: number,
	faceBounds?: FaceBounds,
	thresholds: LightingThresholds = DEFAULT_LIGHTING_THRESHOLDS,
): LightingStatsWithRegions {
	const baseStats = computeLightingStats(
		pixelData,
		frameWidth,
		frameHeight,
		thresholds,
	);

	const faceBrightness = faceBounds
		? calculateRegionLuminance(pixelData, frameWidth, faceBounds)
		: undefined;

	const backgroundBrightness = calculateBackgroundBrightness(
		pixelData,
		frameWidth,
		frameHeight,
		faceBounds,
	);

	const brightnessRatio = faceBrightness
		? faceBrightness / (backgroundBrightness || 1) // Avoid division by zero
		: 1;

	return {
		...baseStats,
		faceBrightness,
		backgroundBrightness,
		brightnessRatio,
	};
}

/**
 * Get user-friendly prompt for lighting condition
 * @param lightingClass - The classified lighting condition
 * @returns Short prompt string (max 5 words per spec)
 */
export function getLightingPrompt(lightingClass: LightingClass): string | null {
	switch (lightingClass) {
		case "too_dark":
			return "Too dark";
		case "too_bright":
			return "Too bright";
		case "backlit":
			return "Face the light";
		case "good":
			return null; // No prompt needed for good lighting
		default:
			return null;
	}
}

/**
 * Target FPS for lighting analysis (per spec: >= 20 FPS)
 */
export const TARGET_LIGHTING_FPS = 20;

/**
 * Maximum long edge for lighting analysis (same as face detection)
 */
export const MAX_LIGHTING_LONG_EDGE = 320;
