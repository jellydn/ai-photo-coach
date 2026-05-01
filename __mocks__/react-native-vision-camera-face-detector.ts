/**
 * Mock for react-native-vision-camera-face-detector v2 (Nitro Modules API)
 */

import type { FaceDetectorOptions } from "react-native-vision-camera-face-detector";

export interface MockFace {
	bounds: { x: number; y: number; width: number; height: number };
	trackingId?: number;
	rollAngle: number;
	pitchAngle: number;
	yawAngle: number;
	leftEyeOpenProbability?: number;
	rightEyeOpenProbability?: number;
	smilingProbability?: number;
	landmarks?: Record<string, { position: { x: number; y: number } }>;
}

const defaultMockFaces: MockFace[] = [
	{
		bounds: { x: 150, y: 100, width: 200, height: 250 },
		trackingId: 1,
		rollAngle: 0,
		pitchAngle: 5,
		yawAngle: -3,
		leftEyeOpenProbability: 0.95,
		rightEyeOpenProbability: 0.93,
		smilingProbability: 0.8,
		landmarks: {
			leftEye: { position: { x: 200, y: 180 } },
			rightEye: { position: { x: 300, y: 180 } },
			noseBase: { position: { x: 250, y: 230 } },
			leftMouth: { position: { x: 210, y: 290 } },
			rightMouth: { position: { x: 290, y: 290 } },
		},
	},
];

let mockFaces: MockFace[] = [...defaultMockFaces];

export function setMockFaces(faces: MockFace[]): void {
	mockFaces = faces;
}

export function resetMockFaces(): void {
	mockFaces = [...defaultMockFaces];
}

export const useFaceDetector = jest.fn((_options?: FaceDetectorOptions) => ({
	detectFaces: jest.fn(
		(_frame: unknown): Promise<MockFace[]> => Promise.resolve(mockFaces),
	),
	stopListeners: jest.fn(),
}));

export const createFaceDetector = jest.fn((_options?: FaceDetectorOptions) => ({
	detectFaces: jest.fn(
		(_frame: unknown): Promise<MockFace[]> => Promise.resolve(mockFaces),
	),
	stopListeners: jest.fn(),
}));

export const useImageFaceDetector = jest.fn(() => ({
	detectFaces: jest.fn(
		(_image: unknown): Promise<MockFace[]> => Promise.resolve(mockFaces),
	),
}));

export default {
	useFaceDetector,
	createFaceDetector,
	useImageFaceDetector,
	setMockFaces,
	resetMockFaces,
};
