/**
 * Scoring module
 * Shot-readiness score calculation and UI components
 */

export type { ScoreRingProps } from "./ScoreRing";
// Components
export { ScoreRing } from "./ScoreRing";
export type {
	MLModelOutput,
	ScoreResult,
	ScoreSignals,
	ScoreWeights,
	SubScores,
} from "./types";
// Types and pure functions
export {
	computeFramingScore,
	computeLevelScore,
	computeLightingScore,
	computeScore,
	computeStabilityScore,
	computeWeightedScore,
	DEFAULT_HYBRID_WEIGHTS,
	DEFAULT_RULES_WEIGHTS,
	findWeakestSubscore,
	getScoreBreakdown,
	getScoreColor,
	getSubscoreLabel,
	MAX_FACE_AREA_DEVIATION,
	MAX_ROLL_DEVIATION,
	normalizeAestheticScore,
	SCORE_THRESHOLDS,
	SCORE_UPDATE_INTERVAL_MS,
	TARGET_FACE_AREA_PCT,
	TARGET_SCORE_FPS,
} from "./types";
export type {
	UseScoringProps,
	UseScoringResult,
} from "./useScoring";
// Hook
export {
	SCORE_UPDATE_INTERVAL_MS as SCORE_UPDATE_MS,
	useScoring,
} from "./useScoring";
