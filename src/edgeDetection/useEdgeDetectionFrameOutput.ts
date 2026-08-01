/**
 * Edge detection frame output hook for VisionCamera v5
 * Extracts real pixel data from camera frames and detects dominant lines.
 *
 * The worklet lifecycle (enabled guard, pixel extraction, runOnJS bridge,
 * frame.dispose in try/finally) lives in the shared Frame Pipeline module;
 * this hook only supplies the edge analysis function.
 */

import { useCallback } from "react";
import { useFramePipeline } from "../framePipeline";
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
	frameOutput: ReturnType<typeof useFramePipeline>;
}

/** Result of a single edge-analysis pass over one frame. */
interface EdgeFrameAnalysis {
	frameStats: FrameStats;
	detectionResult: DominantLineResult;
}

export function useEdgeDetectionFrameOutput({
	enabled,
	onFrameStats,
}: UseEdgeDetectionFrameOutputOptions): UseEdgeDetectionFrameOutputResult {
	// Stable analysis function: runs on the worklet thread per frame.
	const analyze = useCallback(
		(pixels: Uint8Array, width: number, height: number): EdgeFrameAnalysis => {
			const frameStats = computeFrameStats(pixels, width, height);
			const detectionResult = detectDominantLines(frameStats);
			return { frameStats, detectionResult };
		},
		[],
	);

	const frameOutput = useFramePipeline({
		enabled,
		pixelFormat: "rgb",
		analyze,
		onResult: (result) => {
			onFrameStats(result.frameStats, result.detectionResult);
		},
	});

	return { frameOutput };
}
