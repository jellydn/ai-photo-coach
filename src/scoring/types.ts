/**
 * Scoring engine - Core type definitions
 * 
 * NOTE: This file previously contained all scoring logic. It has been refactored
 * into focused modules:
 * - types.ts - Core interfaces (this file)
 * - weights.ts - Mode-specific scoring weights and thresholds
 * - algorithms.ts - Pure scoring functions (computeScore, computeStabilityScore, etc.)
 * - labels.ts - UI helpers (getSubscoreLabel, getScoreColor, etc.)
 * 
 * For backward compatibility, all exports are re-exported from here.
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
	/** Pitch angle in degrees (-90 = camera pointing down, for food mode) */
	pitch?: number;
	/** Whether flat-lay detection is enabled (food mode) */
	flatLayEnabled?: boolean;
	/** Whether group framing is enabled (group photo mode) */
	groupFramingEnabled?: boolean;
	/** Number of faces detected (for group mode) */
	faceCount?: number;
	/** Total combined face area percentage (for group mode) */
	totalFaceAreaPercent?: number;
	/** Number of faces touching frame edge (for group mode) */
	edgeTouchingFaceCount?: number;
	/** Whether centering detection is enabled (product mode) */
	centeringEnabled?: boolean;
	/** Subject centroid X position (0-1, 0.5 = center) for product mode */
	subjectCentroidX?: number;
	/** Subject centroid Y position (0-1, 0.5 = center) for product mode */
	subjectCentroidY?: number;
	/** Background luminance variance for product mode (higher = more cluttered) */
	backgroundVariance?: number;
	/** Whether document skew detection is enabled (document mode) */
	documentSkewEnabled?: boolean;
	/** Detected document skew angle in degrees (0 = perfectly flat/aligned) */
	documentSkewAngle?: number;
	/** Whether detected edges form parallel pairs (true = good document alignment) */
	isDocumentFlat?: boolean;
	/** Whether pet/kids mode is enabled (fast subjects) */
	petKidsModeEnabled?: boolean;
	/** Whether night shot mode is enabled (low-light conditions) */
	nightModeEnabled?: boolean;
	/** Mean luminance value (0-255) for low-light stability scoring */
	meanLuminance?: number;
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
	/** Flat-lay score for food mode (0-100, 100 = perfect top-down angle) */
	flatLay: number;
	/** Group framing score for group photo mode (0-100, penalizes edge-touching faces) */
	groupFraming: number;
	/** Centering score for product mode (0-100, higher when subject centered) */
	centering: number;
	/** Document skew score for document mode (0-100, higher when less skewed) */
	documentSkew: number;
	/** Low-light stability score for night mode (0-100, penalizes movement in dark scenes) */
	lowLightStability: number;
}

/**
 * Result of score calculation
 */
export interface ScoreResult {
	/** Overall weighted score (0-100) */
	score: number;
	/** Individual component scores */
	subScores: SubScores;
	/** Which subscore is lowest (for guidance) */
	weakestSubscore: keyof SubScores;
	/** Human-readable label for weakest subscore */
	weakestSubscoreLabel: string;
	/** Scoring method used */
	method: "rules-only" | "hybrid";
	/** Whether score meets auto-capture threshold */
	meetsThreshold: boolean;
}

/**
 * Weights for combining subscores into overall score
 */
export interface ScoreWeights {
	/** Weight for stability score (0-1) */
	stability: number;
	/** Weight for level score (0-1) */
	level: number;
	/** Weight for framing score (0-1) */
	framing: number;
	/** Weight for lighting score (0-1) */
	lighting: number;
	/** Weight for aesthetic/ML score (0-1) */
	aesthetic: number;
	/** Weight for flat-lay score in food mode (0-1) */
	flatLay: number;
	/** Weight for group framing score in group mode (0-1) */
	groupFraming: number;
	/** Weight for centering score in product mode (0-1) */
	centering: number;
	/** Weight for document skew score in document mode (0-1) */
	documentSkew: number;
	/** Weight for low-light stability in night mode (0-1) */
	lowLightStability: number;
}

// =============================================================================
// Backward-compatible re-exports from refactored modules
// =============================================================================

// Re-export from weights.ts
export {
	BACKGROUND_VARIANCE_THRESHOLD,
	DEFAULT_HYBRID_WEIGHTS,
	DEFAULT_RULES_WEIGHTS,
	DOCUMENT_MODE_WEIGHTS,
	FOOD_MODE_WEIGHTS,
	GROUP_MODE_WEIGHTS,
	LOW_LIGHT_LUMINANCE_THRESHOLD,
	MAX_CENTERING_DEVIATION,
	MAX_DOCUMENT_SKEW_ANGLE,
	MAX_FACE_AREA_DEVIATION,
	MAX_ROLL_DEVIATION,
	NIGHT_MODE_WEIGHTS,
	PET_KIDS_MODE_WEIGHTS,
	PRODUCT_MODE_WEIGHTS,
	SCORE_THRESHOLDS,
	SCORE_UPDATE_INTERVAL_MS,
	TARGET_FACE_AREA_PCT,
	TARGET_SCORE_FPS,
} from "./weights";

// Re-export from algorithms.ts
export {
	computeCenteringScore,
	computeDocumentSkewScore,
	computeFlatLayScore,
	computeFramingScore,
	computeGroupFramingScore,
	computeLevelScore,
	computeLightingScore,
	computeLowLightStabilityScore,
	computeScore,
	computeStabilityScore,
	computeWeightedScore,
	findWeakestSubscore,
	isBackgroundCluttered,
	normalizeAestheticScore,
} from "./algorithms";

// Re-export from labels.ts
export {
	getScoreBreakdown,
	getScoreColor,
	getSubscoreLabel,
} from "./labels";
