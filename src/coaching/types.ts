/**
 * Coaching prompt engine - Pure functions for selecting user prompts
 * Priority order: stability > level > framing > lighting > composition
 */

/**
 * Input signals for prompt selection
 * All signals should come from existing hooks (useStability, useHorizonLevel, etc.)
 */
export interface CoachingSignals {
	/** Whether device is stable (from useStability) */
	isStable: boolean;
	/** Whether device is level (from useHorizonLevel) */
	isLevel: boolean;
	/** Framing prompt from face detection (from useFaceDetection) */
	framingPrompt: string | null;
	/** Lighting prompt from lighting analysis (from useLighting) */
	lightingPrompt: string | null;
	/** Composition prompt (optional, for future use) */
	compositionPrompt?: string | null;
}

/**
 * Mode-specific context for coaching
 * Used to determine which prompts are relevant for the current mode
 */
export interface CoachingContext {
	/** Whether face framing is enabled for this mode */
	faceFramingEnabled: boolean;
	/** Whether lighting analysis is enabled for this mode */
	lightingAnalysisEnabled: boolean;
	/** Whether composition overlays are enabled */
	compositionEnabled: boolean;
}

/**
 * Priority-ordered coaching prompts
 * These are all <= 5 words per spec requirement
 */
export const COACHING_PROMPTS = {
	// Stability prompts (highest priority)
	UNSTABLE: "Hold steady",

	// Level prompts
	NOT_LEVEL: "Tilt to level",

	// Framing prompts (from face detection)
	FACE_TOO_SMALL: "Step closer",
	FACE_TOO_LARGE: "Step back",
	HEADROOM_TOO_HIGH: "Lower camera",
	HEADROOM_TOO_LOW: "Raise camera",
	NO_FACE_DETECTED: "Find a face",

	// Lighting prompts
	TOO_DARK: "Too dark",
	TOO_BRIGHT: "Too bright",
	BACKLIT: "Face the light",

	// Composition prompts (for future use)
	CENTER_SUBJECT: "Center subject",
	USE_RULE_THIRDS: "Use rule of thirds",

	// Success state
	READY: "Perfect! Ready ✓",
} as const;

/**
 * Pure function to select the appropriate coaching prompt
 * Priority order: stability > level > framing > lighting > composition
 *
 * @param signals - Current coaching signals from all sensors/analysis
 * @param context - Mode-specific context for filtering relevant prompts
 * @returns Selected prompt string or null if no issues (or null if all good)
 */
export function selectPrompt(
	signals: CoachingSignals,
	context: CoachingContext,
): string | null {
	// Priority 1: Stability - must be stable before anything else
	if (!signals.isStable) {
		return COACHING_PROMPTS.UNSTABLE;
	}

	// Priority 2: Horizon level
	if (!signals.isLevel) {
		return COACHING_PROMPTS.NOT_LEVEL;
	}

	// Priority 3: Framing (only if face framing is enabled for this mode)
	if (context.faceFramingEnabled && signals.framingPrompt) {
		return signals.framingPrompt;
	}

	// Priority 4: Lighting (only if lighting analysis is enabled)
	if (context.lightingAnalysisEnabled && signals.lightingPrompt) {
		return signals.lightingPrompt;
	}

	// Priority 5: Composition (optional/future)
	if (context.compositionEnabled && signals.compositionPrompt) {
		return signals.compositionPrompt;
	}

	// No issues - return null (caller may show "Ready" or nothing)
	return null;
}

/**
 * Check if all coaching conditions are satisfied
 * Used to determine if auto-capture should be enabled
 *
 * @param signals - Current coaching signals
 * @param context - Mode-specific context
 * @returns true if stable, level, and no framing/lighting issues
 */
export function isReadyForCapture(
	signals: CoachingSignals,
	context: CoachingContext,
): boolean {
	// Must be stable and level
	if (!signals.isStable || !signals.isLevel) {
		return false;
	}

	// No framing issues (if enabled)
	if (context.faceFramingEnabled && signals.framingPrompt) {
		return false;
	}

	// No lighting issues (if enabled)
	if (context.lightingAnalysisEnabled && signals.lightingPrompt) {
		return false;
	}

	// No composition issues (if enabled)
	if (context.compositionEnabled && signals.compositionPrompt) {
		return false;
	}

	return true;
}

/**
 * Debounce utility for prompts
 * Ensures UI changes no faster than every 500ms per spec
 *
 * @param prompt - New prompt to potentially display
 * @param lastPrompt - Previously displayed prompt
 * @param lastUpdateTime - Timestamp of last prompt update
 * @param debounceMs - Debounce interval in milliseconds (default 500)
 * @returns Object with shouldUpdate flag and updated timestamps
 */
export function shouldUpdatePrompt(
	prompt: string | null,
	lastPrompt: string | null,
	lastUpdateTime: number,
	debounceMs: number = 500,
): {
	shouldUpdate: boolean;
	newPrompt: string | null;
	newUpdateTime: number;
} {
	const now = Date.now();
	const timeSinceLastUpdate = now - lastUpdateTime;

	// Always allow immediate update if prompt is cleared (null)
	if (prompt === null && lastPrompt !== null) {
		return {
			shouldUpdate: true,
			newPrompt: null,
			newUpdateTime: now,
		};
	}

	// Always allow immediate update if this is the first prompt
	if (lastPrompt === null && prompt !== null) {
		return {
			shouldUpdate: true,
			newPrompt: prompt,
			newUpdateTime: now,
		};
	}

	// If prompt hasn't changed, don't update
	if (prompt === lastPrompt) {
		return {
			shouldUpdate: false,
			newPrompt: lastPrompt,
			newUpdateTime: lastUpdateTime,
		};
	}

	// Debounce: only update if enough time has passed
	if (timeSinceLastUpdate >= debounceMs) {
		return {
			shouldUpdate: true,
			newPrompt: prompt,
			newUpdateTime: now,
		};
	}

	// Not enough time passed, keep current prompt
	return {
		shouldUpdate: false,
		newPrompt: lastPrompt,
		newUpdateTime: lastUpdateTime,
	};
}

/**
 * Default debounce interval in milliseconds
 * Per spec: UI changes no faster than every 500ms
 */
export const DEFAULT_PROMPT_DEBOUNCE_MS = 500;

/**
 * Fade animation duration in milliseconds
 * Per spec: 200ms fade in/out
 */
export const PROMPT_FADE_DURATION_MS = 200;
