/**
 * Edge detection module for Travel mode
 * Detects strong vertical/horizontal lines for scenery framing guidance
 */

/**
 * Line orientation types
 */
export type LineOrientation = "horizontal" | "vertical" | "none";

/**
 * Dominant line detection result
 */
export interface DominantLineResult {
	/** Whether strong dominant lines were detected */
	hasDominantLines: boolean;
	/** Primary orientation of detected lines */
	primaryOrientation: LineOrientation;
	/** Confidence score (0-1) for line detection */
	confidence: number;
	/** Whether lines are aligned with frame edges */
	isAligned: boolean;
	/** User-facing prompt for line alignment */
	prompt: string | null;
}

/**
 * Frame statistics for edge detection
 * Simplified representation of downsampled frame data
 */
export interface FrameStats {
	/** Frame width in pixels */
	width: number;
	/** Frame height in pixels */
	height: number;
	/** Edge magnitude data (horizontal edges) - normalized 0-1 */
	horizontalEdges: number[];
	/** Edge magnitude data (vertical edges) - normalized 0-1 */
	verticalEdges: number[];
	/** Mean edge strength across frame (0-1) */
	meanEdgeStrength: number;
}

/**
 * Default threshold for strong edge detection
 * Values above this are considered significant edges
 */
export const EDGE_DETECTION_THRESHOLD = 0.3;

/**
 * Minimum confidence required to consider lines dominant
 */
export const MIN_DOMINANT_LINE_CONFIDENCE = 0.6;

/**
 * Minimum ratio of edge pixels to total for dominant lines
 */
export const MIN_EDGE_PIXEL_RATIO = 0.15;

/**
 * Target FPS for edge detection processing
 */
export const TARGET_EDGE_DETECTION_FPS = 20;

/**
 * Maximum long edge dimension for downsampling (matches other modules)
 */
export const MAX_EDGE_DETECTION_LONG_EDGE = 320;

/**
 * Detect dominant lines in frame statistics
 * Pure function for unit testing
 *
 * Algorithm:
 * 1. Calculate mean edge strength for horizontal and vertical separately
 * 2. Compare against threshold to determine if lines are strong
 * 3. Calculate confidence based on edge pixel ratio and strength
 * 4. Determine if alignment is needed
 *
 * @param frameStats - Frame statistics with edge data
 * @returns Dominant line detection result with prompt
 */
export function detectDominantLines(
	frameStats: FrameStats,
): DominantLineResult {
	const { horizontalEdges, verticalEdges } = frameStats;

	// Edge arrays contain sampled pixels - use their length for ratio calculation
	const totalSampledPixels = Math.max(
		horizontalEdges.length,
		verticalEdges.length,
	);

	// Handle empty edge arrays
	if (totalSampledPixels === 0) {
		return {
			hasDominantLines: false,
			primaryOrientation: "none",
			confidence: 0,
			isAligned: false,
			prompt: null,
		};
	}

	// Calculate mean strengths
	const horizontalMean =
		horizontalEdges.length > 0
			? horizontalEdges.reduce((sum, val) => sum + val, 0) /
				horizontalEdges.length
			: 0;
	const verticalMean =
		verticalEdges.length > 0
			? verticalEdges.reduce((sum, val) => sum + val, 0) / verticalEdges.length
			: 0;

	// Count strong edge pixels (above threshold)
	const strongHorizontalEdges = horizontalEdges.filter(
		(e) => e > EDGE_DETECTION_THRESHOLD,
	).length;
	const strongVerticalEdges = verticalEdges.filter(
		(e) => e > EDGE_DETECTION_THRESHOLD,
	).length;

	// Calculate ratios based on sampled pixels (not full frame)
	const horizontalRatio = strongHorizontalEdges / totalSampledPixels;
	const verticalRatio = strongVerticalEdges / totalSampledPixels;
	const maxRatio = Math.max(horizontalRatio, verticalRatio);
	const dominantMean =
		horizontalMean > verticalMean ? horizontalMean : verticalMean;

	// Calculate confidence based on edge strength and coverage
	// Stronger edges and higher coverage = higher confidence
	const baseConfidence = dominantMean * 0.6 + maxRatio * 0.4;
	const scaledConfidence = Math.min(1, baseConfidence * 2);

	// Determine if we have dominant lines
	const hasDominantLines =
		scaledConfidence > MIN_DOMINANT_LINE_CONFIDENCE &&
		dominantMean > EDGE_DETECTION_THRESHOLD * 0.5;

	// Determine primary orientation
	let primaryOrientation: LineOrientation = "none";
	if (hasDominantLines) {
		if (horizontalMean > verticalMean * 1.2) {
			primaryOrientation = "horizontal";
		} else if (verticalMean > horizontalMean * 1.2) {
			primaryOrientation = "vertical";
		} else {
			// Similar strength - pick based on edge ratio
			primaryOrientation =
				horizontalRatio > verticalRatio ? "horizontal" : "vertical";
		}
	}

	// Determine if alignment is needed
	// Lines are "aligned" when confidence is high (> 0.75)
	const isAligned = hasDominantLines && scaledConfidence > 0.75;

	// Generate prompt if lines detected but need alignment
	const prompt = hasDominantLines && !isAligned ? "Align with line" : null;

	return {
		hasDominantLines,
		primaryOrientation,
		confidence: Math.round(scaledConfidence * 100) / 100,
		isAligned,
		prompt,
	};
}

