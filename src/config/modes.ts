/**
 * Mode configuration module
 * Defines per-mode thresholds and settings for the AI Photo Coach
 */

/** All supported shooting modes */
export type Mode =
	| "portrait"
	| "food"
	| "travel"
	| "group"
	| "product"
	| "document"
	| "pet_kids"
	| "night";

/** All mode names */
export const MODES: Mode[] = [
	"portrait",
	"food",
	"travel",
	"group",
	"product",
	"document",
	"pet_kids",
	"night",
];

/** Configuration thresholds for each mode */
export interface ModeConfig {
	/** Score threshold (0-100) for auto-capture to trigger */
	autoCaptureScore: number;

	/** Minimum face area as percentage of frame (0-100) for framing guidance */
	faceMinAreaPct: number;

	/** Maximum face area as percentage of frame (0-100) for framing guidance */
	faceMaxAreaPct: number;

	/** Stability threshold (0-1) - lower is more strict, higher is looser */
	stabilityThreshold: number;

	/** Horizon tolerance in degrees - how far from level before prompting */
	horizonToleranceDeg: number;

	/** Whether this mode is enabled in the MVP */
	enabled: boolean;

	/** Whether to show composition overlays (rule of thirds) */
	showOverlays: boolean;

	/** Whether face detection and framing guidance is active */
	faceFraming: boolean;
}

/** Mode configuration values for all modes */
export const modeConfig: Record<Mode, ModeConfig> = {
	portrait: {
		autoCaptureScore: 80,
		faceMinAreaPct: 15,
		faceMaxAreaPct: 60,
		stabilityThreshold: 0.02,
		horizonToleranceDeg: 2,
		enabled: true,
		showOverlays: true,
		faceFraming: true,
	},
	food: {
		autoCaptureScore: 75,
		faceMinAreaPct: 0,
		faceMaxAreaPct: 0,
		stabilityThreshold: 0.03,
		horizonToleranceDeg: 3,
		enabled: false,
		showOverlays: true,
		faceFraming: false,
	},
	travel: {
		autoCaptureScore: 75,
		faceMinAreaPct: 0,
		faceMaxAreaPct: 0,
		stabilityThreshold: 0.05, // Looser for handheld landscape
		horizonToleranceDeg: 2, // Strict for horizon level
		enabled: true,
		showOverlays: true,
		faceFraming: false,
	},
	group: {
		autoCaptureScore: 80,
		faceMinAreaPct: 10,
		faceMaxAreaPct: 50,
		stabilityThreshold: 0.03,
		horizonToleranceDeg: 3,
		enabled: false,
		showOverlays: true,
		faceFraming: true,
	},
	product: {
		autoCaptureScore: 80,
		faceMinAreaPct: 0,
		faceMaxAreaPct: 0,
		stabilityThreshold: 0.02,
		horizonToleranceDeg: 2,
		enabled: false,
		showOverlays: true,
		faceFraming: false,
	},
	document: {
		autoCaptureScore: 85,
		faceMinAreaPct: 0,
		faceMaxAreaPct: 0,
		stabilityThreshold: 0.02,
		horizonToleranceDeg: 1, // Very strict for documents
		enabled: false,
		showOverlays: true,
		faceFraming: false,
	},
	pet_kids: {
		autoCaptureScore: 75,
		faceMinAreaPct: 12,
		faceMaxAreaPct: 55,
		stabilityThreshold: 0.04, // Looser for moving subjects
		horizonToleranceDeg: 4,
		enabled: false,
		showOverlays: true,
		faceFraming: true,
	},
	night: {
		autoCaptureScore: 70,
		faceMinAreaPct: 0,
		faceMaxAreaPct: 0,
		stabilityThreshold: 0.03,
		horizonToleranceDeg: 3,
		enabled: false,
		showOverlays: true,
		faceFraming: false,
	},
};

/**
 * Get the configuration for a specific mode
 * @param mode - The shooting mode
 * @returns ModeConfig for the given mode
 */
export function getModeConfig(mode: Mode): ModeConfig {
	return modeConfig[mode];
}

/**
 * Check if a mode is enabled in the current app version
 * @param mode - The shooting mode to check
 * @returns true if the mode is enabled, false otherwise
 */
export function isModeEnabled(mode: Mode): boolean {
	return modeConfig[mode].enabled;
}

/**
 * Get all enabled modes
 * @returns Array of enabled modes
 */
export function getEnabledModes(): Mode[] {
	return MODES.filter((mode) => modeConfig[mode].enabled);
}

/**
 * Get all disabled modes
 * @returns Array of disabled modes
 */
export function getDisabledModes(): Mode[] {
	return MODES.filter((mode) => !modeConfig[mode].enabled);
}
