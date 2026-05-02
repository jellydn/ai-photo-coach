/**
 * Camera mode hook
 *
 * Centralizes mode detection and configuration for all capture modes.
 * Extracted from CameraScreen to reduce complexity and improve maintainability.
 *
 * This hook provides:
 * - Mode detection (food, group, product, document, pet_kids, night)
 * - Mode-specific configuration flags
 * - Derived mode properties for UI and scoring
 */

import { useMemo } from "react";
import { getModeConfig, type Mode, type ModeConfig } from "../config/modes";

export interface CameraModeState {
	/** Current capture mode */
	mode: Mode;
	/** Mode configuration (thresholds, enabled features) */
	modeConfig: ModeConfig;
	/** Mode display metadata */
	modeMetadata: {
		label: string;
		description: string;
		icon: string;
	};

	// Mode detection flags
	/** Food mode (flat-lay photography) */
	isFoodMode: boolean;
	/** Group mode (group photos) */
	isGroupMode: boolean;
	/** Product mode (product photography) */
	isProductMode: boolean;
	/** Document mode (document scanning) */
	isDocumentMode: boolean;
	/** Pet/Kids mode (fast-moving subjects) */
	isPetKidsMode: boolean;
	/** Night mode (low-light photography) */
	isNightMode: boolean;
	/** Portrait mode (default) */
	isPortraitMode: boolean;
	/** Travel mode (scenery) */
	isTravelMode: boolean;

	// Feature flags derived from mode + config
	/** Face framing is enabled for this mode */
	faceFramingEnabled: boolean;
	/** Horizon level indicator enabled */
	horizonEnabled: boolean;
	/** Lighting analysis enabled */
	lightingAnalysisEnabled: boolean;
	/** Edge detection enabled (travel mode) */
	edgeDetectionEnabled: boolean;
	/** Composition overlays enabled */
	compositionEnabled: boolean;
	/** Burst capture enabled (pet/kids mode) */
	burstEnabled: boolean;
	/** Flat-lay detection enabled (food mode) */
	flatLayEnabled: boolean;
	/** Centering guidance enabled (food/product modes) */
	centeringEnabled: boolean;
	/** Group framing enabled (group mode) */
	groupFramingEnabled: boolean;
	/** Document skew detection enabled (document mode) */
	documentSkewEnabled: boolean;
}

export interface UseCameraModeOptions {
	/** Current capture mode */
	mode: Mode;
}

/**
 * Hook to manage camera mode detection and configuration
 *
 * Centralizes all mode-specific logic in one place:
 * - Mode detection from mode string
 * - Mode configuration from modes.ts
 * - Derived feature flags for UI/scoring
 *
 * @param options - Camera mode options
 * @returns CameraModeState with all mode info and feature flags
 */
export function useCameraMode({ mode }: UseCameraModeOptions): CameraModeState {
	const modeConfig = useMemo(() => getModeConfig(mode), [mode]);

	const isFoodMode = mode === "food";
	const isGroupMode = mode === "group";
	const isProductMode = mode === "product";
	const isDocumentMode = mode === "document";
	const isPetKidsMode = mode === "pet_kids";
	const isNightMode = mode === "night";
	const isPortraitMode = mode === "portrait";
	const isTravelMode = mode === "travel";

	// Mode metadata for UI
	const modeMetadata = useMemo(() => {
		const metadata: Record<
			Mode,
			{ label: string; description: string; icon: string }
		> = {
			portrait: {
				label: "Portrait",
				description: "Perfect for people photos",
				icon: "👤",
			},
			travel: {
				label: "Travel",
				description: "Scenery and landmarks",
				icon: "🏞️",
			},
			food: {
				label: "Food",
				description: "Top-down food photography",
				icon: "🍽️",
			},
			group: {
				label: "Group",
				description: "Group photos with framing",
				icon: "👥",
			},
			product: {
				label: "Product",
				description: "Product photography",
				icon: "📦",
			},
			document: {
				label: "Document",
				description: "Document scanning",
				icon: "📄",
			},
			pet_kids: {
				label: "Pet/Kids",
				description: "Fast-moving subjects",
				icon: "🐕",
			},
			night: {
				label: "Night",
				description: "Low-light photography",
				icon: "🌙",
			},
		};
		return metadata[mode];
	}, [mode]);

	// Derived feature flags
	const faceFramingEnabled = modeConfig.faceFraming;
	const horizonEnabled = modeConfig.showHorizon;
	const lightingAnalysisEnabled = modeConfig.lightingAnalysis;
	const edgeDetectionEnabled = modeConfig.edgeDetection;
	const compositionEnabled = modeConfig.showOverlays;
	const burstEnabled = isPetKidsMode; // Burst only for pet/kids
	const flatLayEnabled = isFoodMode; // Flat-lay only for food
	const centeringEnabled = isFoodMode || isProductMode; // Centering for food/product
	const groupFramingEnabled = isGroupMode;
	const documentSkewEnabled = isDocumentMode;

	return {
		mode,
		modeConfig,
		modeMetadata,

		isFoodMode,
		isGroupMode,
		isProductMode,
		isDocumentMode,
		isPetKidsMode,
		isNightMode,
		isPortraitMode,
		isTravelMode,

		faceFramingEnabled,
		horizonEnabled,
		lightingAnalysisEnabled,
		edgeDetectionEnabled,
		compositionEnabled,
		burstEnabled,
		flatLayEnabled,
		centeringEnabled,
		groupFramingEnabled,
		documentSkewEnabled,
	};
}
