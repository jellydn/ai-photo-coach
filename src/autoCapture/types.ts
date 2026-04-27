/**
 * Auto-capture types and pure functions
 *
 * Provides countdown logic and state management for automatic photo capture
 * when shot-readiness conditions are met.
 */

/**
 * Auto-capture countdown state
 */
export type CountdownState =
	| "idle" // Not counting down
	| "counting" // Active countdown 3-2-1
	| "capturing" // Taking photo
	| "completed"; // Photo captured

/**
 * Props for useAutoCapture hook
 */
export interface UseAutoCaptureProps {
	/** Whether auto-capture is enabled by user */
	enabled: boolean;
	/** Current shot-readiness score (0-100) */
	score: number;
	/** Whether device is stable */
	isStable: boolean;
	/** Auto-capture threshold from mode config */
	autoCaptureThreshold: number;
	/** Countdown duration in seconds (default 3) */
	countdownDuration?: number;
}

/**
 * Result from useAutoCapture hook
 */
export interface UseAutoCaptureResult {
	/** Current countdown state */
	state: CountdownState;
	/** Current countdown value (3, 2, 1, or null) */
	countdownValue: number | null;
	/** Whether countdown is currently active */
	isCountingDown: boolean;
	/** Whether conditions are met for capture */
	canAutoCapture: boolean;
	/** Trigger manual capture (for testing or external use) */
	triggerCapture: () => void;
	/** Cancel ongoing countdown */
	cancelCountdown: () => void;
}

/**
 * Check if conditions are met for auto-capture
 *
 * Pure function: score >= threshold AND isStable
 */
export function canStartAutoCapture(
	score: number,
	isStable: boolean,
	threshold: number,
): boolean {
	return score >= threshold && isStable;
}

/**
 * Countdown duration in milliseconds per tick
 */
export const COUNTDOWN_INTERVAL_MS = 1000;

/**
 * Default countdown duration in seconds
 */
export const DEFAULT_COUNTDOWN_DURATION = 3;
