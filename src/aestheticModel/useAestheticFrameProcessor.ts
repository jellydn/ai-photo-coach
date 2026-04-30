/**
 * Aesthetic model frame processor
 * Processes camera frames through TFLite aesthetic model at <= 5 Hz
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { MLModelOutput } from "../scoring/types";
import { loadAestheticModel, runAestheticInference } from "./modelLoader";
import {
	type AestheticModelOutput,
	DEFAULT_PREPROCESS_OPTIONS,
	type FrameData,
} from "./types";

/** Target FPS for aesthetic model inference (5 Hz per spec) */
export const TARGET_AESTHETIC_FPS = 5;

/** Frame interval in ms: 1000ms / 5fps = 200ms */
export const AESTHETIC_FRAME_INTERVAL_MS = 1000 / TARGET_AESTHETIC_FPS;

/** Maximum model input dimension (224x224 per spec) */
export const MAX_MODEL_INPUT_SIZE = 224;

/**
 * Preprocess frame data for model inference
 * - Downsamples to 224x224
 * - Extracts RGB channels (removes alpha)
 * - Normalizes to [0, 1] by dividing by 255
 *
 * @param frameData Raw frame data
 * @returns Preprocessed Float32Array or null if preprocessing fails
 */
export function preprocessFrameForModel(
	frameData: FrameData,
): Float32Array | null {
	try {
		const { pixels, width, height } = frameData;
		const { targetWidth, targetHeight, normalizationDivisor } =
			DEFAULT_PREPROCESS_OPTIONS;

		// Validate input data
		if (
			!pixels ||
			pixels.length === 0 ||
			width === 0 ||
			height === 0 ||
			width * height * 4 !== pixels.length
		) {
			return null;
		}

		// Calculate scale factors
		const scaleX = width / targetWidth;
		const scaleY = height / targetHeight;

		// Create output buffer: 224x224x3 (RGB, no alpha)
		const outputSize = targetWidth * targetHeight * 3;
		const output = new Float32Array(outputSize);

		// Sample pixels (nearest neighbor downsampling)
		let outputIdx = 0;
		for (let y = 0; y < targetHeight; y++) {
			for (let x = 0; x < targetWidth; x++) {
				// Calculate source pixel position
				const srcX = Math.floor(x * scaleX);
				const srcY = Math.floor(y * scaleY);

				// Calculate source index (RGBA = 4 bytes per pixel)
				const srcIdx = (srcY * width + srcX) * 4;

				// Extract RGB and normalize
				output[outputIdx++] = pixels[srcIdx] / normalizationDivisor; // R
				output[outputIdx++] = pixels[srcIdx + 1] / normalizationDivisor; // G
				output[outputIdx++] = pixels[srcIdx + 2] / normalizationDivisor; // B
				// Skip alpha (srcIdx + 3)
			}
		}

		return output;
	} catch (error) {
		console.warn("[AestheticFrameProcessor] Preprocessing failed:", error);
		return null;
	}
}

/**
 * Frame skipper for rate limiting
 * Ensures model runs at <= 5 Hz
 */
export class FrameSkipper {
	private lastProcessTime = 0;
	private readonly minIntervalMs: number;

	constructor(targetFps: number) {
		this.minIntervalMs = 1000 / targetFps;
	}

	/**
	 * Check if enough time has passed to process next frame
	 * @returns true if should process frame
	 */
	shouldProcess(): boolean {
		const now = Date.now();
		if (now - this.lastProcessTime >= this.minIntervalMs) {
			this.lastProcessTime = now;
			return true;
		}
		return false;
	}

	/**
	 * Reset the skipper (force next frame to process)
	 */
	reset(): void {
		this.lastProcessTime = 0;
	}
}

/**
 * Props for useAestheticFrameProcessor hook
 */
export interface UseAestheticFrameProcessorProps {
	/** Whether frame processing is enabled */
	enabled: boolean;
	/** Callback when model output is available */
	onModelOutput: (output: MLModelOutput) => void;
	/** Target FPS (default 5) */
	targetFps?: number;
}

/**
 * Result from useAestheticFrameProcessor hook
 */
export interface UseAestheticFrameProcessorResult {
	/** Whether model is loaded and ready */
	isModelLoaded: boolean;
	/** Whether model failed to load */
	isModelFailed: boolean;
	/** Process a frame (call from worklet/frame callback) */
	processFrame: (frameData: FrameData) => void;
	/** Current processing FPS (for debugging) */
	currentFps: number;
}

