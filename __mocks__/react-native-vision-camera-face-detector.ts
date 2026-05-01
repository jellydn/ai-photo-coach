/**
 * Mock for react-native-vision-camera-face-detector
 */

export interface Face {
	id?: string;
	bounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	confidence?: number;
	rollAngle?: number;
	pitchAngle?: number;
	yawAngle?: number;
}

export interface DetectionOptions {
	classificationMode?: "all" | "none";
	performanceMode?: "fast" | "accurate";
	contourMode?: "all" | "none";
	minFaceSize?: number;
}

export interface DetectionResult {
	faces: Face[];
}

// Default mock face for testing
const defaultMockFaces: Face[] = [
	{
		id: "face-1",
		bounds: {
			x: 150,
			y: 100,
			width: 200,
			height: 250,
		},
		confidence: 0.9,
		rollAngle: 0,
		pitchAngle: 5,
		yawAngle: -3,
	},
];

// Allow tests to override the mock faces
let mockFaces: Face[] = [...defaultMockFaces];

/**
 * Set mock faces for testing
 */
export function setMockFaces(faces: Face[]): void {
	mockFaces = faces;
}

/**
 * Reset mock faces to default
 */
export function resetMockFaces(): void {
	mockFaces = [...defaultMockFaces];
}

/**
 * Mock Face object with detectFaces method
 */
export const FaceDetection = {
	detectFaces: jest.fn(
		(_frame: unknown, _options?: DetectionOptions): DetectionResult => {
			// Return mock faces - tests can override via setMockFaces
			return { faces: mockFaces };
		},
	),
};

export default {
	FaceDetection,
	setMockFaces,
	resetMockFaces,
};
