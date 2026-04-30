/**
 * Face detection types and utilities
 * MLKit face detection integration for VisionCamera v5
 */

/**
 * Bounding box for detected face
 * Normalized coordinates (0-1) relative to frame dimensions
 */
export interface FaceBounds {
	/** Left position (0-1) */
	x: number;
	/** Top position (0-1) */
	y: number;
	/** Width (0-1) */
	width: number;
	/** Height (0-1) */
	height: number;
}

/**
 * Face landmark positions (eyes, nose, mouth, etc.)
 */
export interface FaceLandmarks {
	/** Left eye position (normalized 0-1) */
	leftEye?: { x: number; y: number };
	/** Right eye position (normalized 0-1) */
	rightEye?: { x: number; y: number };
	/** Nose base position (normalized 0-1) */
	noseBase?: { x: number; y: number };
	/** Left mouth corner (normalized 0-1) */
	leftMouth?: { x: number; y: number };
	/** Right mouth corner (normalized 0-1) */
	rightMouth?: { x: number; y: number };
}

/**
 * Detected face data from MLKit
 */
export interface DetectedFace {
	/** Unique identifier for this face in the current frame */
	id: string;
	/** Bounding box (normalized 0-1) */
	bounds: FaceBounds;
	/** Face landmarks if available */
	landmarks?: FaceLandmarks;
	/** Detection confidence (0-1) */
	confidence: number;
	/** Rotation angle of face in degrees (-180 to 180) */
	rollAngle?: number;
	/** Pitch angle of face in degrees (-90 to 90) */
	pitchAngle?: number;
	/** Yaw angle of face in degrees (-90 to 90) */
	yawAngle?: number;
}

/**
 * Face detection result from frame processor
 */
export interface FaceDetectionResult {
	/** All detected faces */
	faces: DetectedFace[];
	/** Primary face (largest or most centered) */
	primaryFace?: DetectedFace;
	/** Frame dimensions used for detection */
	frameDimensions: { width: number; height: number };
	/** Processing time in milliseconds */
	processingTimeMs: number;
}

/**
 * Face framing guidance result
 */
export interface FaceFramingGuidance {
	/** Whether face is properly framed */
	isProperlyFramed: boolean;
	/** Area percentage of frame occupied by face (0-100) */
	faceAreaPercent: number;
	/** Whether face is too small */
	isTooSmall: boolean;
	/** Whether face is too large/close */
	isTooLarge: boolean;
	/** Prompt message for user guidance */
	prompt: string | null;
	/** Head position relative to upper third line (negative = too low, positive = too high) */
	headroomOffset: number;
}

/**
 * Downscale frame dimensions to maximum long edge while maintaining aspect ratio
 * @param width - Original width
 * @param height - Original height
 * @param maxLongEdge - Maximum long edge dimension (default 320px per spec)
 * @returns Downscaled dimensions
 */
export function downscaleFrame(
	width: number,
	height: number,
	maxLongEdge: number = 320,
): { width: number; height: number } {
	const longEdge = Math.max(width, height);
	const shortEdge = Math.min(width, height);

	if (longEdge <= maxLongEdge) {
		// No scaling needed
		return { width, height };
	}

	const scale = maxLongEdge / longEdge;
	const newLongEdge = maxLongEdge;
	const newShortEdge = Math.round(shortEdge * scale);

	if (width >= height) {
		return { width: newLongEdge, height: newShortEdge };
	}
	return { width: newShortEdge, height: newLongEdge };
}

/**
 * Calculate face area as percentage of frame
 * @param faceBounds - Normalized face bounds (0-1)
 * @returns Area percentage (0-100)
 */
export function calculateFaceAreaPercent(faceBounds: FaceBounds): number {
	return faceBounds.width * faceBounds.height * 100;
}

/**
 * Select primary face from multiple detections
 * Criteria: largest area, or most centered if similar sizes
 * @param faces - Array of detected faces
 * @returns Primary face or undefined
 */