/**
 * Compute frame statistics from pixel data
 * Simplified edge detection using gradient approximation
 *
 * @param pixelData - RGBA pixel data
 * @param width - Frame width
 * @param height - Frame height
 * @returns FrameStats for detectDominantLines
 */
export function computeFrameStats(
	pixelData: Uint8Array,
	width: number,
	height: number,
): FrameStats {
	const horizontalEdges: number[] = [];
	const verticalEdges: number[] = [];
	let totalEdgeStrength = 0;

	// Sample every 4th pixel for performance (still gives good edge detection)
	const sampleStep = 4;

	for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
		for (let x = sampleStep; x < width - sampleStep; x += sampleStep) {
			const idx = (y * width + x) * 4;

			// Get luminance at current and neighboring pixels
			const currentLum = getLuminance(pixelData, idx);

			// Horizontal edge: compare with pixel to the right
			const rightIdx = (y * width + (x + sampleStep)) * 4;
			const rightLum = getLuminance(pixelData, rightIdx);
			const hEdge = Math.abs(currentLum - rightLum) / 255;

			// Vertical edge: compare with pixel below
			const belowIdx = ((y + sampleStep) * width + x) * 4;
			const belowLum = getLuminance(pixelData, belowIdx);
			const vEdge = Math.abs(currentLum - belowLum) / 255;

			horizontalEdges.push(hEdge);
			verticalEdges.push(vEdge);
			totalEdgeStrength += Math.max(hEdge, vEdge);
		}
	}

	const totalPixels = horizontalEdges.length;
	const meanEdgeStrength =
		totalPixels > 0 ? totalEdgeStrength / totalPixels : 0;

	return {
		width,
		height,
		horizontalEdges,
		verticalEdges,
		meanEdgeStrength,
	};
}

/**
 * Calculate luminance from RGBA pixel data
 */
function getLuminance(pixelData: Uint8Array, idx: number): number {
	const r = pixelData[idx];
	const g = pixelData[idx + 1];
	const b = pixelData[idx + 2];
	// ITU-R BT.601 coefficients
	return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Check if dominant lines are detected and alignment is needed
 * Convenience function for coaching system
 *
 * @param result - Dominant line detection result
 * @returns true if alignment prompt should be shown
 */
export function needsLineAlignment(result: DominantLineResult): boolean {
	return result.hasDominantLines && !result.isAligned;
}

/**
 * Get user-friendly line orientation description
 *
 * @param orientation - Line orientation type
 * @returns Human-readable description
 */
export function getLineOrientationDescription(
	orientation: LineOrientation,
): string {
	switch (orientation) {
		case "horizontal":
			return "horizontal lines (like horizons)";
		case "vertical":
			return "vertical lines (like buildings)";
		case "none":
			return "no strong lines";
		default:
			return "unknown";
	}
}
