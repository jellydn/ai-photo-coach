/**
 * Scoring engine - Pure functions for shot-readiness score calculation
 * Hybrid approach: rule-based subscores with optional ML aesthetic model
 */

import type { FaceFramingGuidance } from "../faceDetection/types";
import type { LightingClass, LightingStats } from "../lighting/types";

/**
 * Input signals for score calculation
 */
export interface ScoreSignals {
	/** Whether device is stable (0-1 variance measure) */
	stability: number;
	/** Whether device is stable (boolean from threshold) */
	isStable: boolean;
	/** Roll angle in degrees from level (absolute value) */
	rollDeviation: number;
	/** Whether device is level */
	isLevel: boolean;
	/** Face framing guidance (null if no face or good framing) */
	framingGuidance: FaceFramingGuidance | null;
	/** Face area as percentage of frame (0-100) */
	faceAreaPercent: number;
	/** Current lighting classification */
	lightingClass: LightingClass;
	/** Lighting statistics for detailed scoring */
	lightingStats?: LightingStats;
	/** Whether face framing is enabled for this mode */
	faceFramingEnabled: boolean;
	/** Whether lighting analysis is enabled */
	lightingAnalysisEnabled: boolean;
}

/**
 * Optional ML model output for hybrid scoring
 */
export interface MLModelOutput {
	/** Aesthetic quality score from TFLite model (0-1) */
	aestheticScore: number;
	/** Confidence in the prediction (0-1) */
	confidence: number;
}

/**
 * Individual subscores (0-100 each)
 */
export interface SubScores {
	/** Stability score - higher when more stable */
	stability: number;
	/** Level score - higher when closer to level */
	level: number;
	/** Framing score - higher when better framed */
	framing: number;
	/** Lighting score - higher when lighting is better */
	lighting: number;
	/** Aesthetic score from ML model (0 if no model) */
	aesthetic: number;
}

/**
 * Complete score result with breakdown
 */
export interface ScoreResult {
	/** Overall score (0-100) */
	score: number;
	/** Individual component scores */
	subScores: SubScores;
	/** Which subscore is lowest (the weakest area) */
	weakestSubscore: keyof SubScores;
	/** Whether this meets auto-capture threshold */
	meetsThreshold: boolean;
	/** Scoring method used: 'rules-only' | 'hybrid' | 'ml-only' */
	method: "rules-only" | "hybrid" | "ml-only";
}

/**
 * Configuration for scoring weights
 */
export interface ScoreWeights {
	/** Weight for stability (default 0.25) */
	stability: number;
	/** Weight for level (default 0.20) */
	level: number;
	/** Weight for framing (default 0.25) */
	framing: number;
	/** Weight for lighting (default 0.30) */
	lighting: number;
	/** Weight for aesthetic ML score (default 0.25, reduces others proportionally) */
	aesthetic: number;
}

/** Default scoring weights for rules-only mode */
export const DEFAULT_RULES_WEIGHTS: ScoreWeights = {
	stability: 0.25,
	level: 0.2,
	framing: 0.25,
	lighting: 0.3,
	aesthetic: 0, // No aesthetic in rules-only
};

/** Default scoring weights for hybrid mode (with ML model) */
export const DEFAULT_HYBRID_WEIGHTS: ScoreWeights = {
	stability: 0.2,
	level: 0.15,
	framing: 0.2,
	lighting: 0.25,
	aesthetic: 0.2,
};

/** Score thresholds for visual indicator */
export const SCORE_THRESHOLDS = {
	/** Poor: below this shows red */
	POOR: 50,
	/** Fair: below this shows yellow, above shows green */
	GOOD: 80,
} as const;

/** Maximum roll deviation in degrees for perfect score */
export const MAX_ROLL_DEVIATION = 10;

/** Face area target for portrait mode (percentage) */
export const TARGET_FACE_AREA_PCT = 35;

/** Maximum acceptable face area deviation from target */
export const MAX_FACE_AREA_DEVIATION = 25;

/**
 * Compute stability subscore (0-100)
 * @param isStable - Whether currently stable
 * @param stability - Stability variance value (0-1)
 * @returns Score 0-100
 */
export function computeStabilityScore(
	isStable: boolean,
	stability: number,
): number {
	if (!isStable) {
		// Penalize instability - exponential falloff
		return Math.max(0, 100 - stability * 2000);
	}
	return 100;
}

/**
 * Compute level subscore (0-100)
 * @param isLevel - Whether currently level
 * @param rollDeviation - Absolute roll deviation in degrees
 * @returns Score 0-100
 */