export function selectPrimaryFace(
	faces: DetectedFace[],
): DetectedFace | undefined {
	if (faces.length === 0) return undefined;
	if (faces.length === 1) return faces[0];

	// Score each face by area and centrality
	const scoredFaces = faces.map((face) => {
		const area = face.bounds.width * face.bounds.height;

		// Calculate distance from center (0,0 is top-left, 0.5,0.5 is center)
		const centerX = face.bounds.x + face.bounds.width / 2;
		const centerY = face.bounds.y + face.bounds.height / 2;
		const distanceFromCenter = Math.sqrt(
			(centerX - 0.5) ** 2 + (centerY - 0.5) ** 2,
		);

		// Higher score = better: larger area, more centered
		// Weight area more heavily (0.7) than centrality (0.3)
		const score = area * 0.7 + (1 - distanceFromCenter) * 0.3;

		return { face, score };
	});

	// Sort by score descending and return the best
	scoredFaces.sort((a, b) => b.score - a.score);
	return scoredFaces[0].face;
}

/**
 * Compute face framing guidance
 * @param primaryFace - The primary detected face
 * @param minAreaPct - Minimum face area percentage from mode config
 * @param maxAreaPct - Maximum face area percentage from mode config
 * @returns Framing guidance for user prompts
 */
export function computeFaceFramingGuidance(
	primaryFace: DetectedFace | undefined,
	minAreaPct: number,
	maxAreaPct: number,
): FaceFramingGuidance {
	// Default guidance when no face detected
	if (!primaryFace) {
		return {
			isProperlyFramed: false,
			faceAreaPercent: 0,
			isTooSmall: true,
			isTooLarge: false,
			prompt: "No face detected",
			headroomOffset: 0,
		};
	}

	const faceAreaPercent = calculateFaceAreaPercent(primaryFace.bounds);

	// Calculate headroom - how well positioned in upper third
	// Upper third line is at y = 0.333
	// Face top should align with or be slightly above this line
	const faceTop = primaryFace.bounds.y;
	const upperThirdLine = 0.333;
	const headroomOffset = faceTop - upperThirdLine; // Negative = too low, Positive = too high

	// Determine if properly framed
	const isWithinSizeRange =
		faceAreaPercent >= minAreaPct && faceAreaPercent <= maxAreaPct;
	const isTooSmall = faceAreaPercent < minAreaPct;
	const isTooLarge = faceAreaPercent > maxAreaPct;

	// Generate appropriate prompt
	let prompt: string | null = null;
	if (isTooSmall) {
		prompt = "Step closer";
	} else if (isTooLarge) {
		prompt = "Step back";
	} else if (headroomOffset > 0.05) {
		prompt = "Lower camera";
	} else if (headroomOffset < -0.1) {
		prompt = "Raise camera";
	}

	return {
		isProperlyFramed: isWithinSizeRange && Math.abs(headroomOffset) <= 0.05,
		faceAreaPercent,
		isTooSmall,
		isTooLarge,
		prompt,
		headroomOffset,
	};
}

/**
 * Convert normalized bounds to pixel coordinates
 * @param bounds - Normalized bounds (0-1)
 * @param frameWidth - Frame width in pixels
 * @param frameHeight - Frame height in pixels
 * @returns Pixel coordinates
 */
export function normalizeBoundsToPixels(
	bounds: FaceBounds,
	frameWidth: number,
	frameHeight: number,
): {
	x: number;
	y: number;
	width: number;
	height: number;
} {
	return {
		x: bounds.x * frameWidth,
		y: bounds.y * frameHeight,
		width: bounds.width * frameWidth,
		height: bounds.height * frameHeight,
	};
}

/**
 * Group framing analysis result
 */
export interface GroupFramingAnalysis {
	/** All detected faces */
	faces: DetectedFace[];
	/** Number of faces detected */
	faceCount: number;
	/** Total combined face area as percentage of frame (0-100) */
	totalFaceAreaPercent: number;
	/** Faces that are touching or near frame edge (within 5% margin) */
	edgeTouchingFaces: DetectedFace[];
	/** Whether all faces are fully inside frame (no edge touching) */
	allFacesInFrame: boolean;
	/** Whether total face area is within acceptable range (8-70%) */
	isTotalAreaValid: boolean;
	/** Whether area is too small (< 8%) */
	isTooSmall: boolean;
	/** Whether area is too large (> 70%) */
	isTooLarge: boolean;
	/** Generated prompt for group framing guidance */
	prompt: string | null;
}

