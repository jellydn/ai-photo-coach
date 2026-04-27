/**
 * Edge detection module
 * Provides dominant line detection for Travel mode scenery framing
 */

export type {
	DominantLineResult,
	FrameStats,
	LineOrientation,
} from "./types";
export {
	computeFrameStats,
	detectDominantLines,
	EDGE_DETECTION_THRESHOLD,
	getLineOrientationDescription,
	MAX_EDGE_DETECTION_LONG_EDGE,
	MIN_DOMINANT_LINE_CONFIDENCE,
	MIN_EDGE_PIXEL_RATIO,
	needsLineAlignment,
	TARGET_EDGE_DETECTION_FPS,
} from "./types";
export type {
	UseEdgeDetectionProps,
	UseEdgeDetectionResult,
} from "./useEdgeDetection";
export { useEdgeDetection } from "./useEdgeDetection";
export type { UseEdgeDetectionFrameOutputOptions } from "./useEdgeDetectionFrameOutput";
export { useEdgeDetectionFrameOutput } from "./useEdgeDetectionFrameOutput";