/**
 * React hook for aesthetic model frame processing
 *
 * Features:
 * - Loads TFLite model on mount
 * - Processes frames at <= 5 Hz
 * - Preprocesses frames to 224x224 RGB
 * - Provides fallback when model unavailable
 *
 * @param props - Hook configuration
 * @returns Frame processor state and controls
 */
export function useAestheticFrameProcessor({
	enabled,
	onModelOutput,
	targetFps = TARGET_AESTHETIC_FPS,
}: UseAestheticFrameProcessorProps): UseAestheticFrameProcessorResult {
	// Model loading state
	const [isModelReady, setIsModelReady] = useState(false);
	const [isModelFailed, setIsModelFailed] = useState(false);

	// Frame skipper for rate limiting
	const frameSkipperRef = useRef(new FrameSkipper(targetFps));

	// FPS tracking
	const frameCountRef = useRef(0);
	const lastFpsUpdateRef = useRef(Date.now());
	const [currentFps, setCurrentFps] = useState(0);

	// Processing flag to prevent overlapping inferences
	const isProcessingRef = useRef(false);

	// Load model on mount
	useEffect(() => {
		let mounted = true;

		const loadModel = async () => {
			const result = await loadAestheticModel();
			if (mounted) {
				setIsModelReady(result.success);
				setIsModelFailed(!result.success);
			}
		};

		if (enabled) {
			loadModel();
		}

		return () => {
			mounted = false;
		};
	}, [enabled]);

	// Update FPS counter periodically
	useEffect(() => {
		if (!enabled) return;

		const interval = setInterval(() => {
			const now = Date.now();
			const elapsed = (now - lastFpsUpdateRef.current) / 1000;
			const fps = frameCountRef.current / elapsed;

			setCurrentFps(Math.round(fps));

			// Reset counters
			frameCountRef.current = 0;
			lastFpsUpdateRef.current = now;
		}, 1000);

		return () => clearInterval(interval);
	}, [enabled]);

	/**
	 * Process a frame through the aesthetic model
	 */
	const processFrame = useCallback(
		(frameData: FrameData) => {
			// Skip if disabled or model not ready
			if (!enabled || !isModelReady || isProcessingRef.current) {
				return;
			}

			// Rate limit to target FPS
			if (!frameSkipperRef.current.shouldProcess()) {
				return;
			}

			// Increment frame counter for FPS tracking
			frameCountRef.current++;

			// Start async processing
			isProcessingRef.current = true;

			const processAsync = async () => {
				try {
					// Preprocess frame to 224x224 RGB
					const inputData = preprocessFrameForModel(frameData);
					if (!inputData) {
						return;
					}

					// Run inference
					const output = await runAestheticInference(inputData);
					if (output) {
						onModelOutput({
							aestheticScore: output.aestheticScore,
							confidence: output.confidence,
						});
					}
				} catch (error) {
					// Fail silently per spec requirement
					console.warn(
						"[AestheticFrameProcessor] Frame processing failed:",
						error,
					);
				} finally {
					isProcessingRef.current = false;
				}
			};

			// Run without awaiting (fire and forget)
			processAsync();
		},
		[enabled, isModelReady, onModelOutput],
	);

	return {
		isModelLoaded: isModelReady,
		isModelFailed,
		processFrame,
		currentFps,
	};
}

/**
 * Worklet-safe frame processing entry point
 * Called from VisionCamera worklet to process frame data
 *
 * @param frameData Frame pixel data from VisionCamera
 * @param callback Callback to receive model output (uses runOnJS)
 */
export function processAestheticFrameWorklet(
	frameData: FrameData,
	callback: (output: AestheticModelOutput | null) => void,
): void {
	"worklet";

	// Note: In actual VisionCamera worklet, we'd use runOnJS to call back to JS thread
	// For now, this is a placeholder for the worklet integration

	// Preprocess on worklet thread
	const inputData = preprocessFrameForModel(frameData);
	if (!inputData) {
		callback(null);
		return;
	}

	// Inference must happen on JS thread (model is not worklet-safe)
	// In real implementation, use globalThis.runOnJS to call runAestheticInference
	callback(null);
}
