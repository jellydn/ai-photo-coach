/**
 * @jest-environment node
 */

import {
	getDisabledModes,
	getEnabledModes,
	getModeConfig,
	isModeEnabled,
	MODES,
	type ModeConfig,
	modeConfig,
} from "../src/config/modes";

describe("modes configuration", () => {
	describe("MODES array", () => {
		it("should contain all 8 modes", () => {
			expect(MODES).toHaveLength(8);
			expect(MODES).toContain("portrait");
			expect(MODES).toContain("food");
			expect(MODES).toContain("travel");
			expect(MODES).toContain("group");
			expect(MODES).toContain("product");
			expect(MODES).toContain("document");
			expect(MODES).toContain("pet_kids");
			expect(MODES).toContain("night");
		});
	});

	describe("modeConfig record", () => {
		it("should have configuration for all modes", () => {
			MODES.forEach((mode) => {
				expect(modeConfig[mode]).toBeDefined();
			});
		});

		it("should have all required ModeConfig properties for each mode", () => {
			const requiredKeys: (keyof ModeConfig)[] = [
				"autoCaptureScore",
				"faceMinAreaPct",
				"faceMaxAreaPct",
				"stabilityThreshold",
				"horizonToleranceDeg",
				"enabled",
				"showOverlays",
				"faceFraming",
			];

			MODES.forEach((mode) => {
				const config = modeConfig[mode];
				requiredKeys.forEach((key) => {
					expect(config[key]).toBeDefined();
				});
			});
		});

		it("should have valid threshold ranges", () => {
			MODES.forEach((mode) => {
				const config = modeConfig[mode];

				// autoCaptureScore should be 0-100
				expect(config.autoCaptureScore).toBeGreaterThanOrEqual(0);
				expect(config.autoCaptureScore).toBeLessThanOrEqual(100);

				// faceMinAreaPct and faceMaxAreaPct should be 0-100
				expect(config.faceMinAreaPct).toBeGreaterThanOrEqual(0);
				expect(config.faceMinAreaPct).toBeLessThanOrEqual(100);
				expect(config.faceMaxAreaPct).toBeGreaterThanOrEqual(0);
				expect(config.faceMaxAreaPct).toBeLessThanOrEqual(100);

				// stabilityThreshold should be positive
				expect(config.stabilityThreshold).toBeGreaterThan(0);

				// horizonToleranceDeg should be positive
				expect(config.horizonToleranceDeg).toBeGreaterThan(0);
			});
		});

		it("should have faceMinAreaPct <= faceMaxAreaPct for all modes", () => {
			MODES.forEach((mode) => {
				const config = modeConfig[mode];
				expect(config.faceMinAreaPct).toBeLessThanOrEqual(
					config.faceMaxAreaPct,
				);
			});
		});
	});

	describe("getModeConfig", () => {
		it("should return correct config for each mode", () => {
			MODES.forEach((mode) => {
				const config = getModeConfig(mode);
				expect(config).toBe(modeConfig[mode]);
			});
		});

		it("should return portrait mode with correct values", () => {
			const config = getModeConfig("portrait");
			expect(config.autoCaptureScore).toBe(80);
			expect(config.faceMinAreaPct).toBe(15);
			expect(config.faceMaxAreaPct).toBe(60);
			expect(config.stabilityThreshold).toBe(0.02);
			expect(config.horizonToleranceDeg).toBe(2);
			expect(config.enabled).toBe(true);
			expect(config.showOverlays).toBe(true);
			expect(config.faceFraming).toBe(true);
		});

		it("should return travel mode with correct values", () => {
			const config = getModeConfig("travel");
			expect(config.autoCaptureScore).toBe(75);
			expect(config.faceMinAreaPct).toBe(0);
			expect(config.faceMaxAreaPct).toBe(0);
			expect(config.stabilityThreshold).toBe(0.05);
			expect(config.horizonToleranceDeg).toBe(2);
			expect(config.enabled).toBe(true);
			expect(config.showOverlays).toBe(true);
			expect(config.faceFraming).toBe(false);
		});

		it("should return food mode with correct values", () => {
			const config = getModeConfig("food");
			expect(config.enabled).toBe(true);
			expect(config.showOverlays).toBe(true);
			expect(config.faceFraming).toBe(false);
		});
	});

	describe("isModeEnabled", () => {
		it("should return true for enabled modes (portrait, travel, food, group, product, document, pet_kids)", () => {
			expect(isModeEnabled("portrait")).toBe(true);
			expect(isModeEnabled("travel")).toBe(true);
			expect(isModeEnabled("food")).toBe(true);
			expect(isModeEnabled("group")).toBe(true);
			expect(isModeEnabled("product")).toBe(true);
			expect(isModeEnabled("document")).toBe(true);
			expect(isModeEnabled("pet_kids")).toBe(true);
		});

		it("should return false for disabled modes", () => {
			expect(isModeEnabled("night")).toBe(false);
		});
	});

	describe("getEnabledModes", () => {
		it("should return only enabled modes", () => {
			const enabled = getEnabledModes();
			expect(enabled).toHaveLength(7); // portrait, travel, food, group, product, document, pet_kids
			expect(enabled).toContain("portrait");
			expect(enabled).toContain("travel");
			expect(enabled).toContain("food");
			expect(enabled).toContain("group");
			expect(enabled).toContain("product");
			expect(enabled).toContain("document");
			expect(enabled).toContain("pet_kids");
		});

		it("should not include disabled modes", () => {
			const enabled = getEnabledModes();
			expect(enabled).not.toContain("night");
		});
	});

	describe("getDisabledModes", () => {
		it("should return only disabled modes", () => {
			const disabled = getDisabledModes();
			expect(disabled).toHaveLength(1); // night only
			expect(disabled).toContain("night");
		});

		it("should not include enabled modes", () => {
			const disabled = getDisabledModes();
			expect(disabled).not.toContain("portrait");
			expect(disabled).not.toContain("travel");
			expect(disabled).not.toContain("food");
			expect(disabled).not.toContain("group");
			expect(disabled).not.toContain("product");
			expect(disabled).not.toContain("document");
			expect(disabled).not.toContain("pet_kids");
		});
	});

	describe("mode-specific configurations", () => {
		it("portrait mode should have strict stability and face framing enabled", () => {
			const config = getModeConfig("portrait");
			expect(config.stabilityThreshold).toBe(0.02);
			expect(config.faceFraming).toBe(true);
			expect(config.faceMinAreaPct).toBeGreaterThan(0);
		});

		it("travel mode should have loose stability and no face framing", () => {
			const config = getModeConfig("travel");
			expect(config.stabilityThreshold).toBe(0.05);
			expect(config.faceFraming).toBe(false);
			expect(config.faceMinAreaPct).toBe(0);
		});

		it("document mode should have very strict horizon tolerance", () => {
			const config = getModeConfig("document");
			expect(config.horizonToleranceDeg).toBe(1);
		});

		it("pet_kids mode should be enabled with looser stability threshold for moving subjects", () => {
			const config = getModeConfig("pet_kids");
			expect(config.enabled).toBe(true);
			expect(config.stabilityThreshold).toBe(0.04);
			expect(config.faceFraming).toBe(true);
			expect(config.autoCaptureScore).toBe(75);
		});

		it("food mode should be enabled with correct thresholds", () => {
			const config = getModeConfig("food");
			expect(config.enabled).toBe(true);
			expect(config.autoCaptureScore).toBe(75);
			expect(config.faceFraming).toBe(false);
			expect(config.stabilityThreshold).toBe(0.03);
			expect(config.showOverlays).toBe(true);
		});
	});
});
