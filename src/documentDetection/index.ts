/**
 * Document detection module for Document mode
 * Provides document skew detection and alignment guidance
 */

export type {
	DocumentCorners,
	DocumentSkewResult,
} from "./types";

export {
	detectDocumentSkew,
	estimateDocumentCorners,
	getDocumentStatusDescription,
	isDocumentAligned,
	MIN_DOCUMENT_CONFIDENCE,
	SKEW_ANGLE_THRESHOLD,
} from "./types";
