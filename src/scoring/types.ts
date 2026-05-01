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
	/** Weight for flat-lay score in food mode (default 0.25) */
	flatLay: number;
	/** Weight for group framing score in group mode (default 0.25) */
	groupFraming: number;
	/** Weight for centering score in product mode (default 0.25) */
	centering: number;
	/** Weight for document skew score in document mode (default 0.30) */
	documentSkew: number;
	/** Weight for low-light stability score in night mode (default 0.30) */
	lowLightStability: number;
}

/** Default scoring weights for rules-only mode */
export const DEFAULT_RULES_WEIGHTS: ScoreWeights = {
	stability: 0.25,
	level: 0.2,
	framing: 0.25,
	lighting: 0.3,
	aesthetic: 0, // No aesthetic in rules-only
	flatLay: 0, // No flat-lay unless enabled
	groupFraming: 0, // No group framing unless enabled
	centering: 0, // No centering unless enabled
	documentSkew: 0, // No document skew unless enabled
	lowLightStability: 0, // No low-light stability unless in night mode
};

/** Default scoring weights for hybrid mode (with ML model) */
export const DEFAULT_HYBRID_WEIGHTS: ScoreWeights = {
	stability: 0.15,
	level: 0.1,
	framing: 0.15,
	lighting: 0.2,
	aesthetic: 0.15,
	flatLay: 0.25, // Include flat-lay weight for food mode
	groupFraming: 0, // No group framing unless in group mode
	centering: 0, // No centering unless in product mode
	documentSkew: 0, // No document skew unless in document mode
	lowLightStability: 0, // No low-light stability unless in night mode
};

/** Food mode scoring weights with flat-lay emphasis */
export const FOOD_MODE_WEIGHTS: ScoreWeights = {
	stability: 0.2,
	level: 0.1,
	framing: 0.15,
	lighting: 0.2,
	aesthetic: 0.1,
	flatLay: 0.25, // Emphasize flat-lay for food photography
	groupFraming: 0, // No group framing in food mode
	centering: 0, // No centering in food mode
	documentSkew: 0, // No document skew in food mode
	lowLightStability: 0, // No low-light stability in food mode
};

/** Group photo mode scoring weights with group framing emphasis */
export const GROUP_MODE_WEIGHTS: ScoreWeights = {
	stability: 0.2,
	level: 0.15,
	framing: 0.15, // Individual face framing less important
	lighting: 0.15,
	aesthetic: 0.1,
	flatLay: 0,
	groupFraming: 0.25, // Emphasize group framing for group photos
	centering: 0, // No centering in group mode
	documentSkew: 0, // No document skew in group mode
	lowLightStability: 0, // No low-light stability in group mode
};

/** Product mode scoring weights with centering emphasis */
export const PRODUCT_MODE_WEIGHTS: ScoreWeights = {
	stability: 0.2,
	level: 0.1,
	framing: 0.15,
	lighting: 0.2,
	aesthetic: 0.1,
	flatLay: 0, // No flat-lay in product mode
	groupFraming: 0, // No group framing in product mode
	centering: 0.25, // Emphasize centering for product photography
	documentSkew: 0, // No document skew in product mode
	lowLightStability: 0, // No low-light stability in product mode
};

/** Document mode scoring weights with document skew emphasis */
export const DOCUMENT_MODE_WEIGHTS: ScoreWeights = {
	stability: 0.25,
	level: 0.2,
	framing: 0,
	lighting: 0.25,
	aesthetic: 0,
	flatLay: 0,
	groupFraming: 0,
	centering: 0,
	documentSkew: 0.3, // Emphasize document skew/alignment for document scanning
	lowLightStability: 0, // No low-light stability in document mode
};

/** Pet/Kids mode scoring weights emphasizing framing for fast subjects */
export const PET_KIDS_MODE_WEIGHTS: ScoreWeights = {
	stability: 0.15, // Lower stability weight (movement expected)
	level: 0.15,
	framing: 0.3, // Higher framing weight (catching the face is key)
	lighting: 0.2,
	aesthetic: 0.1,
	flatLay: 0, // No flat-lay in pet/kids mode
	groupFraming: 0, // No group framing in pet/kids mode
	centering: 0, // No centering in pet/kids mode
	documentSkew: 0, // No document skew in pet/kids mode
	lowLightStability: 0, // No low-light stability in pet/kids mode
};

