/**
 * Scoring hook
 * Provides reactive shot-readiness score calculation at 10 Hz
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceFramingGuidance } from "../faceDetection/types";
import type { LightingClass, LightingStats } from "../lighting/types";
import {
	computeScore,
	getSubscoreLabel,
	type MLModelOutput,
	type ScoreResult,
	type ScoreSignals,
	type ScoreWeights,
	TARGET_SCORE_FPS,
} from "./types";

/**
 * Props for useScoring hook
 */
export interface UseScoringProps {
	/** Stability value (0-1 variance) */
	stability: number;
	/** Whether device is stable */
	isStable: boolean;
	/** Roll deviation from level in degrees */
	rollDeviation: number;
	/** Whether device is level */
	isLevel: boolean;
	/** Face framing guidance */
	framingGuidance?: FaceFramingGuidance | null;
	/** Face area percentage (0-100) */
	faceAreaPercent?: number;
	/** Lighting classification */
	lightingClass?: LightingClass;
	/** Lighting statistics */
	lightingStats?: LightingStats;
	/** Whether face framing is enabled for current mode */
	faceFramingEnabled: boolean;
	/** Whether lighting analysis is enabled */
	lightingAnalysisEnabled: boolean;
	/** Optional ML model output for hybrid scoring */
	modelOutput?: MLModelOutput;
	/** Optional custom scoring weights */
	weights?: ScoreWeights;
	/** Auto-capture threshold (default 80) */
	autoCaptureThreshold?: number;
	/** Target FPS for score updates (default 10) */
	targetFps?: number;
	/** Whether flat-lay detection is enabled (food mode) */
	flatLayEnabled?: boolean;
	/** Pitch angle in degrees (-90 = camera pointing down) */
	pitch?: number;
}

/**
 * Result from useScoring hook
 */
export interface UseScoringResult {
	/** Overall shot-readiness score (0-100) */
	score: number;
	/** Individual component scores */
	subScores: ScoreResult["subScores"];
	/** Which subscore is the weakest */
	weakestSubscore: keyof ScoreResult["subScores"];
	/** Human-readable label for weakest subscore */
	weakestSubscoreLabel: string;
	/** Whether score meets auto-capture threshold */
	meetsThreshold: boolean;
	/** Scoring method used */
	method: ScoreResult["method"];
	/** Whether breakdown view is expanded */
	isBreakdownVisible: boolean;
	/** Toggle breakdown visibility */
	toggleBreakdown: () => void;
	/** Show breakdown */
	showBreakdown: () => void;
	/** Hide breakdown */
	hideBreakdown: () => void;
}

/**
 * React hook for live shot-readiness scoring
 *
 * Features:
 * - Computes score at 10 Hz (or custom target FPS)
 * - Hybrid scoring with optional ML model
 * - Falls back to rules-only when ML unavailable
 * - Tracks weakest subscore for improvement guidance
 * - Manages breakdown view visibility
 *
 * @param props - Hook configuration
 * @returns Scoring state and controls
 */
export function useScoring({
	stability,
	isStable,
	rollDeviation,
	isLevel,
	framingGuidance = null,
	faceAreaPercent = 0,
	lightingClass = "good",
	lightingStats,
	faceFramingEnabled,
	lightingAnalysisEnabled,
	modelOutput,
	weights,
	autoCaptureThreshold = 80,
	targetFps = TARGET_SCORE_FPS,
	flatLayEnabled = false,
	pitch = 0,
}: UseScoringProps): UseScoringResult {
	// Score state
	const [scoreResult, setScoreResult] = useState<ScoreResult>({
		score: 0,
		subScores: {
			stability: 0,
			level: 0,
			framing: faceFramingEnabled ? 0 : 100,
			lighting: lightingAnalysisEnabled ? 0 : 100,
			aesthetic: 0,
			flatLay: flatLayEnabled ? 0 : 100,
		},
		weakestSubscore: "stability",
		meetsThreshold: false,
		method: "rules-only",
	});

	// Breakdown visibility state
	const [isBreakdownVisible, setIsBreakdownVisible] = useState(false);

	// Refs for interval management
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Memoized signals object
	const signalsRef = useRef<ScoreSignals>({
		stability,
		isStable,
		rollDeviation,
		isLevel,
		framingGuidance,
		faceAreaPercent,
		lightingClass,
		lightingStats,
		faceFramingEnabled,
		lightingAnalysisEnabled,
		flatLayEnabled,
		pitch,
	});

	// Update signals ref when props change
	useEffect(() => {
		signalsRef.current = {
			stability,
			isStable,
			rollDeviation,
			isLevel,
			framingGuidance,
			faceAreaPercent,
			lightingClass,
			lightingStats,
			faceFramingEnabled,
			lightingAnalysisEnabled,
			flatLayEnabled,
			pitch,
		};
	}, [
		stability,
		isStable,
		rollDeviation,
		isLevel,
		framingGuidance,
		faceAreaPercent,
		lightingClass,
		lightingStats,
		faceFramingEnabled,
		lightingAnalysisEnabled,
		flatLayEnabled,
		pitch,
	]);

	// Compute score function
	const computeCurrentScore = useCallback(() => {
		const result = computeScore(
			signalsRef.current,
			modelOutput,
			weights,
			autoCaptureThreshold,
		);
		setScoreResult(result);
	}, [modelOutput, weights, autoCaptureThreshold]);

	// Set up interval for score computation
	useEffect(() => {
		// Clear any existing interval
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		// Calculate interval from target FPS
		const intervalMs = 1000 / targetFps;

		// Set up new interval
		intervalRef.current = setInterval(() => {
			computeCurrentScore();
		}, intervalMs);

		// Compute immediately on mount
		computeCurrentScore();

		// Cleanup on unmount
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [computeCurrentScore, targetFps]);

	// Breakdown controls
	const toggleBreakdown = useCallback(() => {
		setIsBreakdownVisible((prev) => !prev);
	}, []);

	const showBreakdown = useCallback(() => {
		setIsBreakdownVisible(true);
	}, []);

	const hideBreakdown = useCallback(() => {
		setIsBreakdownVisible(false);
	}, []);

	return {
		score: scoreResult.score,
		subScores: scoreResult.subScores,
		weakestSubscore: scoreResult.weakestSubscore,
		weakestSubscoreLabel: getSubscoreLabel(scoreResult.weakestSubscore),
		meetsThreshold: scoreResult.meetsThreshold,
		method: scoreResult.method,
		isBreakdownVisible,
		toggleBreakdown,
		showBreakdown,
		hideBreakdown,
	};
}

export type {
	MLModelOutput,
	ScoreResult,
	ScoreWeights,
	SubScores,
} from "./types";
// Re-export types and constants for consumers
export {
	DEFAULT_HYBRID_WEIGHTS,
	DEFAULT_RULES_WEIGHTS,
	FOOD_MODE_WEIGHTS,
	getScoreBreakdown,
	getScoreColor,
	SCORE_THRESHOLDS,
	SCORE_UPDATE_INTERVAL_MS,
	TARGET_SCORE_FPS,
} from "./types";
