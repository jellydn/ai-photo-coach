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
	/** Edge detection prompt (from useEdgeDetection - for Travel mode) */
	edgeDetectionPrompt?: string | null;
	/** Composition prompt (optional, for future use) */
	compositionPrompt?: string | null;
	/** Flat-lay prompt for food mode (from usePitchDetection) */
	flatLayPrompt?: string | null;
	/** Centering prompt for food/product mode */
	centeringPrompt?: string | null;
	/** Group framing prompt for group photo mode */
	groupFramingPrompt?: string | null;
	/** Background variance prompt for product mode */
	backgroundPrompt?: string | null;
	/** Document skew prompt for document mode */
	documentSkewPrompt?: string | null;
	/** Phone level prompt for document mode (pitch deviation) */
	phoneLevelPrompt?: string | null;
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
	/** Whether edge detection (dominant lines) is enabled for this mode */
	edgeDetectionEnabled: boolean;
	/** Whether flat-lay detection is enabled for food mode */
	flatLayEnabled?: boolean;
	/** Whether centering guidance is enabled (food/product mode) */
	centeringEnabled?: boolean;
	/** Whether group framing is enabled (group photo mode) */
	groupFramingEnabled?: boolean;
	/** Whether document skew detection is enabled (document mode) */
	documentSkewEnabled?: boolean;
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

	// Group photo prompts
	EVERYONE_IN_FRAME: "Everyone in frame?",
	GROUP_STEP_BACK: "Step back",
	GROUP_STEP_CLOSER: "Step closer",

	// Lighting prompts
	TOO_DARK: "Too dark",
	TOO_BRIGHT: "Too bright",
	BACKLIT: "Face the light",

	// Edge detection prompts (for Travel mode)
	ALIGN_WITH_LINE: "Align with line",

	// Food mode prompts (flat-lay & plate centering)
	SHOOT_FROM_ABOVE: "Shoot from above",
	CENTER_THE_DISH: "Center the dish",
	FIND_BETTER_LIGHT: "Find better light",

	// Product mode prompts
	CENTER_YOUR_PRODUCT: "Center your product",
	USE_PLAIN_BACKGROUND: "Use plain background",

	// Document mode prompts
	FLATTEN_THE_PAGE: "Flatten the page",
	HOLD_PHONE_LEVEL: "Hold phone level",

	// Composition prompts (for future use)
	CENTER_SUBJECT: "Center subject",
	USE_RULE_THIRDS: "Use rule of thirds",

	// Success state
	READY: "Perfect! Ready ✓",
} as const;

/**
 * Pure function to select the appropriate coaching prompt
 * Priority order: stability > level > framing > group framing > flat-lay > centering > edge detection > lighting > composition
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

	// Priority 4: Group framing (for group photo mode)
	if (context.groupFramingEnabled && signals.groupFramingPrompt) {
		return signals.groupFramingPrompt;
	}

	// Priority 5: Flat-lay angle (for food mode)
	if (context.flatLayEnabled && signals.flatLayPrompt) {
		return signals.flatLayPrompt;
	}

	// Priority 6: Centering (for food/product mode)
	if (context.centeringEnabled && signals.centeringPrompt) {
		return signals.centeringPrompt;
	}

	// Priority 6b: Background check (for product mode)
	if (context.centeringEnabled && signals.backgroundPrompt) {
		return signals.backgroundPrompt;
	}

	// Priority 7: Document skew detection (for document mode)
	// Check phone level first (pitch), then document skew
	if (context.documentSkewEnabled && signals.phoneLevelPrompt) {
		return signals.phoneLevelPrompt;
	}

	if (context.documentSkewEnabled && signals.documentSkewPrompt) {
		return signals.documentSkewPrompt;
	}

	// Priority 8: Edge detection / line alignment (for Travel mode)
	if (context.edgeDetectionEnabled && signals.edgeDetectionPrompt) {
		return signals.edgeDetectionPrompt;
	}

	// Priority 8: Lighting (only if lighting analysis is enabled)
	if (context.lightingAnalysisEnabled && signals.lightingPrompt) {
		return signals.lightingPrompt;
	}

	// Priority 9: Composition (optional/future)
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
 * @returns true if stable, level, and no framing/group/flat-lay/centering/edge/lighting issues
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

	// No group framing issues (if enabled - for group photo mode)
	if (context.groupFramingEnabled && signals.groupFramingPrompt) {
		return false;
	}

	// No flat-lay issues (if enabled - for food mode)
	if (context.flatLayEnabled && signals.flatLayPrompt) {
		return false;
	}

	// No centering issues (if enabled - for food/product mode)
	if (context.centeringEnabled && signals.centeringPrompt) {
		return false;
	}

	// No background issues (if enabled - for product mode)
	if (context.centeringEnabled && signals.backgroundPrompt) {
		return false;
	}

	// No document skew issues (if enabled - for document mode)
	if (context.documentSkewEnabled && signals.phoneLevelPrompt) {
		return false;
	}

	if (context.documentSkewEnabled && signals.documentSkewPrompt) {
		return false;
	}

	// No edge detection issues (if enabled - for Travel mode alignment)
	if (context.edgeDetectionEnabled && signals.edgeDetectionPrompt) {
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
