/**
 * useHaptics hook
 *
 * React hook for reactive haptic feedback with automatic rate limiting
 * and settings integration.
 *
 * Features:
 * - Automatic haptic triggering based on state changes
 * - Rate limiting per event type (default 1.5s between identical events)
 * - Settings integration via MMKV
 * - Ready-cue haptic when score crosses threshold
 * - Capture-confirm haptic on photo capture
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	clearHapticRateLimits,
	DEFAULT_HAPTIC_RATE_LIMIT_MS,
	type HapticEvent,
	triggerHapticEvent,
} from "./index";

/**
 * Props for useHaptics hook
 */
export interface UseHapticsProps {
	/** Whether haptic feedback is globally enabled (from settings) */
	enabled: boolean;
	/** Current shot readiness score (0-100) */
	score: number;
	/** Whether phone is stable */
	isStable: boolean;
	/** Auto-capture threshold from mode config */
	autoCaptureThreshold: number;
	/** Rate limit in milliseconds (default: 1500) */
	rateLimitMs?: number;
}

/**
 * Return type for useHaptics hook
 */
export interface UseHapticsReturn {
	/** Whether haptics are currently enabled */
	enabled: boolean;
	/** Manually trigger a haptic event (respects rate limiting) */
	trigger: (event: HapticEvent) => boolean;
	/** Trigger capture haptic (call when photo is captured) */
	triggerCapture: () => boolean;
}

/**
 * React hook for haptic feedback with reactive triggers
 *
 * Automatically triggers:
 * - "ready" haptic when score crosses from below to above threshold AND isStable
 * - Can manually trigger capture haptic via triggerCapture()
 *
 * @param props - Hook configuration props
 * @returns Haptic controls and state
 */
export function useHaptics({
	enabled,
	score,
	isStable,
	autoCaptureThreshold,
	rateLimitMs = DEFAULT_HAPTIC_RATE_LIMIT_MS,
}: UseHapticsProps): UseHapticsReturn {
	// Track previous score and stable state for threshold crossing detection
	const prevScoreRef = useRef(score);
	const prevStableRef = useRef(isStable);
	const hasTriggeredReadyRef = useRef(false);

	// Local enabled state (can be controlled independently of global setting)
	const [localEnabled, setLocalEnabled] = useState(enabled);

	// Update local enabled when prop changes
	useEffect(() => {
		setLocalEnabled(enabled);
	}, [enabled]);

	// Reset ready trigger state when conditions reset (score drops or becomes unstable)
	useEffect(() => {
		if (score < autoCaptureThreshold || !isStable) {
			hasTriggeredReadyRef.current = false;
		}
	}, [score, isStable, autoCaptureThreshold]);

	// Watch for score crossing threshold with stability
	useEffect(() => {
		const prevScore = prevScoreRef.current;
		const prevStable = prevStableRef.current;

		// Check for threshold crossing: score goes from < threshold to >= threshold
		const crossedThreshold =
			prevScore < autoCaptureThreshold && score >= autoCaptureThreshold;

		// Check for stability: was unstable, now stable
		const becameStable = !prevStable && isStable;

		// Check for combined condition: either crossed threshold while stable,
		// or became stable while already above threshold
		const shouldTriggerReady =
			(crossedThreshold && isStable) ||
			(becameStable && score >= autoCaptureThreshold);

		if (shouldTriggerReady && localEnabled && !hasTriggeredReadyRef.current) {
			triggerHapticEvent("ready", { enabled: true, rateLimitMs });
			hasTriggeredReadyRef.current = true;
		}

		// Update refs for next comparison
		prevScoreRef.current = score;
		prevStableRef.current = isStable;
	}, [score, isStable, autoCaptureThreshold, localEnabled, rateLimitMs]);

	/**
	 * Trigger a haptic event manually (respects rate limiting)
	 */
	const trigger = useCallback(
		(event: HapticEvent): boolean => {
			if (!localEnabled) {
				return false;
			}
			return triggerHapticEvent(event, { enabled: true, rateLimitMs });
		},
		[localEnabled, rateLimitMs],
	);

	/**
	 * Trigger capture haptic (convenience method for photo capture)
	 */
	const triggerCapture = useCallback((): boolean => {
		return trigger("capture");
	}, [trigger]);

	return {
		enabled: localEnabled,
		trigger,
		triggerCapture,
	};
}

// Re-export constants for consumers
export { clearHapticRateLimits, DEFAULT_HAPTIC_RATE_LIMIT_MS };
