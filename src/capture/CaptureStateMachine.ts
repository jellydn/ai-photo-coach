/**
 * Capture State Machine
 *
 * Models the photo capture lifecycle as a finite state machine.
 * Addresses CONCERNS.md: "Capture and burst lifecycle" fragile area.
 *
 * States:
 * - idle: Ready to capture, no activity
 * - preparing: Conditions being checked before countdown
 * - countdown: 3-2-1 countdown in progress
 * - capturing: Actually taking photo(s)
 * - processing: Photo captured, being saved/processed
 * - completed: Capture complete, ready for next
 * - cancelled: Capture cancelled by user or conditions
 * - error: Capture failed with error
 *
 * Transitions are explicit and validated, making the capture
 * lifecycle predictable and testable.
 */

export type CaptureState =
	| "idle"
	| "preparing"
	| "countdown"
	| "capturing"
	| "processing"
	| "completed"
	| "cancelled"
	| "error";

export type CaptureMode = "single" | "burst" | "auto";

export interface CaptureContext {
	/** Current capture state */
	state: CaptureState;
	/** Capture mode */
	mode: CaptureMode;
	/** Countdown value (null when not counting) */
	countdownValue: number | null;
	/** Current burst shot index (0 for single) */
	burstIndex: number;
	/** Total burst shots planned */
	burstTotal: number;
	/** Error message if in error state */
	error: string | null;
	/** Timestamp of state entry */
	stateEnteredAt: number;
	/** Whether capture was triggered automatically */
	isAutoCapture: boolean;
}

export type CaptureEvent =
	| { type: "START_MANUAL"; mode: CaptureMode; burstTotal?: number }
	| { type: "START_AUTO"; burstTotal?: number }
	| { type: "CONDITIONS_MET" }
	| { type: "CONDITIONS_BROKEN" }
	| { type: "COUNTDOWN_TICK"; value: number }
	| { type: "COUNTDOWN_COMPLETE" }
	| { type: "CAPTURE_START" }
	| { type: "CAPTURE_COMPLETE" }
	| { type: "PROCESSING_COMPLETE" }
	| { type: "BURST_NEXT" }
	| { type: "BURST_COMPLETE" }
	| { type: "CANCEL" }
	| { type: "ERROR"; error: string }
	| { type: "RESET" };

/** Valid state transitions map */
const validTransitions: Record<CaptureState, CaptureState[]> = {
	idle: ["preparing"], // Always go through preparing first for proper setup
	preparing: ["countdown", "capturing", "cancelled", "idle"],
	countdown: ["capturing", "cancelled", "idle"],
	capturing: ["processing", "error", "cancelled"],
	processing: ["completed", "error", "capturing", "cancelled"], // capturing for burst next, cancelled for user interrupt
	completed: ["idle"],
	cancelled: ["idle"],
	error: ["idle"],
};

/**
 * Normalize burst total to valid range
 */
