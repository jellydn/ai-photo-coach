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
	DEFAULT_BURST_INTERVAL_MS,
	DEFAULT_BURST_SHOT_COUNT,
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
	burstMode = false,
	burstShotCount = DEFAULT_BURST_SHOT_COUNT,
	burstIntervalMs = DEFAULT_BURST_INTERVAL_MS,
}: UseAutoCaptureProps): UseAutoCaptureResult {
	// Countdown state
	const [state, setState] = useState<CountdownState>("idle");
	const [countdownValue, setCountdownValue] = useState<number | null>(null);

	// Burst mode state
	const [currentBurstIndex, setCurrentBurstIndex] = useState(0);

	// Refs for interval management
	const countdownRef = useRef<number>(countdownDuration);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const burstIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
		// Clear burst interval
		if (burstIntervalRef.current) {
			clearInterval(burstIntervalRef.current);
			burstIntervalRef.current = null;
		}
		// Reset state
		setState("idle");
		setCountdownValue(null);
		setCurrentBurstIndex(0);
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

	// Burst mode progression effect
	// Manages the sequence of burst shots (0 -> 1 -> 2 -> completed)
	useEffect(() => {
		// Only run in burst mode when in capturing state
		if (!burstMode || state !== "capturing") {
			return;
		}

		// If we've captured all burst shots, move to completed state
		if (currentBurstIndex >= burstShotCount) {
			setState("completed");
			setCurrentBurstIndex(0);
			return;
		}

		// Schedule the next burst shot
		burstIntervalRef.current = setInterval(() => {
			setCurrentBurstIndex((prev) => {
				const next = prev + 1;
				if (next >= burstShotCount) {
					// All shots captured - clear interval and complete
					if (burstIntervalRef.current) {
						clearInterval(burstIntervalRef.current);
						burstIntervalRef.current = null;
					}
					setState("completed");
					return 0; // Reset for next burst sequence
				}
				return next;
			});
		}, burstIntervalMs);

		// Cleanup
		return () => {
			if (burstIntervalRef.current) {
				clearInterval(burstIntervalRef.current);
				burstIntervalRef.current = null;
			}
		};
	}, [burstMode, state, currentBurstIndex, burstShotCount, burstIntervalMs]);

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
		isBurstMode: burstMode,
		burstShotIndex: currentBurstIndex,
		burstShotCount,
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
	DEFAULT_BURST_INTERVAL_MS,
	DEFAULT_BURST_SHOT_COUNT,
	DEFAULT_COUNTDOWN_DURATION,
} from "./types";
