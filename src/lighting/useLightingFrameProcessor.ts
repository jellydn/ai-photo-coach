/**
 * Lighting frame output hook for VisionCamera v5
 * Extracts real pixel data from camera frames and computes lighting stats
 */

import { useCallback, useRef } from "react";
import { type Frame, useFrameOutput } from "react-native-vision-camera";
import type { FaceBounds } from "../faceDetection/types";
import { downscaleFrame } from "../faceDetection/types";
import {
	calculateBackgroundBrightness,
	calculateMeanLuminance,
	calculateRegionLuminance,
	computeHistogramStats,
	DEFAULT_LIGHTING_THRESHOLDS,
	extractLuminanceValues,
	type LightingStatsWithRegions,
	type LightingThresholds,
} from "./types";

export interface UseLightingFrameOutputOptions {
	enabled: boolean;
	faceBounds?: FaceBounds;
	thresholds?: LightingThresholds;
	onLightingStats: (stats: LightingStatsWithRegions) => void;
}

interface UseLightingFrameOutputResult {
	frameOutput: ReturnType<typeof useFrameOutput> | null;
}

const MAX_LONG_EDGE = 160;

function computeLightingFromPixels(
	pixelData: Uint8Array,
	frameWidth: number,
	frameHeight: number,
	faceBounds: FaceBounds | undefined,
	thresholds: LightingThresholds,
): LightingStatsWithRegions {
	const meanLuminance = calculateMeanLuminance(pixelData);
	const luminanceValues = extractLuminanceValues(pixelData);
	const histogram = computeHistogramStats(luminanceValues, thresholds);
	const backgroundBrightness = calculateBackgroundBrightness(
		pixelData,
		frameWidth,
		frameHeight,
		faceBounds,
	);

	const faceBrightness = faceBounds
		? calculateRegionLuminance(pixelData, frameWidth, faceBounds)
		: undefined;

	const brightnessRatio = faceBrightness
		? faceBrightness / backgroundBrightness
		: 1.0;

	return {
		meanLuminance,
		histogram,
		frameDimensions: { width: frameWidth, height: frameHeight },
		backgroundBrightness,
		brightnessRatio,
		...(faceBrightness !== undefined ? { faceBrightness } : {}),
	};
}

export function useLightingFrameOutput({
	enabled,
	faceBounds,
	thresholds = DEFAULT_LIGHTING_THRESHOLDS,
	onLightingStats,
}: UseLightingFrameOutputOptions): UseLightingFrameOutputResult {
	const faceBoundsRef = useRef(faceBounds);
	faceBoundsRef.current = faceBounds;

	const thresholdsRef = useRef(thresholds);
	thresholdsRef.current = thresholds;

	const onLightingStatsRef = useRef(onLightingStats);
	onLightingStatsRef.current = onLightingStats;

	const onFrame = useCallback(
		(frame: Frame) => {
			"worklet";

			if (!enabled) {
				frame.dispose();
				return;
			}

			try {
				const width = frame.width;
				const height = frame.height;

				const downscaled = downscaleFrame(width, height, MAX_LONG_EDGE);

				const buffer = frame.getPixelBuffer();
				const pixels = new Uint8Array(buffer);

				const stats = computeLightingFromPixels(
					pixels,
					downscaled.width,
					downscaled.height,
					faceBoundsRef.current,
					thresholdsRef.current,
				);

				const runOnJSFn = (globalThis as Record<string, unknown>)
					.runOnJS as ((...args: unknown[]) => void) | undefined;
				if (runOnJSFn) {
					runOnJSFn(() => { onLightingStatsRef.current(stats); });
				}
			} finally {
				frame.dispose();
			}
		},
		[enabled],
	);

	const frameOutput = useFrameOutput({
		pixelFormat: "rgb",
		onFrame,
	});

	if (!enabled) {
		return { frameOutput: null };
	}

	return { frameOutput };
}
