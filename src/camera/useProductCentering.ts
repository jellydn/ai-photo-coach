/**
 * Product mode centering hook
 *
 * Provides centering guidance for product photography.
 * Currently uses a heuristic based on stability (MVP implementation).
 * TODO: Replace with real frame analysis when frame processors are active.
 *
 * The heuristic assumes that when the device is stable, the user has likely
 * centered the product reasonably well. When unstable, centering is assumed
 * to be worse.
 */

import { useMemo } from "react";
import type { LightingClass } from "../lighting/types";

export interface ProductCenteringResult {
	/** Subject centroid X position (0-1, 0.5 = center) */
	centroidX: number;
	/** Subject centroid Y position (0-1, 0.5 = center) */
	centroidY: number;
	/** Background luminance variance (0-1, higher = more cluttered) */
	backgroundVariance: number;
	/** Whether the product appears centered (within 20% of center) */
	isCentered: boolean;
	/** Centering prompt if product is off-center */
	centeringPrompt: string | null;
	/** Background prompt if background is cluttered */
	backgroundPrompt: string | null;
}

export interface UseProductCenteringOptions {
	/** Whether product mode is active */
	enabled: boolean;
	/** Whether device is currently stable */
	isStable: boolean;
	/** Current lighting classification */
	lightingClass: LightingClass;
}

/**
 * Hook to provide product centering guidance
 *
 * MVP Implementation: Uses stability-based heuristic
 * - Stable device → assume good centering (centroid near 0.5, 0.5)
 * - Unstable device → assume worse centering (centroid varies more)
 * - Good lighting → assume clean background
 * - Poor lighting → assume cluttered background
 *
 * Future: Replace with actual frame analysis (subject detection, segmentation)
 *
 * @param options - Configuration options
 * @returns ProductCenteringResult with centering guidance
 */
export function useProductCentering({
	enabled,
	isStable,
	lightingClass,
}: UseProductCenteringOptions): ProductCenteringResult {
	return useMemo(() => {
		// Return neutral values when not in product mode
		if (!enabled) {
			return {
				centroidX: 0.5,
				centroidY: 0.5,
				backgroundVariance: 0,
				isCentered: true,
				centeringPrompt: null,
				backgroundPrompt: null,
			};
		}

		// Derive centering quality from stability
		// Stable = better centered (deterministic based on stability, not random)
		const stabilityFactor = isStable ? 0.9 : 0.6;
		const deviation = (1 - stabilityFactor) * 0.2; // Max 20% deviation

		// Deterministic centering based on stability (not random)
		// When stable: centroid is very close to center (0.5 ± 0.02)
		// When unstable: centroid deviates more (0.5 ± 0.1)
		const centroidX = isStable ? 0.5 + deviation * 0.1 : 0.5 + deviation * 0.5;
		const centroidY = isStable ? 0.5 + deviation * 0.1 : 0.5 + deviation * 0.5;

		// Estimate background variance from lighting
		// Good lighting → clean background (low variance)
		// Poor lighting → potentially cluttered (higher variance)
		const backgroundVariance =
			lightingClass === "good"
				? 0.08
				: lightingClass === "backlit"
					? 0.15
					: lightingClass === "too_bright"
						? 0.2
						: 0.25; // too_dark or unknown

		// Calculate distance from center
		const distance = Math.sqrt(
			(centroidX - 0.5) ** 2 + (centroidY - 0.5) ** 2,
		);
		const isCentered = distance <= 0.2;

		// Generate prompts
		const centeringPrompt = !isCentered ? "Center your product" : null;
		const backgroundPrompt =
			backgroundVariance > 0.15 ? "Use plain background" : null;

		return {
			centroidX,
			centroidY,
			backgroundVariance,
			isCentered,
			centeringPrompt,
			backgroundPrompt,
		};
	}, [enabled, isStable, lightingClass]);
}