/**
 * Constants for group photo mode framing
 */
/** Minimum total face area percentage (below this = too far) */
export const GROUP_MIN_TOTAL_FACE_AREA_PCT = 8;
/** Maximum total face area percentage (above this = too close) */
export const GROUP_MAX_TOTAL_FACE_AREA_PCT = 70;
/** Margin from frame edge for edge-touching detection (5% of frame dimension) */
export const GROUP_EDGE_MARGIN_PCT = 5;

/**
 * Maximum long edge for ML processing (per spec: <= 320px)
 */
export const MAX_ML_LONG_EDGE = 320;

/**
 * Target FPS for face detection (per spec: >= 20 FPS)
 */
export const TARGET_FACE_DETECTION_FPS = 20;

/**
 * Minimum confidence threshold for face detection
 */
export const MIN_FACE_CONFIDENCE = 0.7;

/**
 * Check if a face is touching or near the frame edge
 * @param face - The detected face to check
 * @param marginPct - Margin percentage from edge (default 5%)
 * @returns true if face is touching or near edge
 */
export function isFaceTouchingEdge(
	face: DetectedFace,
	marginPct: number = GROUP_EDGE_MARGIN_PCT,
): boolean {
	const bounds = face.bounds;
	// Check if face extends into the margin zone near any edge
	const isTouchingLeft = bounds.x < marginPct / 100;
	const isTouchingRight = bounds.x + bounds.width > 1 - marginPct / 100;
	const isTouchingTop = bounds.y < marginPct / 100;
	const isTouchingBottom = bounds.y + bounds.height > 1 - marginPct / 100;
	return isTouchingLeft || isTouchingRight || isTouchingTop || isTouchingBottom;
}

/**
 * Compute total combined face area percentage for all detected faces
 * @param faces - Array of detected faces
 * @returns Total area as percentage of frame (0-100)
 */
export function computeTotalFaceAreaPercent(faces: DetectedFace[]): number {
	if (faces.length === 0) return 0;

	// Sum up all face areas (normalized 0-1, convert to percentage)
	const totalArea = faces.reduce((sum, face) => {
		return sum + face.bounds.width * face.bounds.height;
	}, 0);

	return totalArea * 100;
}

/**
 * Compute group framing analysis for multiple faces
 * @param faces - All detected faces
 * @returns GroupFramingAnalysis with counts, areas, and edge detection
 */
export function computeGroupFramingAnalysis(
	faces: DetectedFace[],
): GroupFramingAnalysis {
	const faceCount = faces.length;
	const totalFaceAreaPercent = computeTotalFaceAreaPercent(faces);

	// Find faces touching or near edges
	const edgeTouchingFaces = faces.filter((face) => isFaceTouchingEdge(face));
	const allFacesInFrame = edgeTouchingFaces.length === 0;

	// Check total area validity
	const isTooSmall = totalFaceAreaPercent < GROUP_MIN_TOTAL_FACE_AREA_PCT;
	const isTooLarge = totalFaceAreaPercent > GROUP_MAX_TOTAL_FACE_AREA_PCT;
	const isTotalAreaValid = !isTooSmall && !isTooLarge;

	// Generate appropriate prompt
	let prompt: string | null = null;
	if (faceCount < 2) {
		// Not enough faces for a group photo
		prompt = null; // Let face detection handle single face
	} else if (!allFacesInFrame) {
		prompt = "Everyone in frame?";
	} else if (isTooLarge) {
		prompt = "Step back";
	} else if (isTooSmall) {
		prompt = "Step closer";
	}

	return {
		faces,
		faceCount,
		totalFaceAreaPercent,
		edgeTouchingFaces,
		allFacesInFrame,
		isTotalAreaValid,
		isTooSmall,
		isTooLarge,
		prompt,
	};
}
