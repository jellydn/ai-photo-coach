/**
 * Scoring UI helpers - Labels, colors, and breakdown messages
 */

import type { SubScores } from "./types";
import { SCORE_THRESHOLDS } from "./weights";

/**
 * Get human-readable label for subscore
 * @param subscore - Subscore key
 * @returns Human-readable label
 */
export function getSubscoreLabel(subscore: keyof SubScores): string {
	const labels: Record<keyof SubScores, string> = {
		stability: "Stability",
		level: "Horizon Level",
		framing: "Face Framing",
		lighting: "Lighting",
		aesthetic: "Aesthetic Quality",
		flatLay: "Flat-Lay Angle",
		groupFraming: "Group Framing",
		centering: "Subject Centering",
		documentSkew: "Document Alignment",
		lowLightStability: "Low-Light Stability",
	};
	return labels[subscore];
}

/**
 * Get color for score level
 * @param score - Score 0-100
 * @returns Color hex code
 */
export function getScoreColor(score: number): string {
	if (score < SCORE_THRESHOLDS.POOR) {
		return "#FF3B30"; // Red
	}
	if (score < SCORE_THRESHOLDS.GOOD) {
		return "#FFCC00"; // Yellow
	}
	return "#34C759"; // Green
}

/**
 * Get score breakdown message showing weakest area
 * @param result - Score result from computeScore
 * @returns Human-readable breakdown message
 */
export function getScoreBreakdown(result: {
	subScores: SubScores;
	weakestSubscore: keyof SubScores;
	score: number;
}): string {
	const { subScores, weakestSubscore, score } = result;

	if (score >= SCORE_THRESHOLDS.GOOD) {
		return "Great shot! All conditions look good.";
	}

	const weakestLabel = getSubscoreLabel(weakestSubscore);
	const weakestValue = subScores[weakestSubscore];

	if (weakestValue < SCORE_THRESHOLDS.POOR) {
		return `${weakestLabel} needs significant improvement (${weakestValue}/100)`;
	}

	return `${weakestLabel} could be better (${weakestValue}/100)`;
}
