/**
 * Coaching prompt engine
 * Provides priority-based prompt selection with debouncing
 */

export { PromptPill, type PromptPillProps } from "./PromptPill";
export type {
	CoachingContext,
	CoachingSignals,
} from "./types";
export {
	COACHING_PROMPTS,
	DEFAULT_PROMPT_DEBOUNCE_MS,
	isReadyForCapture,
	PROMPT_FADE_DURATION_MS,
	selectPrompt,
	shouldUpdatePrompt,
} from "./types";
export {
	type UseCoachingProps,
	type UseCoachingResult,
	useCoaching,
} from "./useCoaching";
