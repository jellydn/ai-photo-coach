/**
 * Edge detection hook for Travel mode
 * Provides reactive dominant line detection for scenery framing
 *
 * This hook can work in two modes:
 * 1. **Real camera mode** (default): Receives actual frame data via `handleFrameStats`
 *    callback from a VisionCamera frame processor. Use with `useEdgeDetectionFrameOutput`
 *    to analyze real camera frames.
 *
 * 2. **Simulation mode** (`useSimulatedData: true`): Generates preset line detection
 *    results for testing and development without a camera.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	type DominantLineResult,
	type FrameStats,
	TARGET_EDGE_DETECTION_FPS,
} from "./types";

/**
 * Props for useEdgeDetection hook
 */
export interface UseEdgeDetectionProps {
	/** Whether edge detection is enabled */
	enabled: boolean;
	/** Target FPS for processing (default 20) - informational only */
	targetFps?: number;
	/**
	 * Use simulated data for testing (default false).
	 * When true, generates preset edge detection results.
	 * When false, expects frame data via handleFrameStats callback.
	 */
	useSimulatedData?: boolean;
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
	/** Current frame stats (for document detection) */
	frameStats: FrameStats | null;
	/**
	 * Callback to receive frame stats from frame processor.
	 * Call this from your frame processor with computed edge stats.
	 */
	handleFrameStats: (
		stats: FrameStats,
		detectionResult: DominantLineResult,
	) => void;
}

/**
 * React hook for edge detection in Travel mode
 *
 * Features:
 * - Receives real frame data from VisionCamera frame processor
 * - Detects strong vertical/horizontal lines
 * - Emits "Align with line" prompt when needed
 * - Falls back to simulation mode for testing
 *
 * @param props - Hook configuration
 * @returns Edge detection state and frame stats handler
 */
export function useEdgeDetection({
	enabled,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	targetFps = TARGET_EDGE_DETECTION_FPS,
	useSimulatedData = false,
}: UseEdgeDetectionProps): UseEdgeDetectionResult {
	const [result, setResult] = useState<DominantLineResult>({
		hasDominantLines: false,
		primaryOrientation: "none",
		confidence: 0,
		isAligned: false,
		prompt: null,
	});

	// Frame stats state (exposed for document detection)
	const [frameStats, setFrameStats] = useState<FrameStats | null>(null);

	// Refs for simulation mode
	const frameCountRef = useRef(0);
	const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	/**
	 * Handle frame stats from frame processor
	 * This is the primary interface for receiving real camera frame data
	 */
	const handleFrameStats = useCallback(
		(stats: FrameStats, detectionResult: DominantLineResult) => {
			if (!enabled) return;

			// Store frame stats for document detection
			setFrameStats(stats);
			// Update result directly from frame processor
			setResult(detectionResult);
		},
		[enabled],
	);

	/**
	 * Simulation mode: Generate preset edge detection results
	 * Used for testing when not connected to real camera frames
	 */
	useEffect(() => {
		if (!enabled || !useSimulatedData) {
			// Reset state when disabled or not in simulation mode
			if (!enabled) {
				setResult({
					hasDominantLines: false,
					primaryOrientation: "none",
					confidence: 0,
					isAligned: false,
					prompt: null,
				});
				setFrameStats(null);
			}

			// Clear any existing interval
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}

			return;
		}

		// Simulation mode: generate preset edge detection results
		const simulateEdgeDetection = () => {
			frameCountRef.current++;

			// Simulate different edge detection scenarios
			// Cycle through conditions every 100 frames
			const cycle = Math.floor(frameCountRef.current / 100) % 5;

			let simulatedResult: DominantLineResult;

			switch (cycle) {
				case 0: // No dominant lines (scattered/natural scene)
					simulatedResult = {
						hasDominantLines: false,
						primaryOrientation: "none",
						confidence: 0.3,
						isAligned: false,
						prompt: null,
					};
					break;

				case 1: // Strong horizontal lines (horizon, water)
					simulatedResult = {
						hasDominantLines: true,
						primaryOrientation: "horizontal",
						confidence: 0.85,
						isAligned: true,
						prompt: null,
					};
					break;

				case 2: // Strong vertical lines (buildings, trees)
					simulatedResult = {
						hasDominantLines: true,
						primaryOrientation: "vertical",
						confidence: 0.82,
						isAligned: true,
						prompt: null,
					};
					break;

				case 3: // Horizontal lines needing alignment
					simulatedResult = {
						hasDominantLines: true,
						primaryOrientation: "horizontal",
						confidence: 0.65,
						isAligned: false,
						prompt: "Align with line",
					};
					break;

				case 4: // Vertical lines needing alignment
				default:
					simulatedResult = {
						hasDominantLines: true,
						primaryOrientation: "vertical",
						confidence: 0.68,
						isAligned: false,
						prompt: "Align with line",
					};
					break;
			}

			// Create simulated frame stats for document detection
			const simulatedFrameStats: FrameStats = {
				width: 320,
				height: 240,
				horizontalEdges: new Array(100).fill(
					simulatedResult.primaryOrientation === "horizontal" ? 0.5 : 0.2,
				),
				verticalEdges: new Array(100).fill(
					simulatedResult.primaryOrientation === "vertical" ? 0.5 : 0.2,
				),
				meanEdgeStrength: simulatedResult.confidence * 0.5,
			};

			// Update state with simulated data
			setFrameStats(simulatedFrameStats);
			setResult(simulatedResult);
		};

		// Set up polling interval for simulation (50ms = 20 FPS)
		intervalRef.current = setInterval(simulateEdgeDetection, 50);

		// Initial simulation
		simulateEdgeDetection();

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [enabled, useSimulatedData]);

	return {
		hasDominantLines: result.hasDominantLines,
		primaryOrientation: result.primaryOrientation,
		confidence: result.confidence,
		isAligned: result.isAligned,
		prompt: result.prompt,
		result,
		frameStats,
		handleFrameStats,
	};
}
