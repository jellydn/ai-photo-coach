/**
 * Lighting frame output hook for VisionCamera v5
 * Extracts real pixel data from camera frames and computes lighting stats
 */

import { useCallback, useRef } from "react";
import { type Frame, useFrameOutput } from "react-native-vision-camera";
import type { FaceBounds } from "../faceDetection/types";
import {
	DEFAULT_LIGHTING_THRESHOLDS,
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

/**
 * Compute all lighting statistics in a single pass over pixel data.
 * Optimized to meet frame processor budget: 33ms/frame on mid-range devices.
 *
 * @param pixelData - RGBA pixel buffer
 * @param frameWidth - Frame width in pixels
 * @param frameHeight - Frame height in pixels
 * @param faceBounds - Optional face region bounds for backlit detection
 * @param thresholds - Lighting classification thresholds
 * @returns Complete lighting statistics
 */
function computeLightingFromPixels(
	pixelData: Uint8Array,
	frameWidth: number,
	frameHeight: number,
	faceBounds: FaceBounds | undefined,
	thresholds: LightingThresholds,
): LightingStatsWithRegions {
	const pixelCount = pixelData.length / 4;

	// Face region bounds in pixel coordinates (if provided)
	const faceX1 = faceBounds ? Math.floor(faceBounds.x * frameWidth) : 0;
	const faceY1 = faceBounds ? Math.floor(faceBounds.y * frameHeight) : 0;
	const faceX2 = faceBounds
		? Math.floor((faceBounds.x + faceBounds.width) * frameWidth)
		: 0;
	const faceY2 = faceBounds
		? Math.floor((faceBounds.y + faceBounds.height) * frameHeight)
		: 0;

	let totalLuminance = 0;
	let shadows = 0; // Pixels with luminance <= 20
	let highlights = 0; // Pixels with luminance >= 235
	let faceLuminanceSum = 0;
	let facePixelCount = 0;
	let backgroundLuminanceSum = 0;
	let backgroundPixelCount = 0;

	// Single pass: compute mean, histogram bins, face and background brightness
	for (let y = 0; y < frameHeight; y++) {
		for (let x = 0; x < frameWidth; x++) {
			const idx = (y * frameWidth + x) * 4;
			const r = pixelData[idx];
			const g = pixelData[idx + 1];
			const b = pixelData[idx + 2];

			// Standard RGB to luminance conversion
			const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
			totalLuminance += luminance;

			// Histogram counts (optimized inline instead of array allocation)
			if (luminance <= 20) shadows++;
			if (luminance >= 235) highlights++;

			// Check if pixel is inside face region
			const inFaceRegion =
				faceBounds && x >= faceX1 && x < faceX2 && y >= faceY1 && y < faceY2;

			if (inFaceRegion) {
				faceLuminanceSum += luminance;
				facePixelCount++;
			} else {
				backgroundLuminanceSum += luminance;
				backgroundPixelCount++;
			}
		}
	}

	const meanLuminance =
		pixelCount > 0 ? Math.round(totalLuminance / pixelCount) : 128;

	const shadowPercentage = (shadows / pixelCount) * 100;
	const highlightPercentage = (highlights / pixelCount) * 100;

	const histogram = {
		shadowPercentage,
		highlightPercentage,
		isShadowClipped: shadowPercentage > thresholds.shadowClipThreshold,
		isHighlightClipped: highlightPercentage > thresholds.highlightClipThreshold,
	};

	const faceBrightness =
		facePixelCount > 0 ? Math.round(faceLuminanceSum / facePixelCount) : undefined;

	const backgroundBrightness =
		backgroundPixelCount > 0
			? Math.round(backgroundLuminanceSum / backgroundPixelCount)
			: faceBrightness !== undefined
				? meanLuminance // Fallback when no background pixels (face fills frame)
				: 128;

	// Guard against zero background brightness to avoid Infinity/NaN
	const brightnessRatio =
		faceBrightness !== undefined && backgroundBrightness !== 0
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

				// downscaleFrame reserved for future frame resizing optimization
				// Currently using original dimensions (buffer matches frame size)

				const buffer = frame.getPixelBuffer();
				const pixels = new Uint8Array(buffer);

				const stats = computeLightingFromPixels(
					pixels,
					width,
					height,
					faceBoundsRef.current,
					thresholdsRef.current,
				);

				const runOnJSFn = (globalThis as Record<string, unknown>)
					.runOnJS as ((fn: () => void) => () => void) | undefined;
				if (runOnJSFn) {
					const wrappedCallback = runOnJSFn(() => {
						onLightingStatsRef.current(stats);
					});
					wrappedCallback();
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
