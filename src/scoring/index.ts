/**
 * Scoring module
 * Shot-readiness score calculation and UI components
 */

// Components
export { ScoreRing } from "./ScoreRing";
export type { ScoreRingProps } from "./ScoreRing";

// Hooks
export { useScoring, SCORE_UPDATE_INTERVAL_MS as SCORE_UPDATE_MS } from "./useScoring";
export type { UseScoringProps, UseScoringResult } from "./useScoring";

// Core types
export type {
	MLModelOutput,
	ScoreResult,
	ScoreSignals,
	ScoreWeights,
	SubScores,
} from "./types";

// Scoring algorithms (pure functions)
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

// Scoring weights and thresholds
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

// UI labels and colors
export {
	getScoreBreakdown,
	getScoreColor,
	getSubscoreLabel,
} from "./labels";
