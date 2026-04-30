/**
 * Haptic feedback module
 *
 * Cross-platform haptic feedback with iOS/Android fallbacks.
 * Uses React Native's built-in Vibration API as the baseline,
 * with platform-specific enhancements where available.
 *
 * Features:
 * - Rate limiting to prevent haptic spam (default 1.5s between identical events)
 * - Settings toggle support via MMKV
 * - Semantic event types mapped to appropriate intensities
 * - Graceful fallbacks when native haptics unavailable
 */

import { Vibration } from "react-native";
import {
	DEFAULT_HAPTIC_OPTIONS,
	DEFAULT_HAPTIC_RATE_LIMIT_MS,
	EVENT_HAPTIC_MAP,
	type HapticEvent,
	type HapticIntensity,
	type HapticOptions,
} from "./types";

// Module-level state for rate limiting
const lastHapticTimestamps = new Map<string, number>();

/**
 * Check if a haptic event should be rate-limited
 * @param event - The haptic event type
 * @param rateLimitMs - Rate limit in milliseconds
 * @returns true if haptic should be allowed, false if rate-limited
 */
export function shouldTriggerHaptic(
	event: HapticEvent,
	rateLimitMs: number = DEFAULT_HAPTIC_RATE_LIMIT_MS,
): boolean {
	const now = Date.now();
	const lastTimestamp = lastHapticTimestamps.get(event);

	if (lastTimestamp === undefined) {
		// First time this event type - allow it
		lastHapticTimestamps.set(event, now);
		return true;
	}

	const timeSinceLast = now - lastTimestamp;
	if (timeSinceLast >= rateLimitMs) {
		// Enough time has passed - allow and update timestamp
		lastHapticTimestamps.set(event, now);
		return true;
	}

	// Rate limited - too soon since last trigger
	return false;
}

/**
 * Clear all rate limiting state (useful for testing)
 */
export function clearHapticRateLimits(): void {
	lastHapticTimestamps.clear();
}

/**
 * Get time since last haptic of a specific event type
 * @param event - The haptic event type
 * @returns Time in milliseconds, or Infinity if never triggered
 */
export function getTimeSinceLastHaptic(event: HapticEvent): number {
	const lastTimestamp = lastHapticTimestamps.get(event);
	if (lastTimestamp === undefined) {
		return Infinity;
	}
	return Date.now() - lastTimestamp;
}

/**
 * Trigger raw haptic feedback with specified intensity
 * Uses Vibration API as cross-platform fallback
 * @param intensity - The intensity level to trigger
 */
export function triggerHaptic(intensity: HapticIntensity): void {
	// Map intensity to vibration pattern
	// Pattern: [delay, duration, delay, duration, ...]
	switch (intensity) {
		case "light":
			// Short single pulse: 10ms vibration
			Vibration.vibrate(10);
			break;
		case "medium":
			// Medium single pulse: 25ms vibration
			Vibration.vibrate(25);
			break;
		case "heavy":
			// Strong single pulse: 50ms vibration
			Vibration.vibrate(50);
			break;
		case "success":
			// Success pattern: short pulse, pause, short pulse
			Vibration.vibrate([0, 15, 50, 15]);
			break;
		case "error":
			// Error pattern: two quick pulses
			Vibration.vibrate([0, 30, 30, 30]);
			break;
		default:
			// Fallback to light
			Vibration.vibrate(10);
	}
}

/**
 * Trigger semantic haptic event with rate limiting
 * @param event - The semantic event type
 * @param options - Haptic options including enabled state and rate limiting
 * @returns true if haptic was triggered, false if disabled or rate-limited
 */
export function triggerHapticEvent(
	event: HapticEvent,
	options: Partial<HapticOptions> = {},
): boolean {
	const fullOptions = { ...DEFAULT_HAPTIC_OPTIONS, ...options };

	// Check if haptics are enabled
	if (!fullOptions.enabled) {
		return false;
	}

	// Check rate limiting
	if (!shouldTriggerHaptic(event, fullOptions.rateLimitMs)) {
		return false;
	}

	// Map event to intensity and trigger
	const intensity = EVENT_HAPTIC_MAP[event];
	triggerHaptic(intensity);

	return true;
}

// Re-export types
export type {
	HapticEvent,
	HapticIntensity,
	HapticOptions,
	HapticRateLimitState,
	HapticState,
} from "./types";
export {
	DEFAULT_HAPTIC_OPTIONS,
	DEFAULT_HAPTIC_RATE_LIMIT_MS,
	EVENT_HAPTIC_MAP,
} from "./types";
