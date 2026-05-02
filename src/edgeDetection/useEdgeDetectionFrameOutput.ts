/**
 * Edge detection frame output hook for VisionCamera v5
 * Extracts real pixel data from camera frames and detects dominant lines
 */

import { useCallback, useRef } from "react";
import { type Frame, useFrameOutput } from "react-native-vision-camera";
import {
	computeFrameStats,
	type DominantLineResult,
	detectDominantLines,
	type FrameStats,
} from "./types";

export interface UseEdgeDetectionFrameOutputOptions {
	enabled: boolean;
	onFrameStats: (
		stats: FrameStats,
		detectionResult: DominantLineResult,
	) => void;
}

interface UseEdgeDetectionFrameOutputResult {
	frameOutput: ReturnType<typeof useFrameOutput> | null;
}

export function useEdgeDetectionFrameOutput({
	enabled,
	onFrameStats,
}: UseEdgeDetectionFrameOutputOptions): UseEdgeDetectionFrameOutputResult {
	const onFrameStatsRef = useRef(onFrameStats);
	onFrameStatsRef.current = onFrameStats;

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

				const frameStats = computeFrameStats(
					pixels,
					width,
					height,
				);

				const detectionResult = detectDominantLines(frameStats);

				const runOnJSFn = (globalThis as Record<string, unknown>).runOnJS as
					| ((fn: () => void) => () => void)
					| undefined;
				if (runOnJSFn) {
					const wrappedCallback = runOnJSFn(() => {
						onFrameStatsRef.current(frameStats, detectionResult);
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
