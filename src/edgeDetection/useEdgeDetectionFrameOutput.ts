/**
 * Edge detection frame processor for VisionCamera v5
 * Captures frame pixel data and extracts edge information for line detection
 *
 * This module provides a frame output hook that:
 * - Captures camera frames using VisionCamera's useFrameOutput
 * - Extracts edge magnitude data from RGB pixel buffers
 * - Downsamples frames to MAX_EDGE_DETECTION_LONG_EDGE (320px) for performance
 * - Calls back with frame statistics for useEdgeDetection hook
 *
 * VisionCamera v5 API changes from v4:
 * - Uses useFrameOutput hook with onFrame callback instead of useFrameProcessor
 * - Frame type uses getPixelBuffer() instead of toArrayBuffer()
 * - Frame must be disposed via frame.dispose()
 * - Frame output is passed via outputs prop, not frameProcessor prop
 */

import { useCallback, useMemo, useRef } from "react";
import type { Frame } from "react-native-vision-camera";
import { useFrameOutput } from "react-native-vision-camera";
import "react-native-worklets-core";
import {
	computeFrameStats,
	type DominantLineResult,
	detectDominantLines,
	type FrameStats,
	MAX_EDGE_DETECTION_LONG_EDGE,
	TARGET_EDGE_DETECTION_FPS,
} from "./types";

/**
 * Configuration options for edge detection frame output
 */
interface UseEdgeDetectionFrameOutputOptions {
	/** Whether edge detection is enabled */
	enabled: boolean;
	/** Callback when frame stats are computed */
	onFrameStats: (stats: FrameStats, result: DominantLineResult) => void;
}

/**
 * Extract edge data from RGB frame buffer
 * Downsampling is applied to meet performance requirements (>=20 FPS)
 *
 * @param frame - VisionCamera Frame with RGB pixel data
 * @param maxLongEdge - Maximum long edge dimension for downsampling
 * @returns Object with pixel data, dimensions, and sample step
 */
function extractEdgeDataFromFrame(
	frame: Frame,
	maxLongEdge: number,
): {
	pixelData: Uint8Array;
	width: number;
	height: number;
	sampleStep: number;
} {
	"worklet";

	// Get frame dimensions
	const frameWidth = frame.width;
	const frameHeight = frame.height;

	// Calculate downsample scale to meet max dimension requirement
	const longEdge = Math.max(frameWidth, frameHeight);
	const scale = Math.min(1, maxLongEdge / longEdge);
	const scaledWidth = Math.floor(frameWidth * scale);
	const scaledHeight = Math.floor(frameHeight * scale);

	// Calculate sample step for downsampling
	// We sample every Nth pixel where N = 1/scale
	const sampleStep = Math.max(1, Math.floor(1 / scale));

	// Access raw pixel buffer from frame using getPixelBuffer()
	const buffer = frame.getPixelBuffer();
	const fullPixelData = new Uint8Array(buffer);

	// Sample pixels at regular intervals for performance
	// Skip border pixels (5% margin) to avoid edge artifacts
	const xStart = Math.floor(frameWidth * 0.05);
	const xEnd = Math.floor(frameWidth * 0.95);
	const yStart = Math.floor(frameHeight * 0.05);
	const yEnd = Math.floor(frameHeight * 0.95);

	const sampledPixels: number[] = [];

	// For RGB data (4 bytes per pixel: RGBA)
	const bytesPerPixel = 4;

	for (let y = yStart; y < yEnd; y += sampleStep) {
		for (let x = xStart; x < xEnd; x += sampleStep) {
			// Calculate pixel index in RGBA buffer
			const idx = (y * frameWidth + x) * bytesPerPixel;

			if (idx + 2 < fullPixelData.length) {
				const r = fullPixelData[idx];
				const g = fullPixelData[idx + 1];
				const b = fullPixelData[idx + 2];

				// Store RGB values
				sampledPixels.push(r, g, b);
			}
		}
	}

	// Convert back to Uint8Array for consistent API
	const pixelData = new Uint8Array(sampledPixels);

	return {
		pixelData,
		width: scaledWidth,
		height: scaledHeight,
		sampleStep,
	};
}

/**
 * Reconstruct RGBA buffer from sampled RGB data
 * This reconstructs a buffer that can be used with the existing edge detection utilities
 *
 * @param rgbData - Sampled RGB values (3 bytes per sampled pixel)
 * @param targetWidth - Target width for reconstructed buffer
 * @param targetHeight - Target height for reconstructed buffer
 * @returns RGBA Uint8Array
 */
