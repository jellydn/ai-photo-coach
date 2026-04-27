/**
 * Auto-capture hook
 *
 * Manages countdown state and triggers photo capture when
 * shot-readiness conditions are met (score >= threshold AND isStable).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	CountdownState,
	UseAutoCaptureProps,
	UseAutoCaptureResult,
} from "./types";
import {
	COUNTDOWN_INTERVAL_MS,
	canStartAutoCapture,
	DEFAULT_COUNTDOWN_DURATION,
} from "./types";

/**
 * React hook for automatic photo capture with countdown
 *
 * Features:
 * - Monitors shot-readiness conditions (score + stability)
 * - Starts 3-2-1 countdown when conditions are met
 * - Cancels countdown if conditions break before reaching 0
 * - Triggers capture callback on countdown completion
 * - Supports manual trigger and cancellation
 *
 * @param props - Hook configuration
 * @returns Auto-capture state and controls
 */
export function useAutoCapture({
	enabled,
	score,
	isStable,
	autoCaptureThreshold,
	countdownDuration = DEFAULT_COUNTDOWN_DURATION,
}: UseAutoCaptureProps): UseAutoCaptureResult {
	// Countdown state
	const [state, setState] = useState<CountdownState>("idle");
	const [countdownValue, setCountdownValue] = useState<number | null>(null);

	// Refs for interval management
	const countdownRef = useRef<number>(countdownDuration);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Check if we can start auto-capture
	const canCapture = canStartAutoCapture(score, isStable, autoCaptureThreshold);

	// Cancel countdown helper
	const cancelCountdown = useCallback(() => {
		// Clear interval
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		// Clear capture timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		// Reset state
		setState("idle");
		setCountdownValue(null);
		countdownRef.current = countdownDuration;
	}, [countdownDuration]);

	// Trigger capture helper (for external/manual use)
	const triggerCapture = useCallback(() => {
		cancelCountdown();
		setState("capturing");
	}, [cancelCountdown]);

	// Start countdown when conditions are met
	useEffect(() => {
		// Don't start if disabled or already counting/capturing
		if (!enabled || state === "counting" || state === "capturing") {
			return;
		}

		// Start countdown when conditions are met
		if (canCapture && state === "idle") {
			setState("counting");
			countdownRef.current = countdownDuration;
			setCountdownValue(countdownDuration);

			// Set up countdown interval
			intervalRef.current = setInterval(() => {
				countdownRef.current -= 1;
				setCountdownValue(countdownRef.current);

				if (countdownRef.current <= 0) {
					// Countdown complete - clear interval and trigger capture
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
						intervalRef.current = null;
					}
					setState("capturing");
					setCountdownValue(null);
				}
			}, COUNTDOWN_INTERVAL_MS);
		}

		// Cleanup on unmount
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [enabled, canCapture, state, countdownDuration]);

	// Cancel countdown if conditions break while counting
	useEffect(() => {
		if (state === "counting" && !canCapture) {
			// Conditions broke - cancel countdown
			cancelCountdown();
		}
	}, [state, canCapture, cancelCountdown]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cancelCountdown();
		};
	}, [cancelCountdown]);

	return {
		state,
		countdownValue,
		isCountingDown: state === "counting",
		canAutoCapture: canCapture,
		triggerCapture,
		cancelCountdown,
	};
}

export type {
	CountdownState,
	UseAutoCaptureProps,
	UseAutoCaptureResult,
} from "./types";
export {
	COUNTDOWN_INTERVAL_MS,
	canStartAutoCapture,
	DEFAULT_COUNTDOWN_DURATION,
} from "./types";
