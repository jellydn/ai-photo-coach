/**
 * Lighting quality analysis hook
 * Provides reactive lighting condition monitoring for the camera
 *
 * This hook integrates with VisionCamera frame processors to analyze
 * actual camera frame pixel data for real lighting conditions.
 *
 * For testing/simulation purposes, it supports a fallback mode that
 * cycles through preset lighting conditions when not connected to a
 * real camera frame processor.
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
	/** Target FPS for updates (default 20) - informational only */
	targetFps?: number;
	/**
	 * Use simulated data for testing (default false).
	 * When true, cycles through preset lighting conditions.
	 * When false, expects frame data via handleFrameStats callback.
	 */
	useSimulatedData?: boolean;
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
	/**
	 * Callback to receive frame stats from frame processor.
	 * Call this from your frame processor with computed lighting stats.
	 */
	handleFrameStats: (stats: LightingStatsWithRegions) => void;
}

/**
 * React hook for lighting quality analysis
 *
 * This hook can work in two modes:
 * 1. **Real camera mode** (default): Receives actual frame data via `handleFrameStats`
 *    callback from a VisionCamera frame processor. Use with `useLightingFrameProcessor`
 *    to analyze real camera frames.
 *
 * 2. **Simulation mode** (`useSimulatedData: true`): Cycles through preset lighting
 *    conditions for testing and development without a camera.
 *
 * @param options - Hook configuration
 * @returns Lighting analysis results and frame stats handler
 *
 * @example
 * ```tsx
 * // Real camera mode
 * const { lightingClass, prompt, handleFrameStats } = useLighting({
 *   enabled: modeConfig.lightingAnalysis,
 *   faceBounds: primaryFace?.bounds,
 *   thresholds: lightingThresholds,
 * });
 *
 * const { frameProcessor } = useLightingFrameProcessor({
 *   enabled: modeConfig.lightingAnalysis,
 *   faceBounds: primaryFace?.bounds,
 *   thresholds: lightingThresholds,
 *   onLightingStats: handleFrameStats,
 * });
 *
 * <Camera frameProcessor={frameProcessor} pixelFormat="rgb" ... />
 * ```
 */
export function useLighting({
	enabled,
	faceBounds,
	thresholds = DEFAULT_LIGHTING_THRESHOLDS,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	targetFps = 20,
	useSimulatedData = false,
}: UseLightingOptions): UseLightingResult {
	const [lightingClass, setLightingClass] = useState<LightingClass>("good");
	const [stats, setStats] = useState<LightingStatsWithRegions | null>(null);

	// Refs for simulation mode
	const frameCountRef = useRef(0);
	const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	/**
	 * Handle frame stats from frame processor
	 * This is the primary interface for receiving real camera frame data
	 */
	const handleFrameStats = useCallback(
		(frameStats: LightingStatsWithRegions) => {
			if (!enabled) return;

			// Update stats directly from frame processor
			setStats(frameStats);

			// Re-classify with current thresholds
			const classified = classifyLighting(frameStats, thresholds);
			setLightingClass(classified);
		},
		[enabled, thresholds],
	);

	/**
	 * Simulation mode: Cycle through preset lighting conditions
	 * Used for testing when not connected to real camera frames
	 */
	useEffect(() => {
		if (!enabled || !useSimulatedData) {
			// Reset state when disabled or not in simulation mode
			if (!enabled) {
				setLightingClass("good");
				setStats(null);
			}

			// Clear any existing interval
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}

			return;
		}

		// Simulation mode: generate preset lighting conditions
		const simulateLighting = () => {
			frameCountRef.current++;

			// Simulate different lighting conditions
			// Cycle through conditions every 50 frames
			const cycle = Math.floor(frameCountRef.current / 50) % 4;

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

			// Update state with simulated data
			const classified = classifyLighting(simulatedStats, thresholds);
			setStats(simulatedStats);
			setLightingClass(classified);
		};

		// Set up polling interval for simulation (50ms = 20 FPS)
		intervalRef.current = setInterval(simulateLighting, 50);

		// Initial simulation
		simulateLighting();

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [enabled, useSimulatedData, faceBounds, thresholds]);

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
		handleFrameStats,
	};
}

export type { UseLightingOptions, UseLightingResult };
