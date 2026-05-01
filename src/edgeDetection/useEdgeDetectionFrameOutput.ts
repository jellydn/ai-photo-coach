/**
 * Edge detection frame output hook for VisionCamera v5
 * Extracts real pixel data from camera frames and detects dominant lines
 */

import { useCallback, useRef } from "react";
import { type Frame, useFrameOutput } from "react-native-vision-camera";
import { downscaleFrame } from "../faceDetection/types";
import {
	computeFrameStats,
	type DominantLineResult,
	detectDominantLines,
	type FrameStats,
	MAX_EDGE_DETECTION_LONG_EDGE,
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

				const downscaled = downscaleFrame(
					width,
					height,
					MAX_EDGE_DETECTION_LONG_EDGE,
				);

				const buffer = frame.getPixelBuffer();
				const pixels = new Uint8Array(buffer);

				const frameStats = computeFrameStats(
					pixels,
					downscaled.width,
					downscaled.height,
				);

				const detectionResult = detectDominantLines(frameStats);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const runOnJS = (globalThis as any).runOnJS;
				if (runOnJS) {
					runOnJS(onFrameStatsRef.current)(frameStats, detectionResult);
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
