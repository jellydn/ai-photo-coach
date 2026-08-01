/**
 * Countdown Timer
 *
 * Deep module owning the countdown interval lifecycle for the capture
 * state machine. Concentrates the setInterval/clearInterval plumbing,
 * unmount guards, and tick bookkeeping that previously lived inside
 * useCaptureStateMachine - where the countdown bug actually hid.
 *
 * Addresses issue #26: absorb countdown timing into the capture module.
 */

export interface CountdownTimerCallbacks {
	/** Called immediately on start and once per interval with remaining seconds */
	onTick: (value: number) => void;
	/** Called when the countdown reaches zero */
	onComplete: () => void;
}

export interface CountdownTimer {
	/** Begin counting down. Fires onTick(seconds) immediately, then each interval. */
	start: () => void;
	/** Stop the countdown. Safe to call when not running. No onComplete fires. */
	stop: () => void;
	/** Whether the countdown is currently running */
	isRunning: () => boolean;
}

/**
 * Create a countdown timer.
 *
 * @param callbacks - onTick receives remaining seconds; onComplete fires at zero
 * @param durationSeconds - total countdown length (default 3, clamped to >= 1)
 * @param intervalMs - tick interval in ms (default 1000)
 */
export function createCountdownTimer(
	callbacks: CountdownTimerCallbacks,
	durationSeconds = 3,
	intervalMs = 1000,
): CountdownTimer {
	let remaining = Math.max(1, Math.round(durationSeconds));
	let interval: ReturnType<typeof setInterval> | null = null;

	const stop = (): void => {
		if (interval !== null) {
			clearInterval(interval);
			interval = null;
		}
	};

	return {
		start(): void {
			if (interval !== null) {
				return; // Already running
			}
			callbacks.onTick(remaining);
			interval = setInterval(() => {
				remaining -= 1;
				if (remaining <= 0) {
					stop();
					callbacks.onComplete();
				} else {
					callbacks.onTick(remaining);
				}
			}, intervalMs);
		},
		stop,
		isRunning: () => interval !== null,
	};
}