function normalizeBurstTotal(total: number | undefined): number {
	const MIN_BURST = 1;
	const normalized = Math.max(MIN_BURST, Math.round(total ?? 1));
	return normalized;
}

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
	from: CaptureState,
	to: CaptureState,
): boolean {
	return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Get initial capture context
 */
export function getInitialContext(): CaptureContext {
	return {
		state: "idle",
		mode: "single",
		countdownValue: null,
		burstIndex: 0,
		burstTotal: 1,
		error: null,
		stateEnteredAt: Date.now(),
		isAutoCapture: false,
	};
}

/**
 * Capture state machine transition function
 *
 * Pure function - given current context and event, returns new context.
 * No side effects, making it fully testable.
 *
 * @param context - Current capture context
 * @param event - Event to process
 * @returns New capture context after transition
 */
export function transition(
	context: CaptureContext,
	event: CaptureEvent,
): CaptureContext {
	const now = Date.now();

	switch (event.type) {
		case "START_MANUAL":
			if (!isValidTransition(context.state, "preparing")) {
				return { ...context, error: "Cannot start: invalid transition" };
			}
			return {
				...context,
				state: "preparing",
				mode: event.mode,
				burstTotal: normalizeBurstTotal(event.burstTotal),
				burstIndex: 0,
				countdownValue: null,
				isAutoCapture: false,
				stateEnteredAt: now,
				error: null,
			};

		case "START_AUTO":
			if (!isValidTransition(context.state, "preparing")) {
				return { ...context, error: "Cannot start auto: invalid transition" };
			}
			return {
				...context,
				state: "preparing",
				mode: "auto",
				burstTotal: normalizeBurstTotal(event.burstTotal),
				burstIndex: 0,
				countdownValue: null,
				isAutoCapture: true,
				stateEnteredAt: now,
				error: null,
			};

		case "CONDITIONS_MET":
			if (context.state === "preparing") {
				return {
					...context,
					state: "countdown",
					stateEnteredAt: now,
				};
			}
			return context;

		case "CONDITIONS_BROKEN":
			if (context.state === "countdown" || context.state === "preparing") {
				return {
					...context,
					state: "idle",
					countdownValue: null,
					stateEnteredAt: now,
				};
			}
			return context;

		case "COUNTDOWN_TICK":
			if (context.state === "countdown") {
				return {
					...context,
					countdownValue: event.value,
				};
			}
			return context;

		case "COUNTDOWN_COMPLETE":
			if (context.state === "countdown") {
				return {
					...context,
					state: "capturing",
					countdownValue: null,
					stateEnteredAt: now,
				};
			}
			return context;

		case "CAPTURE_START":
			if (context.state === "capturing") {
				return { ...context }; // Already in correct state
			}
			if (context.state === "idle" || context.state === "preparing") {
				return {
					...context,
					state: "capturing",
					stateEnteredAt: now,
				};
			}
			return context;

		case "CAPTURE_COMPLETE":
			if (context.state === "capturing") {
				return {
					...context,
					state: "processing",
					stateEnteredAt: now,
				};
			}
			return context;

		case "PROCESSING_COMPLETE":
			if (context.state === "processing") {
				return {
					...context,
					state: "completed",
					stateEnteredAt: now,
				};
			}
			return context;

		case "BURST_NEXT":
			if (context.state === "processing" && context.mode === "burst") {
				const nextIndex = context.burstIndex + 1;
				if (nextIndex < context.burstTotal) {
					return {
						...context,
						state: "capturing",
						burstIndex: nextIndex,
						stateEnteredAt: now,
					};
				}
			}
			return context;

		case "BURST_COMPLETE":
			if (context.state === "processing" && context.mode === "burst") {
				return {
					...context,
					state: "completed",
					stateEnteredAt: now,
				};
			}
			return context;

		case "CANCEL":
			if (["preparing", "countdown", "capturing", "processing"].includes(context.state)) {
				return {
					...context,
					state: "cancelled",
					countdownValue: null,
					stateEnteredAt: now,
				};
			}
			return context;

		case "ERROR":
			return {
				...context,
				state: "error",
				error: event.error,
				stateEnteredAt: now,
			};

		case "RESET":
			return getInitialContext();

		default:
			return context;
	}
}

/**
 * Check if capture is currently active (in non-terminal state)
 */
export function isCaptureActive(context: CaptureContext): boolean {
	return ["preparing", "countdown", "capturing", "processing"].includes(
		context.state,
	);
}

/**
 * Check if capture is in a terminal state (completed, cancelled, error)
 */
export function isCaptureComplete(context: CaptureContext): boolean {
	return ["completed", "cancelled", "error"].includes(context.state);
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: CaptureState): string {
	const descriptions: Record<CaptureState, string> = {
		idle: "Ready to capture",
		preparing: "Preparing for capture",
		countdown: "Countdown in progress",
		capturing: "Taking photo",
		processing: "Processing captured photo",
		completed: "Capture complete",
		cancelled: "Capture cancelled",
		error: "Capture failed",
	};
	return descriptions[state];
}
