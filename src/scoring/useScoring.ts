/**
 * Scoring hook
 * Provides reactive shot-readiness score calculation at 10 Hz
 *
 * Deepened intake: callers pass one typed ScoreSignals bundle instead of
 * ~20 scalar props hand-assembled at the call site. The interface shrinks
 * to the signals object plus non-signal configuration (model output,
 * weights, thresholds).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	computeScore,
	getSubscoreLabel,
	type MLModelOutput,
	type ScoreResult,
	type ScoreSignals,
	type ScoreWeights,
	TARGET_SCORE_FPS,
} from "./types";
import { smokeDeadProbe } from "./smokeDeadProbe";

/**
 * Props for useScoring hook
 */
export interface UseScoringProps {
	/** Frame analysis signals feeding the score (one typed bundle) */
	signals: ScoreSignals;
	/** Optional ML model output for hybrid scoring */
	modelOutput?: MLModelOutput;
	/** Optional custom scoring weights */
	weights?: ScoreWeights;
	/** Auto-capture threshold (default 80) */
	autoCaptureThreshold?: number;
	/** Target FPS for score updates (default 10) */
	targetFps?: number;
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
 * @param props - Hook configuration (signals bundle + non-signal config)
 * @returns Scoring state and controls
 */
export function useScoring({
	signals,
	modelOutput,
	weights,
	autoCaptureThreshold = 80,
	targetFps = TARGET_SCORE_FPS,
}: UseScoringProps): UseScoringResult {
	// Only the gating flags influence the initial subScores state; the rest
	// of the bundle flows through signalsRef untouched, so we destructure
	// exactly what the initial state needs.
	const {
		faceFramingEnabled,
		lightingAnalysisEnabled,
		flatLayEnabled = false,
		groupFramingEnabled = false,
		centeringEnabled = false,
		documentSkewEnabled = false,
		nightModeEnabled = false,
	} = signals;

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
			groupFraming: groupFramingEnabled ? 0 : 100,
			centering: centeringEnabled ? 0 : 100,
			documentSkew: documentSkewEnabled ? 0 : 100,
			lowLightStability: nightModeEnabled ? 0 : 100,
		},
		weakestSubscore: "stability",
		weakestSubscoreLabel: "Stability",
		meetsThreshold: false,
		method: "rules-only",
	});

	// Breakdown visibility state
	const [isBreakdownVisible, setIsBreakdownVisible] = useState(false);

	// Refs for interval management
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Signals ref - updated when the bundle changes
	const signalsRef = useRef<ScoreSignals>(signals);

	// Keep the latest signals bundle reachable from the interval callback
	useEffect(() => {
		signalsRef.current = signals;
	}, [signals]);

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

	void smokeDeadProbe; // smoke-test wiring for the dead-export-pr guard

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
	GROUP_MODE_WEIGHTS,
	getScoreBreakdown,
	getScoreColor,
	SCORE_THRESHOLDS,
	SCORE_UPDATE_INTERVAL_MS,
	TARGET_SCORE_FPS,
} from "./types";
