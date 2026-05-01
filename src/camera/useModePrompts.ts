/**
 * Mode-specific prompts hook
 *
 * Generates coaching prompts based on the current capture mode.
 * Centralizes mode-specific prompt logic that was previously scattered
 * throughout CameraScreen.
 *
 * This addresses the CONCERNS.md issue: "Mode logic is centralized in a
 * single camera composition path" by extracting mode-specific prompts
 * into a dedicated, testable hook.
 */

import { useMemo } from "react";
import type { Mode } from "../config/modes";
import type { DocumentSkewResult } from "../documentDetection";
import type { GroupFramingAnalysis } from "../faceDetection";

export interface ModePromptsResult {
	/** Food mode: Prompt to shoot from above when not flat-lay */
	flatLayPrompt: string | null;
	/** Food mode: Prompt to center the dish when flat-lay achieved */
	centeringPrompt: string | null;
	/** Document mode: Prompt to hold phone level */
	phoneLevelPrompt: string | null;
	/** Document mode: Prompt for document skew issues */
	documentSkewPrompt: string | null;
	/** Group mode: Prompt for group framing issues */
	groupFramingPrompt: string | null;
	/** Pet/Kids mode: Dynamic prompt based on stability and score */
	petKidsModePrompt: string | null;
	/** Night mode: Low-light specific prompts */
	nightModePrompt: string | null;
}

export interface UseModePromptsOptions {
	/** Current capture mode */
	mode: Mode;
	/** Pitch angle for food/document modes */
	pitch: number;
	/** Document pitch angle (separate from food mode) */
	documentPitch: number;
	/** Whether flat-lay is achieved (food mode) */
	isFlatLay: boolean;
	/** Group framing analysis results */
	groupAnalysis?: GroupFramingAnalysis;
	/** Document skew detection results */
	documentSkewResult: DocumentSkewResult | null;
	/** Whether device is stable (for Pet/Kids/Night modes) */
	isStable: boolean;
	/** Current score (for Pet/Kids/Night modes) */
	score: number;
	/** Auto-capture threshold (for Pet/Kids/Night modes) */
	autoCaptureThreshold: number;
	/** Current lighting classification (for Night mode) */
	lightingClass: "too_dark" | "too_bright" | "backlit" | "good";
}

// Constants for prompt thresholds
const PHONE_LEVEL_TARGET = 90; // degrees (straight down)
const PHONE_LEVEL_TOLERANCE = 10; // degrees

/**
 * Hook to generate mode-specific coaching prompts
 *
 * Centralizes prompt logic for all capture modes:
 * - Food: Flat-lay guidance, centering prompts
 * - Document: Phone level, document skew
 * - Group: Group framing
 * - Pet/Kids: Stability-based dynamic prompts
 *
 * @param options - Mode state and sensor data
 * @returns ModePromptsResult with all applicable prompts
 */
export function useModePrompts({
	mode,
	pitch: _pitch,
	documentPitch,
	isFlatLay,
	groupAnalysis,
	documentSkewResult,
	isStable,
	score,
	autoCaptureThreshold,
	lightingClass,
}: UseModePromptsOptions): ModePromptsResult {
	const isFoodMode = mode === "food";
	const isGroupMode = mode === "group";
	const isDocumentMode = mode === "document";
	const isPetKidsMode = mode === "pet_kids";
	const isNightMode = mode === "night";

	return useMemo(() => {
		// Food mode prompts
		const flatLayPrompt =
			isFoodMode && !isFlatLay ? "Shoot from above" : null;

		const centeringPrompt =
			isFoodMode && isFlatLay ? "Center the dish" : null;

		// Document mode prompts
		const phoneLevelPrompt = isDocumentMode
			? Math.abs(documentPitch - PHONE_LEVEL_TARGET) > PHONE_LEVEL_TOLERANCE
				? "Hold phone level"
				: null
			: null;

		const documentSkewPrompt = isDocumentMode
			? (documentSkewResult?.prompt ?? null)
			: null;

		// Group mode prompts
		const groupFramingPrompt = isGroupMode
			? (groupAnalysis?.prompt ?? null)
			: null;

		// Pet/Kids mode prompts - dynamic based on conditions
		let petKidsModePrompt: string | null = null;
		if (isPetKidsMode) {
			if (!isStable) {
				petKidsModePrompt = "Brace your phone";
			} else if (isStable && score >= 60 && score < autoCaptureThreshold) {
				petKidsModePrompt = "Wait for it…";
			}
			// When score >= threshold, auto-capture countdown handles it
		}

		// Night mode prompts - low-light specific guidance
		let nightModePrompt: string | null = null;
		if (isNightMode) {
			if (lightingClass === "too_dark") {
				nightModePrompt = "Find brighter spot";
			} else if (!isStable && lightingClass !== "good") {
				nightModePrompt = "Hold very steady";
			} else if (isStable && score >= 50 && score < autoCaptureThreshold) {
				nightModePrompt = "Brace your phone";
			}
		}

		return {
			flatLayPrompt,
			centeringPrompt,
			phoneLevelPrompt,
			documentSkewPrompt,
			groupFramingPrompt,
			petKidsModePrompt,
			nightModePrompt,
		};
	}, [
		isFoodMode,
		isGroupMode,
		isDocumentMode,
		isPetKidsMode,
		isNightMode,
		isFlatLay,
		documentPitch,
		documentSkewResult,
		groupAnalysis,
		isStable,
		score,
		autoCaptureThreshold,
		lightingClass,
	]);
}
