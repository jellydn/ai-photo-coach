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

	/** Whether to show horizon level indicator */
	showHorizon: boolean;

	/** Whether lighting analysis is enabled for this mode */
	lightingAnalysis: boolean;

	/** Mean luminance threshold below which scene is considered too dark (0-255) */
	lightingTooDarkThreshold: number;

	/** Mean luminance threshold above which scene is considered too bright (0-255) */
	lightingTooBrightThreshold: number;

	/** Backlit ratio threshold - face brightness / background brightness */
	lightingBacklitThreshold: number;

	/** Whether edge detection (dominant lines) is enabled for Travel mode scenery framing */
	edgeDetection: boolean;
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
		showHorizon: true,
		lightingAnalysis: true,
		lightingTooDarkThreshold: 40,
		lightingTooBrightThreshold: 220,
		lightingBacklitThreshold: 0.6,
		edgeDetection: false,
	},
	food: {
		autoCaptureScore: 75,
		faceMinAreaPct: 0,
		faceMaxAreaPct: 0,
		stabilityThreshold: 0.03,
		horizonToleranceDeg: 3,
		enabled: true,
		showOverlays: true,
		faceFraming: false,
		showHorizon: true,
		lightingAnalysis: true,
		lightingTooDarkThreshold: 35,
		lightingTooBrightThreshold: 230,
		lightingBacklitThreshold: 0.6,
		edgeDetection: false,
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
		showHorizon: true,
		lightingAnalysis: true,
		lightingTooDarkThreshold: 30, // More tolerant for outdoor
		lightingTooBrightThreshold: 240,
		lightingBacklitThreshold: 0.5,
		edgeDetection: true, // Enable dominant line detection for scenery framing
	},
	group: {
		autoCaptureScore: 80,
		faceMinAreaPct: 10,
		faceMaxAreaPct: 50,
		stabilityThreshold: 0.03,
		horizonToleranceDeg: 3,
		enabled: true,
		showOverlays: true,
		faceFraming: true,
		showHorizon: true,
		lightingAnalysis: true,
		lightingTooDarkThreshold: 40,
		lightingTooBrightThreshold: 220,
		lightingBacklitThreshold: 0.6,
		edgeDetection: false,
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
		showHorizon: true,
		lightingAnalysis: true,
		lightingTooDarkThreshold: 45,
		lightingTooBrightThreshold: 210,
		lightingBacklitThreshold: 0.6,
		edgeDetection: false,
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
		showHorizon: true,
		lightingAnalysis: true,
		lightingTooDarkThreshold: 50,
		lightingTooBrightThreshold: 200,
		lightingBacklitThreshold: 0.6,
		edgeDetection: false,
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
		showHorizon: true,
		lightingAnalysis: true,
		lightingTooDarkThreshold: 35,
		lightingTooBrightThreshold: 230,
		lightingBacklitThreshold: 0.6,
		edgeDetection: false,
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
		showHorizon: true,
		lightingAnalysis: true,
		lightingTooDarkThreshold: 25, // Lower threshold for night mode
		lightingTooBrightThreshold: 180, // Artificial lights can be bright
		lightingBacklitThreshold: 0.5,
		edgeDetection: false,
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
