/**
 * Document detection module for Document mode
 * Detects document skew and perspective distortion using edge detection
 */

import type { FrameStats } from "../edgeDetection/types";

/**
 * Document skew detection result
 */
export interface DocumentSkewResult {
	/** Whether a document was detected (dominant rectangle edges found) */
	hasDocument: boolean;
	/** Detected skew angle in degrees (0 = perfectly aligned) */
	skewAngle: number;
	/** Whether detected edges form parallel pairs (flat/aligned document) */
	isFlat: boolean;
	/** Confidence score (0-1) for document detection */
	confidence: number;
	/** User-facing prompt for document alignment */
	prompt: string | null;
}

/**
 * Document quadrilateral corners (for optional overlay)
 * Normalized coordinates (0-1)
 */
export interface DocumentCorners {
	topLeft: { x: number; y: number };
	topRight: { x: number; y: number };
	bottomLeft: { x: number; y: number };
	bottomRight: { x: number; y: number };
}

/**
 * Threshold for skew detection (degrees)
 * Above this threshold, document is considered skewed
 */
export const SKEW_ANGLE_THRESHOLD = 10;

/**
 * Minimum confidence required for document detection
 */
export const MIN_DOCUMENT_CONFIDENCE = 0.5;

/**
 * Detect document skew from frame statistics using edge detection data
 * Reuses edge detection module from Travel mode
 *
 * Algorithm:
 * 1. Analyze horizontal and vertical edge strengths
 * 2. Detect if edges form parallel pairs (rectangle-like pattern)
 * 3. Calculate skew angle from edge orientation distribution
 * 4. Generate appropriate prompt for user guidance
 *
 * @param frameStats - Frame statistics with edge data from edge detection
 * @returns Document skew detection result
 */
export function detectDocumentSkew(frameStats: FrameStats): DocumentSkewResult {
	const { horizontalEdges, verticalEdges, meanEdgeStrength } = frameStats;

	// Edge arrays contain sampled pixels - use their length for calculations
	const totalSampledPixels = Math.max(
		horizontalEdges.length,
		verticalEdges.length,
	);

	// Handle empty edge arrays (no edges detected)
	if (totalSampledPixels === 0 || meanEdgeStrength < 0.1) {
		return {
			hasDocument: false,
			skewAngle: 0,
			isFlat: false,
			confidence: 0,
			prompt: null,
		};
	}

	// Calculate edge statistics
	const horizontalMean =
		horizontalEdges.length > 0
			? horizontalEdges.reduce((sum, val) => sum + val, 0) /
				horizontalEdges.length
			: 0;
	const verticalMean =
		verticalEdges.length > 0
			? verticalEdges.reduce((sum, val) => sum + val, 0) / verticalEdges.length
			: 0;

	// Count strong edges (above threshold)
	const EDGE_THRESHOLD = 0.3;
	const strongHorizontal = horizontalEdges.filter((e) => e > EDGE_THRESHOLD);
	const strongVertical = verticalEdges.filter((e) => e > EDGE_THRESHOLD);

	// Calculate ratios
	const horizontalStrongRatio =
		horizontalEdges.length > 0
			? strongHorizontal.length / horizontalEdges.length
			: 0;
	const verticalStrongRatio =
		verticalEdges.length > 0 ? strongVertical.length / verticalEdges.length : 0;

	// Determine if we have a document-like pattern (both horizontal AND vertical edges)
	const hasHorizontalLines = horizontalStrongRatio > 0.15;
	const hasVerticalLines = verticalStrongRatio > 0.15;
	const hasDocumentPattern = hasHorizontalLines && hasVerticalLines;

	// Calculate confidence based on edge strength and coverage
	const edgeStrengthConfidence = Math.min(1, meanEdgeStrength * 3);
	const coverageConfidence = Math.min(
		1,
		(horizontalStrongRatio + verticalStrongRatio) * 2,
	);
	const confidence = Math.round(
		((edgeStrengthConfidence * 0.4 + coverageConfidence * 0.6) * 100) / 100,
	);

	// If no document pattern detected, return early
	if (!hasDocumentPattern || confidence < MIN_DOCUMENT_CONFIDENCE) {
		return {
			hasDocument: false,
			skewAngle: 0,
			isFlat: false,
			confidence,
			prompt: null,
		};
	}

	// Calculate skew angle from edge distribution
	// Higher horizontal strength relative to vertical = more horizontal skew
	// Higher vertical strength relative to horizontal = more vertical skew
	const totalMean = horizontalMean + verticalMean;
	const horizontalRatio = totalMean > 0 ? horizontalMean / totalMean : 0.5;

	// Estimate skew angle (-10 to +10 degrees based on edge ratio deviation from 0.5)
	// 0.5 = perfectly balanced (0° skew)
	// < 0.5 = more vertical (rotate clockwise)
	// > 0.5 = more horizontal (rotate counter-clockwise)
	const skewAngle =
		Math.round((horizontalRatio - 0.5) * 2 * SKEW_ANGLE_THRESHOLD * 10) / 10;

	// Determine if document is flat (parallel edges)
	// Document is flat when:
	// 1. Both horizontal and vertical edges are present
	// 2. Skew angle is within acceptable threshold
	// 3. Edge distribution is relatively balanced
	const isFlat =
		Math.abs(skewAngle) <= SKEW_ANGLE_THRESHOLD &&
		Math.abs(horizontalRatio - 0.5) < 0.3;

	// Generate prompt based on skew
	let prompt: string | null = null;
	if (!isFlat) {
		prompt = "Flatten the page";
	}

	return {
		hasDocument: true,
		skewAngle,
		isFlat,
		confidence: Math.round(confidence * 100) / 100,
		prompt,
	};
}

/**
 * Check if document is properly aligned (flat and low skew)
 * @param result - Document skew detection result
 * @returns true if document is aligned and ready for capture
 */
export function isDocumentAligned(result: DocumentSkewResult): boolean {
	return result.hasDocument && result.isFlat && Math.abs(result.skewAngle) <= 3;
}

/**
 * Get user-friendly description of document detection state
 * @param result - Document skew detection result
 * @returns Human-readable description
 */
export function getDocumentStatusDescription(
	result: DocumentSkewResult,
): string {
	if (!result.hasDocument) {
		return "No document detected";
	}

	if (result.isFlat && Math.abs(result.skewAngle) <= 3) {
		return "Document aligned and ready";
	}

	if (!result.isFlat) {
		return "Document has perspective skew";
	}

	return `Document slightly rotated (${result.skewAngle.toFixed(1)}°)`;
}

/**
 * Estimate document corners from edge data (simplified approximation)
 * This is a basic rectangle approximation based on detected edges
 *
 * @param frameStats - Frame statistics with edge data
 * @returns Approximate document corners or null if no document detected
 */
export function estimateDocumentCorners(
	frameStats: FrameStats,
): DocumentCorners | null {
	const result = detectDocumentSkew(frameStats);

	if (!result.hasDocument) {
		return null;
	}

	// Simplified estimation: assume document fills most of the frame
	// with slight margin adjustments based on edge distribution
	const margin = 0.1; // 10% margin

	// Adjust corners slightly based on skew angle to simulate perspective
	const skewOffset = (result.skewAngle / SKEW_ANGLE_THRESHOLD) * 0.05;

	return {
		topLeft: { x: margin + skewOffset, y: margin - skewOffset },
		topRight: { x: 1 - margin + skewOffset, y: margin + skewOffset },
		bottomLeft: { x: margin - skewOffset, y: 1 - margin - skewOffset },
		bottomRight: { x: 1 - margin - skewOffset, y: 1 - margin + skewOffset },
	};
}