/** Night Shot mode scoring weights with low-light stability emphasis */
export const NIGHT_MODE_WEIGHTS: ScoreWeights = {
	stability: 0.15, // Lower regular stability weight (use lowLightStability instead)
	level: 0.1,
	framing: 0.1,
	lighting: 0.2,
	aesthetic: 0.05,
	flatLay: 0, // No flat-lay in night mode
	groupFraming: 0, // No group framing in night mode
	centering: 0, // No centering in night mode
	documentSkew: 0, // No document skew in night mode
	lowLightStability: 0.3, // Emphasize low-light stability for night photography
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
 * Compute flat-lay subscore (0-100) for food mode
 * @param flatLayEnabled - Whether flat-lay detection is enabled
 * @param pitch - Pitch angle in degrees (+90 = perfect flat-lay)
 * @returns Score 0-100 (100 = perfect top-down angle at +90°)
 */
export function computeFlatLayScore(
	flatLayEnabled: boolean,
	pitch: number,
): number {
	if (!flatLayEnabled) {
		// If flat-lay not enabled, give perfect score (doesn't affect overall score)
		return 100;
	}

	// Target pitch is +90° (camera pointing straight down)
	const targetPitch = 90;
	const maxDeviation = 45; // Zero score at 45° deviation

	const deviation = Math.abs(pitch - targetPitch);

	if (deviation <= 15) {
		return 100; // Perfect flat-lay within 15°
	}

	// Linear falloff from 100 at 15° to 0 at 45°
	return Math.max(0, Math.round(100 - (deviation / maxDeviation) * 100));
}

/**
 * Compute group framing subscore (0-100) for group photo mode
 * @param groupFramingEnabled - Whether group framing is enabled
 * @param faceCount - Number of faces detected
 * @param totalFaceAreaPercent - Total combined face area percentage
 * @param edgeTouchingCount - Number of faces touching frame edge
 * @returns Score 0-100 (100 = perfect group framing)
 */
export function computeGroupFramingScore(
	groupFramingEnabled: boolean,
	faceCount: number,
	totalFaceAreaPercent: number,
	edgeTouchingCount: number,
): number {
	if (!groupFramingEnabled) {
		// If group framing not enabled, give perfect score
		return 100;
	}

	// Require at least 2 faces for a group photo
	if (faceCount < 2) {
		return 50; // Penalty for not enough faces
	}

	let score = 100;

	// Penalize edge-touching faces (major issue)
	if (edgeTouchingCount > 0) {
		// Each edge-touching face reduces score significantly
		score -= edgeTouchingCount * 25;
	}

	// Penalize total face area issues
	const MIN_AREA = 8; // Below 8% = too far
	const MAX_AREA = 70; // Above 70% = too close
	const TARGET_AREA = 35; // Ideal total face area

	if (totalFaceAreaPercent < MIN_AREA) {
		// Too far - moderate penalty
		const areaDiff = MIN_AREA - totalFaceAreaPercent;
		score -= Math.min(30, areaDiff * 2);
	} else if (totalFaceAreaPercent > MAX_AREA) {
		// Too close - significant penalty
		const areaDiff = totalFaceAreaPercent - MAX_AREA;
		score -= Math.min(40, areaDiff);
	} else {
		// Within valid range - slight bonus for being close to target
		const deviation = Math.abs(totalFaceAreaPercent - TARGET_AREA);
		if (deviation <= 10) {
			score = Math.min(100, score + 5); // Small bonus for optimal area
		}
	}

	return Math.max(0, Math.round(score));
}

/** Maximum distance from center for perfect centering score (normalized 0-1) */
export const MAX_CENTERING_DEVIATION = 0.2; // 20% from center

/** Background variance threshold for cluttered background detection */
export const BACKGROUND_VARIANCE_THRESHOLD = 0.15;

/** Maximum skew angle for perfect document score (degrees) */
export const MAX_DOCUMENT_SKEW_ANGLE = 10;

/** Maximum pitch deviation for document mode level prompt (degrees from straight-down) */
export const MAX_DOCUMENT_PITCH_DEVIATION = 10;

/**
 * Compute centering subscore (0-100) for product mode
 * @param centeringEnabled - Whether centering detection is enabled
 * @param subjectCentroidX - Subject centroid X position (0-1, 0.5 = center)
 * @param subjectCentroidY - Subject centroid Y position (0-1, 0.5 = center)
 * @param backgroundVariance - Background luminance variance (0-1, higher = more cluttered)
 * @returns Score 0-100 (100 = perfectly centered with clean background)
 */
export function computeCenteringScore(
	centeringEnabled: boolean,
	subjectCentroidX: number,
	subjectCentroidY: number,
	backgroundVariance: number,
): number {
	if (!centeringEnabled) {
		// If centering not enabled, give perfect score
		return 100;
	}

	// Calculate distance from center
	const dx = subjectCentroidX - 0.5;
	const dy = subjectCentroidY - 0.5;
	const distance = Math.sqrt(dx * dx + dy * dy);

	// Score based on centering distance
	let centeringScore: number;
	if (distance <= 0.05) {
		// Within 5% of center - perfect
		centeringScore = 100;
	} else if (distance >= MAX_CENTERING_DEVIATION) {
		// Too far from center (>20%)
		centeringScore = 30;
	} else {
		// Linear falloff from 100 at 5% to 30 at 20%
		const t = (distance - 0.05) / (MAX_CENTERING_DEVIATION - 0.05);
		centeringScore = Math.round(100 - t * 70);
	}

	// Penalize cluttered background based on variance
	if (backgroundVariance > BACKGROUND_VARIANCE_THRESHOLD) {
		// High variance = cluttered background
		const clutterPenalty = Math.min(30, (backgroundVariance - 0.15) * 100);
		centeringScore -= clutterPenalty;
	}

	return Math.max(0, Math.round(centeringScore));
}

/**
 * Compute document skew subscore (0-100) for document mode
 * @param documentSkewEnabled - Whether document skew detection is enabled
 * @param skewAngle - Detected skew angle in degrees (0 = perfectly aligned)
 * @param isFlat - Whether document edges form parallel pairs (flat capture)
 * @returns Score 0-100 (100 = perfectly flat document with parallel edges)
 */
export function computeDocumentSkewScore(
	documentSkewEnabled: boolean,
	skewAngle: number,
	isFlat: boolean,
): number {
	if (!documentSkewEnabled) {
		// If document skew not enabled, give perfect score
		return 100;
	}

	// If document is not flat (edges not parallel), significant penalty
	if (!isFlat) {
		return 40; // Major penalty for skewed/perspective distortion
	}

	// Calculate score based on skew angle
	const absSkew = Math.abs(skewAngle);

	if (absSkew <= 2) {
		return 100; // Perfect alignment within 2°
	}

	if (absSkew >= MAX_DOCUMENT_SKEW_ANGLE) {
		return 30; // Too much skew (>10°)
	}

	// Linear falloff from 100 at 2° to 30 at 10°
	const t = (absSkew - 2) / (MAX_DOCUMENT_SKEW_ANGLE - 2);
	return Math.round(100 - t * 70);
}

/** Threshold for low-light scene detection (mean luminance below this is considered dark) */
export const LOW_LIGHT_LUMINANCE_THRESHOLD = 60;

/**
 * Compute low-light stability subscore (0-100) for night mode
 * More heavily penalizes movement when scene is dark
 * @param nightModeEnabled - Whether night mode is enabled
 * @param isStable - Whether device is currently stable
 * @param stability - Stability variance value (0-1)
 * @param meanLuminance - Mean luminance of scene (0-255, lower = darker)
 * @returns Score 0-100 (100 = stable in dark conditions)
 */
export function computeLowLightStabilityScore(
	nightModeEnabled: boolean,
	isStable: boolean,
	stability: number,
	meanLuminance: number,
): number {
	if (!nightModeEnabled) {
		// If night mode not enabled, give perfect score (doesn't affect overall score)
		return 100;
	}

	// Check if scene is dark (low light)
	const isDarkScene = meanLuminance < LOW_LIGHT_LUMINANCE_THRESHOLD;

	if (!isDarkScene) {
		// In well-lit conditions, use regular stability scoring
		return isStable ? 100 : Math.max(0, 100 - stability * 2000);
	}

	// Dark scene - more heavily penalize instability
	if (isStable) {
		return 100; // Perfect if stable even in dark
	}

	// More aggressive penalty in dark conditions (2x the regular penalty)
	const darkStabilityPenalty = stability * 4000;
	return Math.max(0, 100 - darkStabilityPenalty);
}

/**
 * Check if background is cluttered based on luminance variance
 * @param backgroundVariance - Background luminance variance (0-1)
 * @returns true if background is cluttered (variance above threshold)
 */
export function isBackgroundCluttered(backgroundVariance: number): boolean {
	return backgroundVariance > BACKGROUND_VARIANCE_THRESHOLD;
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
		flatLay: "Flat-Lay Angle",
		groupFraming: "Group Framing",
		centering: "Subject Centering",
		documentSkew: "Document Alignment",
		lowLightStability: "Low-Light Stability",
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
		weights.aesthetic +
		weights.flatLay +
		weights.groupFraming +
		weights.centering +
		weights.documentSkew +
		weights.lowLightStability;

	if (totalWeight === 0) {
		return 0;
	}

	const weightedSum =
		subScores.stability * weights.stability +
		subScores.level * weights.level +
		subScores.framing * weights.framing +
		subScores.lighting * weights.lighting +
		subScores.aesthetic * weights.aesthetic +
		subScores.flatLay * weights.flatLay +
		subScores.groupFraming * weights.groupFraming +
		subScores.centering * weights.centering +
		subScores.documentSkew * weights.documentSkew +
		subScores.lowLightStability * weights.lowLightStability;

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
	const flatLayScore = computeFlatLayScore(
		signals.flatLayEnabled ?? false,
		signals.pitch ?? 0,
	);
	const groupFramingScore = computeGroupFramingScore(
		signals.groupFramingEnabled ?? false,
		signals.faceCount ?? 0,
		signals.totalFaceAreaPercent ?? 0,
		signals.edgeTouchingFaceCount ?? 0,
	);
	const centeringScore = computeCenteringScore(
		signals.centeringEnabled ?? false,
		signals.subjectCentroidX ?? 0.5,
		signals.subjectCentroidY ?? 0.5,
		signals.backgroundVariance ?? 0,
	);
	const documentSkewScore = computeDocumentSkewScore(
		signals.documentSkewEnabled ?? false,
		signals.documentSkewAngle ?? 0,
		signals.isDocumentFlat ?? true,
	);
	const lowLightStabilityScore = computeLowLightStabilityScore(
		signals.nightModeEnabled ?? false,
		signals.isStable,
		signals.stability,
		signals.meanLuminance ?? 128,
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
		flatLay: Math.round(flatLayScore),
		groupFraming: Math.round(groupFramingScore),
		centering: Math.round(centeringScore),
		documentSkew: Math.round(documentSkewScore),
		lowLightStability: Math.round(lowLightStabilityScore),
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
	} else if (signals.groupFramingEnabled) {
		// Group photo mode - use group framing weights
		method = "rules-only";
		finalWeights = GROUP_MODE_WEIGHTS;
	} else if (signals.flatLayEnabled) {
		// Food mode - use flat-lay weights
		method = "rules-only";
		finalWeights = FOOD_MODE_WEIGHTS;
	} else if (signals.centeringEnabled) {
		// Product mode - use centering weights
		method = "rules-only";
		finalWeights = PRODUCT_MODE_WEIGHTS;
	} else if (signals.documentSkewEnabled) {
		// Document mode - use document skew weights
		method = "rules-only";
		finalWeights = DOCUMENT_MODE_WEIGHTS;
	} else if (signals.petKidsModeEnabled) {
		// Pet/Kids mode - use pet/kids weights (fast subjects)
		method = "rules-only";
		finalWeights = PET_KIDS_MODE_WEIGHTS;
	} else if (signals.nightModeEnabled) {
		// Night Shot mode - use night mode weights (low-light stability emphasis)
		method = "rules-only";
		finalWeights = NIGHT_MODE_WEIGHTS;
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
