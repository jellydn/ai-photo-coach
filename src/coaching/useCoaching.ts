/**
 * Coaching prompt hook
 * Provides reactive prompt selection with debouncing
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceFramingGuidance } from "../faceDetection/types";
import type { LightingClass } from "../lighting/types";
import {
	type CoachingContext,
	type CoachingSignals,
	DEFAULT_PROMPT_DEBOUNCE_MS,
	selectPrompt,
	shouldUpdatePrompt,
} from "./types";

/**
 * Props for useCoaching hook
 */
export interface UseCoachingProps {
	/** Whether device is stable */
	isStable: boolean;
	/** Whether device is level */
	isLevel: boolean;
	/** Face framing guidance from useFaceDetection */
	framingGuidance?: FaceFramingGuidance;
	/** Current lighting classification */
	lightingClass?: LightingClass;
	/** Lighting prompt from useLighting */
	lightingPrompt?: string | null;
	/** Edge detection prompt from useEdgeDetection (for Travel mode) */
	edgeDetectionPrompt?: string | null;
	/** Flat-lay prompt from usePitchDetection (for Food mode) */
	flatLayPrompt?: string | null;
	/** Centering prompt (for Food/Product mode) */
	centeringPrompt?: string | null;
	/** Mode-specific coaching context */
	context: CoachingContext;
	/** Debounce interval in ms (default 500) */
	debounceMs?: number;
}

/**
 * Result from useCoaching hook
 */
export interface UseCoachingResult {
	/** Currently selected coaching prompt (debounced) */
	prompt: string | null;
	/** Whether all conditions are satisfied for auto-capture */
	isReady: boolean;
	/** Whether a prompt is currently being displayed */
	hasPrompt: boolean;
	/** Time since last prompt change (for animations) */
	msSinceLastChange: number;
}

/**
 * React hook for coaching prompt selection
 *
 * Features:
 * - Priority-ordered prompt selection (stability > level > framing > lighting)
 * - Debounced updates (max 500ms frequency per spec)
 * - Ready state for auto-capture decision
 *
 * @param props - Hook configuration
 * @returns Coaching state with selected prompt
 */
export function useCoaching({
	isStable,
	isLevel,
	framingGuidance,
	lightingClass,
	lightingPrompt,
	edgeDetectionPrompt,
	flatLayPrompt,
	centeringPrompt,
	context,
	debounceMs = DEFAULT_PROMPT_DEBOUNCE_MS,
}: UseCoachingProps): UseCoachingResult {
	const [displayedPrompt, setDisplayedPrompt] = useState<string | null>(null);
	const [lastChangeTime, setLastChangeTime] = useState<number>(Date.now());

	// Refs for debouncing logic
	const pendingPromptRef = useRef<string | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Build signals object from props
	const signals: CoachingSignals = {
		isStable,
		isLevel,
		framingPrompt: framingGuidance?.prompt ?? null,
		lightingPrompt: lightingPrompt ?? null,
		edgeDetectionPrompt: edgeDetectionPrompt ?? null,
		compositionPrompt: null, // Future use
		flatLayPrompt: flatLayPrompt ?? null,
		centeringPrompt: centeringPrompt ?? null,
	};

	// Compute the target prompt (before debouncing)
	const targetPrompt = selectPrompt(signals, context);

	// Check if ready for capture
	const isReady =
		isStable &&
		isLevel &&
		(!context.faceFramingEnabled || !framingGuidance?.prompt) &&
		(!context.flatLayEnabled || !flatLayPrompt) &&
		(!context.centeringEnabled || !centeringPrompt) &&
		(!context.edgeDetectionEnabled || !edgeDetectionPrompt) &&
		(!context.lightingAnalysisEnabled || lightingClass === "good");

	// Debounced update effect
	const updatePrompt = useCallback(() => {
		const result = shouldUpdatePrompt(
			targetPrompt,
			displayedPrompt,
			lastChangeTime,
			debounceMs,
		);

		if (result.shouldUpdate) {
			setDisplayedPrompt(result.newPrompt);
			setLastChangeTime(result.newUpdateTime);
			pendingPromptRef.current = null;
		}
	}, [targetPrompt, displayedPrompt, lastChangeTime, debounceMs]);

	// Handle prompt changes with debouncing
	useEffect(() => {
		// Clear any pending timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}

		// Check if we should update immediately or wait
		const timeSinceLastChange = Date.now() - lastChangeTime;

		if (targetPrompt !== displayedPrompt) {
			if (timeSinceLastChange >= debounceMs) {
				// Enough time has passed, update immediately
				updatePrompt();
			} else {
				// Schedule update after remaining debounce time
				const remainingTime = debounceMs - timeSinceLastChange;
				pendingPromptRef.current = targetPrompt;
				timeoutRef.current = setTimeout(() => {
					updatePrompt();
				}, remainingTime);
			}
		}

		// Cleanup timeout on unmount
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [targetPrompt, displayedPrompt, lastChangeTime, debounceMs, updatePrompt]);

	// Calculate time since last change
	const msSinceLastChange = Date.now() - lastChangeTime;

	return {
		prompt: displayedPrompt,
		isReady,
		hasPrompt: displayedPrompt !== null,
		msSinceLastChange,
	};
}
