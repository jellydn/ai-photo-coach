/**
 * Lighting frame processor stub for VisionCamera v5
 * TODO: Re-implement using Nitro modules compatible approach
 */

import { useEffect, useRef } from "react";
import type { FaceBounds } from "../faceDetection/types";
import type { LightingStatsWithRegions, LightingThresholds } from "./types";

export interface UseLightingFrameOutputOptions {
	enabled: boolean;
	faceBounds?: FaceBounds;
	thresholds?: LightingThresholds;
	onLightingStats: (stats: LightingStatsWithRegions) => void;
}

interface UseLightingFrameOutputResult {
	frameOutput: null;
}

/**
 * Stub hook for lighting frame output - worklets temporarily disabled
 */
export function useLightingFrameOutput({
	onLightingStats,
}: UseLightingFrameOutputOptions): UseLightingFrameOutputResult {
	const hasCalledRef = useRef(false);

	// Stub: Call with neutral lighting stats only once on mount
	useEffect(() => {
		if (!hasCalledRef.current) {
			hasCalledRef.current = true;
			onLightingStats({
				meanLuminance: 128,
				histogram: {
					shadowPercentage: 0.1,
					highlightPercentage: 0.1,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 1920, height: 1080 },
				backgroundBrightness: 128,
				brightnessRatio: 1.0,
			});
		}
	}, [onLightingStats]);

	return { frameOutput: null };
}
