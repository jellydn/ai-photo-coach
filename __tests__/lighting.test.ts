/**
 * Lighting quality analysis unit tests
 * Tests pure functions for lighting classification
 */

import type { FaceBounds } from "../src/faceDetection/types";
import {
	calculateBackgroundBrightness,
	calculateMeanLuminance,
	calculateRegionLuminance,
	classifyLighting,
	computeHistogramStats,
	computeLightingStats,
	computeLightingStatsWithRegions,
	DEFAULT_LIGHTING_THRESHOLDS,
	extractLuminanceValues,
	getLightingPrompt,
	type LightingClass,
	type LightingStatsWithRegions,
	MAX_LIGHTING_LONG_EDGE,
	TARGET_LIGHTING_FPS,
} from "../src/lighting";

describe("Lighting Analysis - classifyLighting", () => {
	const defaultThresholds = DEFAULT_LIGHTING_THRESHOLDS;

	describe("too_dark classification", () => {
		it("should classify as too_dark when mean luminance below threshold", () => {
			const stats: LightingStatsWithRegions = {
				meanLuminance: 30, // Below 40 threshold
				histogram: {
					shadowPercentage: 20,
					highlightPercentage: 5,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				backgroundBrightness: 35,
				brightnessRatio: 0.86,
			};

			const result = classifyLighting(stats, defaultThresholds);
			expect(result).toBe("too_dark");
		});

		it("should classify as too_dark with shadow clipping and low luminance", () => {
			const stats: LightingStatsWithRegions = {
				meanLuminance: 70, // Not extremely low but...
				histogram: {
					shadowPercentage: 35, // Above threshold, clipped
					highlightPercentage: 5,
					isShadowClipped: true,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				backgroundBrightness: 75,
				brightnessRatio: 0.93,
			};

			const result = classifyLighting(stats, defaultThresholds);
			expect(result).toBe("too_dark");
		});
	});

	describe("too_bright classification", () => {
		it("should classify as too_bright when mean luminance above threshold", () => {
			const stats: LightingStatsWithRegions = {
				meanLuminance: 230, // Above 220 threshold
				histogram: {
					shadowPercentage: 5,
					highlightPercentage: 20,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				backgroundBrightness: 235,
				brightnessRatio: 0.98,
			};

			const result = classifyLighting(stats, defaultThresholds);
			expect(result).toBe("too_bright");
		});

		it("should classify as too_bright with highlight clipping and high luminance", () => {
			const stats: LightingStatsWithRegions = {
				meanLuminance: 200, // High but not extreme
				histogram: {
					shadowPercentage: 5,
					highlightPercentage: 30, // Above threshold, clipped
					isShadowClipped: false,
					isHighlightClipped: true,
				},
				frameDimensions: { width: 320, height: 240 },
				backgroundBrightness: 205,
				brightnessRatio: 0.98,
			};

			const result = classifyLighting(stats, defaultThresholds);
			expect(result).toBe("too_bright");
		});
	});

	describe("backlit classification", () => {
		it("should classify as backlit when face is much darker than background", () => {
			const stats: LightingStatsWithRegions = {
				meanLuminance: 100, // Moderate overall
				histogram: {
					shadowPercentage: 20,
					highlightPercentage: 25,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				faceBrightness: 70, // Face is darker
				backgroundBrightness: 180, // Background is brighter
				brightnessRatio: 70 / 180, // ~0.39, below 0.6 threshold
			};

			const result = classifyLighting(stats, defaultThresholds);
			expect(result).toBe("backlit");
		});

		it("should NOT classify as backlit if brightness difference is small", () => {
			const stats: LightingStatsWithRegions = {
				meanLuminance: 100,
				histogram: {
					shadowPercentage: 20,
					highlightPercentage: 25,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				faceBrightness: 80,
				backgroundBrightness: 100, // Only 20 difference, below 30 threshold
				brightnessRatio: 80 / 100, // 0.8, above 0.6 threshold
			};

			const result = classifyLighting(stats, defaultThresholds);
			expect(result).not.toBe("backlit");
		});
	});

	describe("good classification", () => {
		it("should classify as good with balanced lighting", () => {
			const stats: LightingStatsWithRegions = {
				meanLuminance: 140, // Good middle range
				histogram: {
					shadowPercentage: 15,
					highlightPercentage: 15,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				backgroundBrightness: 145,
				brightnessRatio: 0.97,
			};

			const result = classifyLighting(stats, defaultThresholds);
			expect(result).toBe("good");
		});

		it("should classify as good without face data when within range", () => {
			// Test with basic LightingStats (no regions)
			const stats = {
				meanLuminance: 150,
				histogram: {
					shadowPercentage: 10,
					highlightPercentage: 10,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
			};

			const result = classifyLighting(stats, defaultThresholds);
			expect(result).toBe("good");
		});
	});

	describe("edge cases", () => {
		it("should handle boundary values for too_dark threshold", () => {
			const statsAtThreshold: LightingStatsWithRegions = {
				meanLuminance: 40, // Exactly at threshold
				histogram: {
					shadowPercentage: 10,
					highlightPercentage: 10,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				backgroundBrightness: 45,
				brightnessRatio: 0.89,
			};

			// At exactly the threshold, should NOT be too_dark (using < not <=)
			const result = classifyLighting(statsAtThreshold, defaultThresholds);
			expect(result).toBe("good");
		});

		it("should handle boundary values for too_bright threshold", () => {
			const statsAtThreshold: LightingStatsWithRegions = {
				meanLuminance: 220, // Exactly at threshold
				histogram: {
					shadowPercentage: 10,
					highlightPercentage: 10,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				backgroundBrightness: 225,
				brightnessRatio: 0.98,
			};

			// At exactly the threshold, should NOT be too_bright (using > not >=)
			const result = classifyLighting(statsAtThreshold, defaultThresholds);
			expect(result).toBe("good");
		});
	});
});

describe("Lighting Analysis - computeHistogramStats", () => {
	it("should calculate correct shadow and highlight percentages", () => {
		const values = [
			// 10 shadows (0-20)
			...Array(10).fill(10),
			// 80 midtones (21-234)
			...Array(80).fill(128),
			// 10 highlights (235-255)
			...Array(10).fill(240),
		];

		const stats = computeHistogramStats(values, DEFAULT_LIGHTING_THRESHOLDS);

		expect(stats.shadowPercentage).toBe(10);
		expect(stats.highlightPercentage).toBe(10);
		expect(stats.isShadowClipped).toBe(false); // 10% < 30% threshold
		expect(stats.isHighlightClipped).toBe(false); // 10% < 25% threshold
	});

	it("should detect shadow clipping", () => {
		const values = [
			// 35 shadows (35%)
			...Array(35).fill(15),
			// 65 midtones
			...Array(65).fill(128),
		];

		const stats = computeHistogramStats(values, DEFAULT_LIGHTING_THRESHOLDS);

		expect(stats.shadowPercentage).toBe(35);
		expect(stats.isShadowClipped).toBe(true);
		expect(stats.isHighlightClipped).toBe(false);
	});

	it("should detect highlight clipping", () => {
		const values = [
			// 74 midtones
			...Array(74).fill(128),
			// 26 highlights (26%, above 25% threshold)
			...Array(26).fill(240),
		];

		const stats = computeHistogramStats(values, DEFAULT_LIGHTING_THRESHOLDS);

		expect(stats.highlightPercentage).toBe(26);
		expect(stats.isShadowClipped).toBe(false);
		expect(stats.isHighlightClipped).toBe(true);
	});

	it("should handle empty array", () => {
		const stats = computeHistogramStats([], DEFAULT_LIGHTING_THRESHOLDS);

		expect(stats.shadowPercentage).toBe(0);
		expect(stats.highlightPercentage).toBe(0);
		expect(stats.isShadowClipped).toBe(false);
		expect(stats.isHighlightClipped).toBe(false);
	});
});

describe("Lighting Analysis - calculateMeanLuminance", () => {
	it("should calculate mean luminance correctly", () => {
		// Create RGBA pixel data: 2 pixels
		// Pixel 1: R=100, G=150, B=200
		// Pixel 2: R=50, G=100, B=150
		// Luminance 1: 0.299*100 + 0.587*150 + 0.114*200 = 29.9 + 88.05 + 22.8 = 140.75
		// Luminance 2: 0.299*50 + 0.587*100 + 0.114*150 = 14.95 + 58.7 + 17.1 = 90.75
		// Mean: (140.75 + 90.75) / 2 = 115.75 -> 116
		const pixelData = new Uint8Array([
			100,
			150,
			200,
			255, // Pixel 1: RGBA
			50,
			100,
			150,
			255, // Pixel 2: RGBA
		]);

		const result = calculateMeanLuminance(pixelData);
		expect(result).toBe(116);
	});

	it("should return 128 for empty data", () => {
		const result = calculateMeanLuminance(new Uint8Array(0));
		expect(result).toBe(128);
	});
});

describe("Lighting Analysis - extractLuminanceValues", () => {
	it("should extract luminance values from RGBA data", () => {
		const pixelData = new Uint8Array([
			255,
			255,
			255,
			255, // White: luminance 255
			0,
			0,
			0,
			255, // Black: luminance 0
			128,
			128,
			128,
			255, // Gray: luminance 128
		]);

		const values = extractLuminanceValues(pixelData);

		expect(values).toHaveLength(3);
		expect(values[0]).toBe(255);
		expect(values[1]).toBe(0);
		expect(values[2]).toBe(128);
	});
});

describe("Lighting Analysis - calculateRegionLuminance", () => {
	it("should calculate mean luminance for specified region", () => {
		// 4x2 frame (8 pixels total)
		// Pixel layout:
		// Row 0: [White, White, Black, Black]
		// Row 1: [White, White, Black, Black]
		const pixelData = new Uint8Array([
			255,
			255,
			255,
			255, // (0,0) White
			255,
			255,
			255,
			255, // (1,0) White
			0,
			0,
			0,
			255, // (2,0) Black
			0,
			0,
			0,
			255, // (3,0) Black
			255,
			255,
			255,
			255, // (0,1) White
			255,
			255,
			255,
			255, // (1,1) White
			0,
			0,
			0,
			255, // (2,1) Black
			0,
			0,
			0,
			255, // (3,1) Black
		]);

		// Region covering left half (x: 0-0.5, y: 0-1)
		const bounds: FaceBounds = { x: 0, y: 0, width: 0.5, height: 1 };

		const result = calculateRegionLuminance(pixelData, 4, bounds);
		expect(result).toBe(255); // All white pixels
	});
});

describe("Lighting Analysis - calculateBackgroundBrightness", () => {
	it("should calculate background brightness excluding face region", () => {
		// 4x2 frame
		// Left half (pixels 0,1): White (255)
		// Right half (pixels 2,3): Black (0)
		const pixelData = new Uint8Array([
			255,
			255,
			255,
			255, // (0,0) White
			255,
			255,
			255,
			255, // (1,0) White
			0,
			0,
			0,
			255, // (2,0) Black
			0,
			0,
			0,
			255, // (3,0) Black
			255,
			255,
			255,
			255, // (0,1) White
			255,
			255,
			255,
			255, // (1,1) White
			0,
			0,
			0,
			255, // (2,1) Black
			0,
			0,
			0,
			255, // (3,1) Black
		]);

		// Face region covering left half
		const faceBounds: FaceBounds = { x: 0, y: 0, width: 0.5, height: 1 };

		const result = calculateBackgroundBrightness(pixelData, 4, 2, faceBounds);
		expect(result).toBe(0); // Background is all black pixels
	});

	it("should use full frame when no face bounds provided", () => {
		const pixelData = new Uint8Array([
			255,
			255,
			255,
			255, // White
			0,
			0,
			0,
			255, // Black
		]);

		const result = calculateBackgroundBrightness(pixelData, 2, 1);
		expect(result).toBe(128); // Average of white and black
	});
});

describe("Lighting Analysis - computeLightingStats", () => {
	it("should compute complete lighting statistics", () => {
		// 2x1 frame: White and Gray
		const pixelData = new Uint8Array([
			255,
			255,
			255,
			255, // White: 255
			128,
			128,
			128,
			255, // Gray: 128
		]);

		const stats = computeLightingStats(
			pixelData,
			2,
			1,
			DEFAULT_LIGHTING_THRESHOLDS,
		);

		expect(stats.meanLuminance).toBe(192); // (255 + 128) / 2 = 191.5 -> 192
		expect(stats.frameDimensions).toEqual({ width: 2, height: 1 });
		expect(stats.histogram.shadowPercentage).toBe(0);
		expect(stats.histogram.highlightPercentage).toBe(50); // One of two pixels is white (255)
	});
});

describe("Lighting Analysis - computeLightingStatsWithRegions", () => {
	it("should compute lighting stats with face region analysis", () => {
		// 4x2 frame with clear face (white) and background (dark gray, not pure black to avoid div by zero edge case)
		const pixelData = new Uint8Array([
			255,
			255,
			255,
			255, // Face area - White
			255,
			255,
			255,
			255,
			20,
			20,
			20,
			255, // Background - Dark gray (not 0)
			20,
			20,
			20,
			255,
			255,
			255,
			255,
			255,
			255,
			255,
			255,
			255,
			20,
			20,
			20,
			255,
			20,
			20,
			20,
			255,
		]);

		const faceBounds: FaceBounds = { x: 0, y: 0, width: 0.5, height: 1 };

		const stats = computeLightingStatsWithRegions(
			pixelData,
			4,
			2,
			faceBounds,
			DEFAULT_LIGHTING_THRESHOLDS,
		);

		expect(stats.faceBrightness).toBe(255);
		expect(stats.backgroundBrightness).toBe(20);
		expect(stats.brightnessRatio).toBe(255 / 20); // ~12.75, clearly backlit
	});
});

describe("Lighting Analysis - getLightingPrompt", () => {
	it.each<[LightingClass, string | null]>([
		["too_dark", "Too dark"],
		["too_bright", "Too bright"],
		["backlit", "Face the light"],
		["good", null],
	])("should return correct prompt for %s", (lightingClass, expected) => {
		const result = getLightingPrompt(lightingClass);
		expect(result).toBe(expected);
	});

	it("should return prompts with max 5 words", () => {
		const prompts = [
			getLightingPrompt("too_dark"),
			getLightingPrompt("too_bright"),
			getLightingPrompt("backlit"),
		].filter(Boolean);

		for (const prompt of prompts) {
			const wordCount = prompt?.split(" ").length ?? 0;
			expect(wordCount).toBeLessThanOrEqual(5);
		}
	});
});

describe("Lighting Analysis - Constants", () => {
	it("should have correct FPS target", () => {
		expect(TARGET_LIGHTING_FPS).toBe(20);
	});

	it("should have correct max long edge", () => {
		expect(MAX_LIGHTING_LONG_EDGE).toBe(320);
	});
});
