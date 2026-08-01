/**
 * Frame Pipeline hook
 *
 * Owns the VisionCamera v5 worklet lifecycle for frame processors:
 * enabled guard, pixel buffer extraction, runOnJS bridge, and the
 * mandatory frame.dispose() in try/finally.
 *
 * Consumers plug in a worklet-safe `analyze` function (a pure function of
 * pixel data + frame dimensions) and receive results on the JS thread via
 * `onResult`. This removes the lifecycle duplication that used to live in
 * every frame processor (lighting, edge detection, ...).
 */

import { useCallback, useRef } from "react";
import { type Frame, useFrameOutput } from "react-native-vision-camera";

export interface UseFramePipelineOptions<TResult> {
	/** Whether the frame pipeline is active. When false, no frame output is created. */
	enabled: boolean;
	/** Pixel format requested from the camera frame output. */
	pixelFormat?: "rgb" | "yuv";
	/**
	 * Worklet-safe analysis function. Runs on the worklet thread per frame,
	 * so it must be pure and free of JS-only APIs (no React state, no timers).
	 *
	 * Must be stable across renders (module-level function or useCallback with
	 * stable deps) so the worklet is not recreated and serialization is safe.
	 */
	analyze: (
		pixels: Uint8Array,
		width: number,
		height: number,
	) => TResult;
	/** Callback invoked on the JS thread with the analysis result. */
	onResult: (result: TResult) => void;
}

/**
 * Run a frame through the shared pipeline.
 *
 * @returns The frame output for the camera's `outputs` array, or null when disabled.
 */
export function useFramePipeline<TResult>({
	enabled,
	pixelFormat = "rgb",
	analyze,
	onResult,
}: UseFramePipelineOptions<TResult>): ReturnType<typeof useFrameOutput> | null {
	// Keep the latest callback reachable from the worklet closure without re-creating it.
	const onResultRef = useRef(onResult);
	onResultRef.current = onResult;

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

				const buffer = frame.getPixelBuffer();
				const pixels = new Uint8Array(buffer);

				const result = analyze(pixels, width, height);

				const runOnJSFn = (globalThis as Record<string, unknown>)
					.runOnJS as ((fn: () => void) => () => void) | undefined;
				if (runOnJSFn) {
					runOnJSFn(() => {
						onResultRef.current(result);
					})();
				}
			} finally {
				frame.dispose();
			}
		},
		[enabled, analyze],
	);

	const frameOutput = useFrameOutput({
		pixelFormat,
		onFrame,
	});

	if (!enabled) {
		return null;
	}

	return frameOutput;
}