function reconstructPixelBuffer(
	rgbData: Uint8Array,
	targetWidth: number,
	targetHeight: number,
): Uint8Array {
	"worklet";

	// Calculate how many pixels we actually sampled
	const sampledPixelCount = Math.floor(rgbData.length / 3);

	// Create full-size RGBA buffer
	const fullBuffer = new Uint8Array(targetWidth * targetHeight * 4);

	// Fill with sampled data at appropriate positions
	// Sampled pixels are distributed evenly across the frame
	const xStep = Math.max(
		1,
		Math.floor(targetWidth / Math.sqrt(sampledPixelCount)),
	);
	const yStep = Math.max(
		1,
		Math.floor(targetHeight / Math.sqrt(sampledPixelCount)),
	);

	let rgbIdx = 0;
	for (let y = 0; y < targetHeight && rgbIdx < rgbData.length; y += yStep) {
		for (let x = 0; x < targetWidth && rgbIdx < rgbData.length; x += xStep) {
			const idx = (y * targetWidth + x) * 4;
			if (idx + 2 < fullBuffer.length) {
				fullBuffer[idx] = rgbData[rgbIdx]; // R
				fullBuffer[idx + 1] = rgbData[rgbIdx + 1]; // G
				fullBuffer[idx + 2] = rgbData[rgbIdx + 2]; // B
				fullBuffer[idx + 3] = 255; // A
			}
			rgbIdx += 3;
		}
	}

	return fullBuffer;
}

/**
 * Frame skip counter for FPS throttling
 */
class FrameSkipper {
	private lastProcessTime = 0;
	private readonly minIntervalMs: number;

	constructor(targetFps: number) {
		this.minIntervalMs = 1000 / targetFps;
	}

	shouldProcess(): boolean {
		const now = Date.now();
		if (now - this.lastProcessTime >= this.minIntervalMs) {
			this.lastProcessTime = now;
			return true;
		}
		return false;
	}
}

/**
 * React hook for edge detection frame processing with VisionCamera v5
 *
 * This hook creates a frame output that analyzes dominant lines
 * from camera frames and calls back with computed statistics.
 *
 * Usage:
 * ```tsx
 * const { frameOutput } = useEdgeDetectionFrameOutput({
 *   enabled: modeConfig.edgeDetection,
 *   onFrameStats: (stats, result) => {
 *     setEdgeStats(stats);
 *     setEdgeResult(result);
 *   },
 * });
 *
 * <Camera
 *   outputs={[photoOutput, lightingFrameOutput, frameOutput]}  // Include frameOutput in outputs
 *   ...
 * />
 * ```
 *
 * @param options - Configuration options
 * @returns Frame output to include in Camera outputs prop
 */
export function useEdgeDetectionFrameOutput({
	enabled,
	onFrameStats,
}: UseEdgeDetectionFrameOutputOptions): {
	frameOutput: ReturnType<typeof useFrameOutput> | null;
} {
	// Use refs to avoid re-creating callbacks on every render
	const onStatsRef = useRef(onFrameStats);

	// Update refs when props change
	onStatsRef.current = onFrameStats;

	// Create frame skipper for FPS throttling
	const frameSkipper = useMemo(
		() => new FrameSkipper(TARGET_EDGE_DETECTION_FPS),
		[],
	);

	// Frame callback - runs on worklet thread via VisionCamera worklets
	const onFrame = useCallback(
		(frame: Frame) => {
			"worklet";

			try {
				// Skip frames to maintain target FPS (worklet-safe throttling)
				const shouldProcess = frameSkipper.shouldProcess();
				if (!shouldProcess) {
					frame.dispose();
					return;
				}

				// Extract edge data from frame
				const { pixelData, width, height } = extractEdgeDataFromFrame(
					frame,
					MAX_EDGE_DETECTION_LONG_EDGE,
				);

				// Reconstruct buffer for analysis
				const reconstructedBuffer = reconstructPixelBuffer(
					pixelData,
					width,
					height,
				);

				// Use runOnJS to call the analysis function on JS thread
				const runOnJS = (
					globalThis as unknown as { runOnJS?: <T>(fn: () => T) => T }
				).runOnJS;

				if (runOnJS) {
					runOnJS(() => {
						try {
							// Compute frame stats on JS thread with full utilities
							const stats = computeFrameStats(
								reconstructedBuffer,
								width,
								height,
							);

							// Compute dominant line detection
							const result = detectDominantLines(stats);

							// Call the callback with computed stats and result
							onStatsRef.current?.(stats, result);
						} catch (error) {
							console.warn("[EdgeDetection] Stats computation error:", error);
						}
					});
				}
			} catch (error) {
				// Silently handle errors to avoid crashing the camera pipeline
				console.warn("[EdgeDetection] Frame processing error:", error);
			} finally {
				// Always dispose the frame to prevent memory leaks
				frame.dispose();
			}
		},
		[frameSkipper],
	);

	// Use the actual frame output hook from VisionCamera v5
	const cameraFrameOutput = useFrameOutput({
		pixelFormat: "rgb",
		onFrame: enabled ? onFrame : undefined,
		dropFramesWhileBusy: true,
	});

	return {
		frameOutput: enabled ? cameraFrameOutput : null,
	};
}

export type { UseEdgeDetectionFrameOutputOptions };
