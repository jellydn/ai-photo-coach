/**
 * Scoring weights and thresholds - Mode-specific configuration
 */

import type { ScoreWeights } from "./types";

/**
 * Default scoring weights for rules-based mode (without ML model)
 */
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

/**
 * Default scoring weights for hybrid mode (with ML model)
 */
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

/**
 * Food mode scoring weights with flat-lay emphasis
 */
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

/**
 * Group photo mode scoring weights with group framing emphasis
 */
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

/**
 * Product mode scoring weights with centering emphasis
 */
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

/**
 * Document mode scoring weights with document skew emphasis
 */
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

/**
 * Pet/Kids mode scoring weights emphasizing framing for fast subjects
 */
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

/**
 * Night Shot mode scoring weights with low-light stability emphasis
 */
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

/**
 * Score thresholds for visual indicator
 */
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

/** Maximum face area deviation before significant penalty (percentage points) */
export const MAX_FACE_AREA_DEVIATION = 25;

/** Maximum distance from center for perfect centering score (normalized 0-1) */
export const MAX_CENTERING_DEVIATION = 0.2; // 20% from center

/** Background variance threshold for cluttered detection */
export const BACKGROUND_VARIANCE_THRESHOLD = 0.15;

/** Maximum document skew angle before significant penalty (degrees) */
export const MAX_DOCUMENT_SKEW_ANGLE = 10;

/** Maximum pitch deviation for document flat-lay (degrees from straight-down) */
export const MAX_DOCUMENT_PITCH_DEVIATION = 10;

/** Low-light luminance threshold for night mode (0-255) */
export const LOW_LIGHT_LUMINANCE_THRESHOLD = 60;

/** Target update frequency in Hz (10 Hz = 100ms updates) */
export const TARGET_SCORE_FPS = 10;

/** Score update interval in milliseconds */
export const SCORE_UPDATE_INTERVAL_MS = 1000 / TARGET_SCORE_FPS;