export function computeLevelScore(
	isLevel: boolean,
	rollDeviation: number,
): number {
	if (isLevel) {
		return 100;
	}
	// Linear falloff from perfect at 0° to zero at MAX_ROLL_DEVIATION
	const deviation = Math.min(rollDeviation, MAX_ROLL_DEVIATION);
	return Math.max(0, 100 - (deviation / MAX_ROLL_DEVIATION) * 100);
}

/**
 * Compute framing subscore (0-100)
 * @param faceFramingEnabled - Whether face framing is enabled
 * @param framingGuidance - Face framing guidance (null = good framing)
 * @param faceAreaPercent - Face area as percentage of frame
 * @returns Score 0-100
 */
export function computeFramingScore(
	faceFramingEnabled: boolean,
	framingGuidance: FaceFramingGuidance | null,
	faceAreaPercent: number,
): number {
	if (!faceFramingEnabled) {
		// If face framing disabled, give perfect score
		return 100;
	}

	if (!framingGuidance) {
		// Good framing - check if face area is optimal
		const deviation = Math.abs(faceAreaPercent - TARGET_FACE_AREA_PCT);
		if (deviation <= 5) {
			return 100; // Perfect
		}
		// Slight penalty for non-optimal but acceptable framing
		return Math.max(70, 100 - deviation * 2);
	}

	// Has framing guidance - analyze the issue based on actual guidance properties
	if (framingGuidance.isTooSmall || framingGuidance.isTooLarge) {
		// Distance issues are major - significant penalty
		// Severity based on how far from ideal
		const areaDiff = Math.abs(
			framingGuidance.faceAreaPercent - TARGET_FACE_AREA_PCT,
		);
		return areaDiff > 20 ? 30 : 50;
	}

	if (Math.abs(framingGuidance.headroomOffset) > 0.05) {
		// Headroom issues are moderate
		return Math.abs(framingGuidance.headroomOffset) > 0.1 ? 50 : 70;
	}

	// Other framing issues (centering, etc.) are minor
	return 75;
}

/**
 * Compute lighting subscore (0-100)
 * @param lightingAnalysisEnabled - Whether lighting analysis is enabled
 * @param lightingClass - Current lighting classification
 * @returns Score 0-100
 */
export function computeLightingScore(
	lightingAnalysisEnabled: boolean,
	lightingClass: LightingClass,
): number {
	if (!lightingAnalysisEnabled) {
		return 100;
	}

	switch (lightingClass) {
		case "good":
			return 100;
		case "backlit":
			return 60; // Fixable issue
		case "too_bright":
			return 40; // Harder to fix
		case "too_dark":
			return 30; // Hardest to fix
		default:
			return 100;
	}
}

/**
 * Normalize aesthetic score from ML model (0-1) to 0-100
 * @param aestheticScore - Raw aesthetic score from model (0-1)
 * @returns Normalized score 0-100
 */
export function normalizeAestheticScore(aestheticScore: number): number {
	return Math.max(0, Math.min(100, aestheticScore * 100));
}

/**
 * Find the weakest subscore (lowest value)
 * @param subScores - All subscores
 * @returns Key of the lowest subscore
 */
export function findWeakestSubscore(subScores: SubScores): keyof SubScores {
	let weakest: keyof SubScores = "stability";
	let minScore = subScores.stability;

	for (const [key, score] of Object.entries(subScores) as [
		keyof SubScores,
		number,
	][]) {
		if (score < minScore) {
			minScore = score;
			weakest = key;
		}
	}

	return weakest;
}

/**
 * Get human-readable label for subscore
 * @param subscore - Subscore key
 * @returns Human-readable label
 */
export function getSubscoreLabel(subscore: keyof SubScores): string {
	const labels: Record<keyof SubScores, string> = {
		stability: "Stability",
		level: "Horizon Level",
		framing: "Face Framing",
		lighting: "Lighting",
		aesthetic: "Aesthetic Quality",
	};
	return labels[subscore];
}

/**
 * Get color for score level
 * @param score - Score 0-100
 * @returns Color hex code
 */
export function getScoreColor(score: number): string {
	if (score < SCORE_THRESHOLDS.POOR) {
		return "#FF3B30"; // Red
	}
	if (score < SCORE_THRESHOLDS.GOOD) {
		return "#FFCC00"; // Yellow
	}
	return "#34C759"; // Green
}

