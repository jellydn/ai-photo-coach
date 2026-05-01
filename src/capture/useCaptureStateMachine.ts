/**
 * useCaptureStateMachine Hook
 *
 * React hook that integrates the CaptureStateMachine FSM with the
 * existing capture flow. Provides a bridge between the pure state machine
 * and React component state.
 *
 * This hook can be used alongside or as a replacement for useAutoCapture,
 * providing explicit state modeling and safer transitions.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	getInitialContext,
	isCaptureActive,
	transition,
	type CaptureContext,
	type CaptureEvent,
	type CaptureMode,
} from "./CaptureStateMachine";

export interface UseCaptureStateMachineProps {
	/** Auto-capture enabled */
	autoCaptureEnabled?: boolean;
	/** Current shot score */
	score?: number;
	/** Camera stability */
	isStable?: boolean;
	/** Auto-capture threshold */
	autoCaptureThreshold?: number;
	/** Burst mode enabled */
	burstMode?: boolean;
	/** Number of shots in burst */
	burstShotCount?: number;
	/** Callback when capture should start */
	onCaptureStart?: (context: CaptureContext) => void;
	/** Callback when capture completes */
	onCaptureComplete?: (context: CaptureContext) => void;
	/** Callback when burst shot should be taken */
	onBurstShot?: (index: number, total: number) => void;
}

export interface UseCaptureStateMachineResult {
	/** Current capture context */
	context: CaptureContext;
	/** Whether capture is currently active */
	isCapturing: boolean;
	/** Current countdown value (null if not counting) */
	countdownValue: number | null;
	/** Current burst progress */
	burstProgress: { current: number; total: number } | null;
	/** Start manual capture */
	startManualCapture: (mode?: CaptureMode, burstTotal?: number) => void;
	/** Start auto capture */
	startAutoCapture: (burstTotal?: number) => void;
	/** Cancel current capture */
	cancelCapture: () => void;
	/** Mark capture as started */
	markCaptureStarted: () => void;
	/** Mark capture as complete */
	markCaptureComplete: () => void;
	/** Mark processing as complete */
	markProcessingComplete: () => void;
	/** Move to next burst shot */
	nextBurstShot: () => void;
	/** Complete burst mode */
	completeBurst: () => void;
	/** Reset to idle state */
	reset: () => void;
}

/**
 * React hook for managing capture state with FSM
 *
 * Integrates the CaptureStateMachine with React state management,
 * providing explicit state transitions and safer capture lifecycle.
 *
 * @example
 * ```typescript
 * const {
 *   context,
 *   isCapturing,
 *   countdownValue,
 *   startManualCapture,
 *   cancelCapture,
 * } = useCaptureStateMachine({
 *   autoCaptureEnabled: true,
 *   score: currentScore,
 *   isStable: stability < 0.02,
 *   onCaptureStart: (ctx) => takePhoto(),
 * });
 * ```
 */
