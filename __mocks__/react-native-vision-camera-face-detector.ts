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

export const FaceDetection = {
	detectFaces: jest.fn(
		(_frame: unknown, _options?: DetectionOptions): DetectionResult => {
			// Return empty faces by default - tests can mock this to return specific faces
			return { faces: [] };
		},
	),
};

export default {
	FaceDetection,
};