/**
 * Compute weighted average of subscores
 * @param subScores - Individual subscores
 * @param weights - Weights for each component
 * @returns Weighted average score
 */
export function computeWeightedScore(
	subScores: SubScores,
	weights: ScoreWeights,
): number {
	const totalWeight =
		weights.stability +
		weights.level +
		weights.framing +
		weights.lighting +
		weights.aesthetic;

	if (totalWeight === 0) {
		return 0;
	}

	const weightedSum =
		subScores.stability * weights.stability +
		subScores.level * weights.level +
		subScores.framing * weights.framing +
		subScores.lighting * weights.lighting +
		subScores.aesthetic * weights.aesthetic;

	return Math.round(weightedSum / totalWeight);
}

/**
 * Main pure function to compute shot-readiness score
 * Hybrid approach: rule-based subscores with optional ML aesthetic model
 *
 * @param signals - Input signals from sensors and analysis
 * @param modelOutput - Optional ML model output for hybrid scoring
 * @param weights - Optional custom weights
 * @param autoCaptureThreshold - Threshold for auto-capture (default 80)
 * @returns Complete score result with breakdown
 */
export function computeScore(
	signals: ScoreSignals,
	modelOutput?: MLModelOutput,
	weights?: ScoreWeights,
	autoCaptureThreshold: number = 80,
): ScoreResult {
	// Calculate individual subscores
	const stabilityScore = computeStabilityScore(
		signals.isStable,
		signals.stability,
	);
	const levelScore = computeLevelScore(signals.isLevel, signals.rollDeviation);
	const framingScore = computeFramingScore(
		signals.faceFramingEnabled,
		signals.framingGuidance,
		signals.faceAreaPercent,
	);
	const lightingScore = computeLightingScore(
		signals.lightingAnalysisEnabled,
		signals.lightingClass,
	);

	// Determine if ML model is available and usable
	const hasValidModel =
		modelOutput &&
		modelOutput.confidence > 0.5 &&
		!Number.isNaN(modelOutput.aestheticScore);

	// Calculate aesthetic score
	const aestheticScore = hasValidModel
		? normalizeAestheticScore(modelOutput.aestheticScore)
		: 0;

	// Build subscores object
	const subScores: SubScores = {
		stability: Math.round(stabilityScore),
		level: Math.round(levelScore),
		framing: Math.round(framingScore),
		lighting: Math.round(lightingScore),
		aesthetic: Math.round(aestheticScore),
	};

	// Determine scoring method and weights
	let method: ScoreResult["method"];
	let finalWeights: ScoreWeights;

	if (hasValidModel && weights) {
		// Custom weights with ML
		method = "hybrid";
		finalWeights = weights;
	} else if (hasValidModel) {
		// Default hybrid weights
		method = "hybrid";
		finalWeights = DEFAULT_HYBRID_WEIGHTS;
	} else if (weights && !hasValidModel) {
		// Custom weights without ML (aesthetic must be 0)
		method = "rules-only";
		finalWeights = { ...weights, aesthetic: 0 };
	} else {
		// Default rules-only
		method = "rules-only";
		finalWeights = DEFAULT_RULES_WEIGHTS;
	}

	// Calculate final score
	const score = computeWeightedScore(subScores, finalWeights);

	// Find weakest subscore
	const weakestSubscore = findWeakestSubscore(subScores);

	// Check if meets auto-capture threshold
	const meetsThreshold = score >= autoCaptureThreshold;

	return {
		score,
		subScores,
		weakestSubscore,
		meetsThreshold,
		method,
	};
}

/**
 * Get score breakdown message showing weakest area
 * @param result - Score result from computeScore
 * @returns Human-readable breakdown message
 */
export function getScoreBreakdown(result: ScoreResult): string {
	const { subScores, weakestSubscore, score } = result;

	if (score >= SCORE_THRESHOLDS.GOOD) {
		return "Great shot! All conditions look good.";
	}

	const weakestLabel = getSubscoreLabel(weakestSubscore);
	const weakestValue = subScores[weakestSubscore];

	if (weakestValue < SCORE_THRESHOLDS.POOR) {
		return `${weakestLabel} needs significant improvement (${weakestValue}/100)`;
	}

	return `${weakestLabel} could be better (${weakestValue}/100)`;
}

/** Target update frequency in Hz (10 Hz = 100ms updates) */
export const TARGET_SCORE_FPS = 10;

/** Update interval in milliseconds */
export const SCORE_UPDATE_INTERVAL_MS = 1000 / TARGET_SCORE_FPS;