export function useCaptureStateMachine({
	autoCaptureEnabled = false,
	score = 0,
	isStable = false,
	autoCaptureThreshold = 80,
	burstMode = false,
	burstShotCount = 3,
	onCaptureStart,
	onCaptureComplete,
	onBurstShot,
}: UseCaptureStateMachineProps = {}): UseCaptureStateMachineResult {
	// FSM context state
	const [context, setContext] = useState<CaptureContext>(getInitialContext);

	// Refs for callbacks and previous state tracking
	const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const onBurstShotRef = useRef(onBurstShot);
	const onCaptureStartRef = useRef(onCaptureStart);
	const onCaptureCompleteRef = useRef(onCaptureComplete);
	const prevContextRef = useRef<CaptureContext>(context);
	const dispatchRef = useRef<(event: CaptureEvent) => void>(() => {});
	const isUnmountedRef = useRef(false);

	/**
	 * Dispatch an event to the state machine
	 */
	const dispatch = useCallback((event: CaptureEvent) => {
		setContext((prevContext) => transition(prevContext, event));
	}, []);

	// Keep refs up to date
	useEffect(() => {
		onBurstShotRef.current = onBurstShot;
		onCaptureStartRef.current = onCaptureStart;
		onCaptureCompleteRef.current = onCaptureComplete;
		dispatchRef.current = dispatch;
	}, [onBurstShot, onCaptureStart, onCaptureComplete, dispatch]);

	// Handle side effects from state transitions (pure approach)
	useEffect(() => {
		const prevContext = prevContextRef.current;

		// Call callbacks based on state changes
		if (context.state === "capturing" && prevContext.state !== "capturing") {
			onCaptureStartRef.current?.(context);
		}
		if (context.state === "completed" && prevContext.state !== "completed") {
			onCaptureCompleteRef.current?.(context);
		}

		// Auto-manage countdown timer when entering/leaving countdown state
		if (context.state === "countdown" && prevContext.state !== "countdown") {
			// Entering countdown state - start the countdown timer
			let countdownValue = 3;
			dispatchRef.current({ type: "COUNTDOWN_TICK", value: countdownValue });

			countdownIntervalRef.current = setInterval(() => {
				countdownValue -= 1;
				if (countdownValue <= 0) {
					// Countdown complete
					if (countdownIntervalRef.current) {
						clearInterval(countdownIntervalRef.current);
						countdownIntervalRef.current = null;
					}
					dispatchRef.current({ type: "COUNTDOWN_COMPLETE" });
				} else {
					dispatchRef.current({ type: "COUNTDOWN_TICK", value: countdownValue });
				}
			}, 1000);
		} else if (context.state !== "countdown" && prevContext.state === "countdown") {
			// Leaving countdown state - clear the timer
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current);
				countdownIntervalRef.current = null;
			}
		}

		// Update previous context ref
		prevContextRef.current = context;
	}, [context]);

	// Cleanup countdown interval on unmount to prevent memory leaks
	useEffect(() => {
		return () => {
			isUnmountedRef.current = true;
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current);
				countdownIntervalRef.current = null;
			}
		};
	}, []);

	/**
	 * Start manual capture
	 */
	const startManualCapture = useCallback((
		mode: CaptureMode = "single",
		burstTotal?: number,
	) => {
		dispatch({
			type: "START_MANUAL",
			mode,
			burstTotal: mode === "burst" ? (burstTotal ?? burstShotCount) : undefined,
		});
	}, [dispatch, burstShotCount]);

	/**
	 * Start auto capture (when conditions are met)
	 */
	const startAutoCapture = useCallback((burstTotal?: number) => {
		if (!autoCaptureEnabled) return;
		if (score < autoCaptureThreshold || !isStable) return;

		const effectiveBurstTotal = burstMode ? (burstTotal ?? burstShotCount) : 1;
		dispatch({
			type: "START_AUTO",
			burstTotal: effectiveBurstTotal,
		});
	}, [autoCaptureEnabled, score, isStable, autoCaptureThreshold, burstMode, burstShotCount, dispatch]);

	/**
	 * Cancel current capture
	 */
	const cancelCapture = useCallback(() => {
		// Clear any active countdown
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
			countdownIntervalRef.current = null;
		}
		dispatch({ type: "CANCEL" });
	}, [dispatch]);

	/**
	 * Mark capture as started (enter capturing state)
	 */
	const markCaptureStarted = useCallback(() => {
		dispatch({ type: "CAPTURE_START" });
	}, [dispatch]);

	/**
	 * Mark capture as complete (enter processing state)
	 */
	const markCaptureComplete = useCallback(() => {
		dispatch({ type: "CAPTURE_COMPLETE" });
	}, [dispatch]);

	/**
	 * Mark processing as complete (enter completed state)
	 */
	const markProcessingComplete = useCallback(() => {
		dispatch({ type: "PROCESSING_COMPLETE" });
	}, [dispatch]);

	/**
	 * Move to next burst shot
	 */
	const nextBurstShot = useCallback(() => {
		setContext((prevContext) => {
			const newContext = transition(prevContext, { type: "BURST_NEXT" });
			if (newContext.mode === "burst" && newContext.state === "capturing") {
				onBurstShotRef.current?.(newContext.burstIndex, newContext.burstTotal);
			}
			return newContext;
		});
	}, []);

	/**
	 * Complete burst mode
	 */
	const completeBurst = useCallback(() => {
		dispatch({ type: "BURST_COMPLETE" });
	}, [dispatch]);

	/**
	 * Reset to idle state
	 */
	const reset = useCallback(() => {
		// Clear any active countdown
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
			countdownIntervalRef.current = null;
		}
		dispatch({ type: "RESET" });
	}, [dispatch]);

	// Compute derived values
	const isCapturing = isCaptureActive(context);
	const countdownValue = context.countdownValue;
	const burstProgress = context.mode === "burst" && context.burstTotal > 1
		? { current: context.burstIndex + 1, total: context.burstTotal }
		: null;

	return {
		context,
		isCapturing,
		countdownValue,
		burstProgress,
		startManualCapture,
		startAutoCapture,
		cancelCapture,
		markCaptureStarted,
		markCaptureComplete,
		markProcessingComplete,
		nextBurstShot,
		completeBurst,
		reset,
	};
}
