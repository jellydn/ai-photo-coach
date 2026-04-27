/**
 * Edge detection hook for Travel mode
 * Provides reactive dominant line detection for scenery framing
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	type DominantLineResult,
	detectDominantLines,
	type FrameStats,
	TARGET_EDGE_DETECTION_FPS,
} from "./types";

/**
 * Props for useEdgeDetection hook
 */
export interface UseEdgeDetectionProps {
	/** Whether edge detection is enabled */
	enabled: boolean;
	/** Target FPS for processing (default 20) */
	targetFps?: number;
}

/**
 * Result from useEdgeDetection hook
 */
export interface UseEdgeDetectionResult {
	/** Whether dominant lines were detected */
	hasDominantLines: boolean;
	/** Primary line orientation */
	primaryOrientation: "horizontal" | "vertical" | "none";
	/** Detection confidence (0-1) */
	confidence: number;
	/** Whether lines are aligned with frame */
	isAligned: boolean;
	/** User prompt for alignment */
	prompt: string | null;
	/** Full detection result */
	result: DominantLineResult;
}

/**
 * React hook for edge detection in Travel mode
 *
 * Features:
 * - Polling-based frame analysis (stub for frame processor integration)
 * - Detects strong vertical/horizontal lines
 * - Emits "Align with line" prompt when needed
 *
 * @param props - Hook configuration
 * @returns Edge detection state
 */
export function useEdgeDetection({
	enabled,
	targetFps = TARGET_EDGE_DETECTION_FPS,
}: UseEdgeDetectionProps): UseEdgeDetectionResult {
	const [result, setResult] = useState<DominantLineResult>({
		hasDominantLines: false,
		primaryOrientation: "none",
		confidence: 0,
		isAligned: false,
		prompt: null,
	});

	// Use refs for interval management
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Simulated frame processor stub
	// In production, this would be replaced with actual VisionCamera frame processor
	const analyzeFrame = useCallback(() => {
		// Create simulated frame stats for travel mode
		// This simulates detecting lines in landscape/architectural scenes
		const mockFrameStats: FrameStats = {
			width: 320,
			height: 240,
			// Simulate strong horizontal edges (common in travel photos - horizons)
			horizontalEdges: generateMockEdgeData(320 * 240, 0.4),
			// Simulate moderate vertical edges (buildings, trees)
			verticalEdges: generateMockEdgeData(320 * 240, 0.2),
			meanEdgeStrength: 0.3,
		};

		const detectionResult = detectDominantLines(mockFrameStats);
		setResult(detectionResult);
	}, []);

	// Set up polling interval when enabled
	useEffect(() => {
		if (!enabled) {
			// Reset state when disabled
			setResult({
				hasDominantLines: false,
				primaryOrientation: "none",
				confidence: 0,
				isAligned: false,
				prompt: null,
			});
			return;
		}

		// Analyze immediately
		analyzeFrame();

		// Set up interval for periodic analysis
		const intervalMs = 1000 / targetFps;
		intervalRef.current = setInterval(analyzeFrame, intervalMs);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [enabled, targetFps, analyzeFrame]);

	return {
		hasDominantLines: result.hasDominantLines,
		primaryOrientation: result.primaryOrientation,
		confidence: result.confidence,
		isAligned: result.isAligned,
		prompt: result.prompt,
		result,
	};
}

/**
 * Generate mock edge data for testing
 * Creates an array of edge magnitudes with specified mean
 */
function generateMockEdgeData(count: number, meanValue: number): number[] {
	const data: number[] = [];
	for (let i = 0; i < Math.min(count, 1000); i++) {
		// Generate values around the mean with some variance
		const variance = 0.2;
		const value = Math.max(
			0,
			Math.min(1, meanValue + (Math.random() - 0.5) * variance),
		);
		data.push(value);
	}
	return data;
}
