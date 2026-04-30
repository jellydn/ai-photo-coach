/**
 * Haptics module barrel export
 *
 * Central export point for all haptic feedback functionality.
 */

export type {
	HapticEvent,
	HapticIntensity,
	HapticOptions,
	HapticRateLimitState,
	HapticState,
} from "./haptics";
export {
	clearHapticRateLimits,
	DEFAULT_HAPTIC_OPTIONS,
	DEFAULT_HAPTIC_RATE_LIMIT_MS,
	getTimeSinceLastHaptic,
	shouldTriggerHaptic,
	triggerHaptic,
	triggerHapticEvent,
} from "./haptics";
export type { UseHapticsProps, UseHapticsReturn } from "./useHaptics";
export { useHaptics } from "./useHaptics";
