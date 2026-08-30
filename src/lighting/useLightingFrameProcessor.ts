/**
 * Lighting frame output hook for VisionCamera v5
 * Extracts real pixel data from camera frames and computes lighting stats.
 *
 * The worklet lifecycle (enabled guard, pixel extraction, runOnJS bridge,
 * frame.dispose in try/finally) lives in the shared Frame Pipeline module;
 * this hook only supplies the lighting analysis function.
 */

import { useCallback, useRef } from "react";
import type { FaceBounds } from "../faceDetection/types";
import { useFramePipeline } from "../framePipeline";
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
	frameOutput: ReturnType<typeof useFramePipeline>;
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
	const sampleStep = Math.max(
		1,
		Math.ceil(Math.max(frameWidth, frameHeight) / 320),
	);

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
	let sampledPixelCount = 0;

	// Single pass: compute mean, histogram bins, face and background brightness
	for (let y = 0; y < frameHeight; y += sampleStep) {
		for (let x = 0; x < frameWidth; x += sampleStep) {
			const idx = (y * frameWidth + x) * 4;
			const r = pixelData[idx];
			const g = pixelData[idx + 1];
			const b = pixelData[idx + 2];

			// Standard RGB to luminance conversion
			const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
			totalLuminance += luminance;
			sampledPixelCount++;

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

	// A small face can fall entirely between sampled coordinates. Use one
	// bounded center sample so backlit detection still receives face data.
	if (faceBounds && facePixelCount === 0 && frameWidth > 0 && frameHeight > 0) {
		const left = Math.max(0, Math.min(1, faceBounds.x));
		const top = Math.max(0, Math.min(1, faceBounds.y));
		const right = Math.max(0, Math.min(1, faceBounds.x + faceBounds.width));
		const bottom = Math.max(0, Math.min(1, faceBounds.y + faceBounds.height));

		if (right > left && bottom > top) {
			const x = Math.min(
				frameWidth - 1,
				Math.floor(((left + right) / 2) * frameWidth),
			);
			const y = Math.min(
				frameHeight - 1,
				Math.floor(((top + bottom) / 2) * frameHeight),
			);
			const idx = (y * frameWidth + x) * 4;
			const luminance =
				0.299 * pixelData[idx] +
				0.587 * pixelData[idx + 1] +
				0.114 * pixelData[idx + 2];
			faceLuminanceSum = luminance;
			facePixelCount = 1;
		}
	}

	const meanLuminance =
		sampledPixelCount > 0
			? Math.round(totalLuminance / sampledPixelCount)
			: 128;

	const shadowPercentage =
		sampledPixelCount > 0 ? (shadows / sampledPixelCount) * 100 : 0;
	const highlightPercentage =
		sampledPixelCount > 0 ? (highlights / sampledPixelCount) * 100 : 0;

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

	// Stable analysis function: reads current inputs from refs inside the worklet.
	const analyze = useCallback(
		(pixels: Uint8Array, width: number, height: number) =>
			computeLightingFromPixels(
				pixels,
				width,
				height,
				faceBoundsRef.current,
				thresholdsRef.current,
			),
		[],
	);

	const frameOutput = useFramePipeline({
		enabled,
		pixelFormat: "rgb",
		analyze,
		onResult: onLightingStats,
	});

	return { frameOutput };
}
