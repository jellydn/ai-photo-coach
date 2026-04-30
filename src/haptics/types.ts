/**
 * Haptic feedback types and constants
 *
 * Provides type definitions for haptic feedback system with
 * cross-platform iOS/Android support and rate limiting.
 */

/**
 * Haptic feedback intensity levels
 */
export type HapticIntensity =
	| "light"
	| "medium"
	| "heavy"
	| "success"
	| "error";

/**
 * Haptic feedback event types for semantic feedback
 */
export type HapticEvent = "ready" | "capture" | "countdown" | "error";

/**
 * Configuration options for haptic feedback
 */
export interface HapticOptions {
	/** Whether haptic feedback is enabled (default: true) */
	enabled: boolean;
	/** Rate limit in milliseconds between identical events (default: 1500ms) */
	rateLimitMs: number;
}

/**
 * Rate limiting state tracking
 */
export interface HapticRateLimitState {
	/** Timestamp of last haptic for each event type */
	lastHapticTimestamps: Map<string, number>;
}

/**
 * Default rate limit in milliseconds (1.5 seconds)
 * Prevents haptic spam for identical events
 */
export const DEFAULT_HAPTIC_RATE_LIMIT_MS = 1500;

/**
 * Default haptic options
 */
export const DEFAULT_HAPTIC_OPTIONS: HapticOptions = {
	enabled: true,
	rateLimitMs: DEFAULT_HAPTIC_RATE_LIMIT_MS,
};

/**
 * Maps event types to their haptic intensities
 */
export const EVENT_HAPTIC_MAP: Record<HapticEvent, HapticIntensity> = {
	ready: "light",
	capture: "medium",
	countdown: "light",
	error: "error",
};

/**
 * Haptic feedback trigger function type
 */
export type HapticTrigger = (intensity: HapticIntensity) => void;

/**
 * Haptic feedback state with rate limiting
 */
export interface HapticState {
	/** Whether haptic feedback is currently enabled */
	enabled: boolean;
	/** Trigger haptic feedback with rate limiting */
	trigger: (event: HapticEvent) => boolean;
	/** Update enabled state */
	setEnabled: (enabled: boolean) => void;
}
