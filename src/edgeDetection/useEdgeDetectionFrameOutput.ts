/**
 * Edge detection frame output stub for VisionCamera v5
 * TODO: Re-implement using Nitro modules compatible approach
 */

import { useEffect, useRef } from "react";
import type { DominantLineResult, FrameStats } from "./types";

export interface UseEdgeDetectionFrameOutputOptions {
	enabled: boolean;
	onFrameStats: (
		stats: FrameStats,
		detectionResult: DominantLineResult,
	) => void;
}

interface UseEdgeDetectionFrameOutputResult {
	frameOutput: null;
}

/**
 * Stub hook for edge detection frame output - worklets temporarily disabled
 */
export function useEdgeDetectionFrameOutput({
	onFrameStats,
}: UseEdgeDetectionFrameOutputOptions): UseEdgeDetectionFrameOutputResult {
	const hasCalledRef = useRef(false);

	// Stub: Call with neutral stats only once on mount
	useEffect(() => {
		if (!hasCalledRef.current) {
			hasCalledRef.current = true;
			onFrameStats(
				{
					width: 1920,
					height: 1080,
					horizontalEdges: [],
					verticalEdges: [],
					meanEdgeStrength: 0,
				},
				{
					hasDominantLines: false,
					primaryOrientation: "none",
					confidence: 0,
					isAligned: true,
					prompt: null,
				},
			);
		}
	}, [onFrameStats]);

	return { frameOutput: null };
}
