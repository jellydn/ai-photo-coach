/**
 * Lighting quality analysis hook
 * Provides reactive lighting condition monitoring for the camera
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceBounds } from "../faceDetection/types";
import {
	classifyLighting,
	DEFAULT_LIGHTING_THRESHOLDS,
	getLightingPrompt,
	type LightingClass,
	type LightingStatsWithRegions,
	type LightingThresholds,
} from "./types";

/**
 * Hook configuration options
 */
interface UseLightingOptions {
	/** Whether lighting analysis is enabled */
	enabled: boolean;
	/** Face bounds for backlit detection (optional) */
	faceBounds?: FaceBounds;
	/** Custom lighting thresholds */
	thresholds?: LightingThresholds;
	/** Target FPS for updates (default 20) */
	targetFps?: number;
}

/**
 * Hook return value
 */
interface UseLightingResult {
	/** Current lighting classification */
	lightingClass: LightingClass;
	/** Detailed lighting statistics */
	stats: LightingStatsWithRegions | null;
	/** User-facing prompt for current lighting */
	prompt: string | null;
	/** Whether lighting is good for capture */
	isGood: boolean;
	/** Mean luminance (0-255) */
	meanLuminance: number;
	/** Whether face region is backlit (only valid when faceBounds provided) */
	isBacklit: boolean;
}

/**
 * React hook for lighting quality analysis
 * Simulates frame processor analysis with polling (stub for actual frame processor)
 * @param options - Hook configuration
 * @returns Lighting analysis results
 */
export function useLighting({
	enabled,
	faceBounds,
	thresholds = DEFAULT_LIGHTING_THRESHOLDS,
	targetFps = 20,
}: UseLightingOptions): UseLightingResult {
	const [lightingClass, setLightingClass] = useState<LightingClass>("good");
	const [stats, setStats] = useState<LightingStatsWithRegions | null>(null);
	const frameCountRef = useRef(0);

	// Simulate lighting analysis (stub for actual frame processor integration)
	// In real implementation, this would receive pixel data from frame processor
	const analyzeLighting = useCallback(() => {
		if (!enabled) return;

		// Simulate lighting analysis with varying conditions
		// In real implementation, this would analyze actual frame pixel data
		frameCountRef.current++;

		// Simulate different lighting conditions for testing
		// Cycle through conditions every 100 frames
		const cycle = Math.floor(frameCountRef.current / 50) % 4;

		// Create simulated stats based on cycle
		let simulatedStats: LightingStatsWithRegions;

		switch (cycle) {
			case 0: // Good lighting
				simulatedStats = {
					meanLuminance: 140,
					histogram: {
						shadowPercentage: 10,
						highlightPercentage: 15,
						isShadowClipped: false,
						isHighlightClipped: false,
					},
					frameDimensions: { width: 320, height: 240 },
					backgroundBrightness: 145,
					brightnessRatio: 1.0,
				};
				if (faceBounds) {
					simulatedStats.faceBrightness = 140;
					simulatedStats.brightnessRatio = 0.97;
				}
				break;

			case 1: // Too dark
				simulatedStats = {
					meanLuminance: 25,
					histogram: {
						shadowPercentage: 55,
						highlightPercentage: 5,
						isShadowClipped: true,
						isHighlightClipped: false,
					},
					frameDimensions: { width: 320, height: 240 },
					backgroundBrightness: 30,
					brightnessRatio: 0.83,
				};
				if (faceBounds) {
					simulatedStats.faceBrightness = 25;
				}
				break;

			case 2: // Too bright
				simulatedStats = {
					meanLuminance: 240,
					histogram: {
						shadowPercentage: 5,
						highlightPercentage: 45,
						isShadowClipped: false,
						isHighlightClipped: true,
					},
					frameDimensions: { width: 320, height: 240 },
					backgroundBrightness: 245,
					brightnessRatio: 0.98,
				};
				if (faceBounds) {
					simulatedStats.faceBrightness = 240;
				}
				break;

			case 3: // Backlit (face darker than background)
			default:
				simulatedStats = {
					meanLuminance: 100,
					histogram: {
						shadowPercentage: 20,
						highlightPercentage: 25,
						isShadowClipped: false,
						isHighlightClipped: false,
					},
					frameDimensions: { width: 320, height: 240 },
					backgroundBrightness: 180,
					brightnessRatio: 0.44, // Face 56% darker than background
				};
				if (faceBounds) {
					simulatedStats.faceBrightness = 80;
					simulatedStats.brightnessRatio = 80 / 180;
				}
				break;
		}

		// Classify the lighting
		const classified = classifyLighting(simulatedStats, thresholds);

		setStats(simulatedStats);
		setLightingClass(classified);
	}, [enabled, faceBounds, thresholds]);

	// Set up polling at target FPS
	useEffect(() => {
		if (!enabled) {
			setLightingClass("good");
			setStats(null);
			return;
		}

		const intervalMs = 1000 / targetFps;
		const intervalId = setInterval(analyzeLighting, intervalMs);

		// Initial analysis
		analyzeLighting();

		return () => {
			clearInterval(intervalId);
		};
	}, [enabled, targetFps, analyzeLighting]);

	// Derive values from state
	const prompt = getLightingPrompt(lightingClass);
	const isGood = lightingClass === "good";
	const meanLuminance = stats?.meanLuminance ?? 128;
	const isBacklit = lightingClass === "backlit";

	return {
		lightingClass,
		stats,
		prompt,
		isGood,
		meanLuminance,
		isBacklit,
	};
}
