/**
 * Face detection hook for VisionCamera v5
 * Integrates MLKit face detection with camera frames
 */

import { useCallback, useEffect, useState } from "react";
import {
	type Face,
	useFaceDetector,
} from "react-native-vision-camera-face-detector";
import "react-native-worklets-core";
import type { ModeConfig } from "../config/modes";
import {
	calculateFaceAreaPercent,
	computeFaceFramingGuidance,
	type DetectedFace,
	type FaceFramingGuidance,
	selectPrimaryFace,
} from "./types";

/**
 * Props for useFaceDetection hook
 */
interface UseFaceDetectionProps {
	/** Whether face detection is enabled */
	enabled: boolean;
	/** Mode configuration for thresholds */
	modeConfig: ModeConfig;
}

/**
 * Result from useFaceDetection hook
 */
interface UseFaceDetectionResult {
	/** All detected faces in current frame */
	faces: DetectedFace[];
	/** Primary face (largest or most centered) */
	primaryFace: DetectedFace | undefined;
	/** Face area as percentage of frame */
	faceAreaPercent: number;
	/** Framing guidance for user prompts */
	framingGuidance: FaceFramingGuidance;
	/** Whether face detection is currently processing */
	isProcessing: boolean;
	/**
	 * Frame callback for face detection.
	 * Pass this to the Camera component from react-native-vision-camera-face-detector
	 */
	onFrame: (faces: Face[]) => void;
}

/**
 * Convert face detector plugin result to DetectedFace format
 * Plugin returns pixel coordinates, we convert to normalized (0-1)
 */
function convertPluginFaces(
	pluginFaces: Face[],
	frameWidth: number,
	frameHeight: number,
): DetectedFace[] {
	return pluginFaces.map((face, index) => ({
		id: face.trackingId?.toString() ?? `face-${index}`,
		bounds: {
			// Plugin returns pixel coordinates, convert to normalized (0-1)
			x: face.bounds.x / frameWidth,
			y: face.bounds.y / frameHeight,
			width: face.bounds.width / frameWidth,
			height: face.bounds.height / frameHeight,
		},
		confidence: 0.85, // Default confidence since plugin doesn't provide it directly
		rollAngle: face.rollAngle,
		pitchAngle: face.pitchAngle,
		yawAngle: face.yawAngle,
		landmarks: face.landmarks
			? {
					leftEye: face.landmarks.LEFT_EYE,
					rightEye: face.landmarks.RIGHT_EYE,
					noseBase: face.landmarks.NOSE_BASE,
					leftMouth: face.landmarks.MOUTH_LEFT,
					rightMouth: face.landmarks.MOUTH_RIGHT,
				}
			: undefined,
	}));
}

/**
 * Hook for face detection using MLKit via react-native-vision-camera-face-detector
 *
 * This hook:
 * - Creates a face detector with optimized settings for real-time framing guidance
 * - Provides a frame callback to integrate with the Camera component
 * - Tracks detected faces and computes framing guidance
 * - Runs at >= 20 FPS by using fast performance mode
 *
 * Usage:
 * ```tsx
 * const { onFrame, faces, primaryFace } = useFaceDetection({
 *   enabled: true,
 *   modeConfig,
 * });
 *
 * // Use with Camera wrapper from react-native-vision-camera-face-detector
 * <Camera
 *   faceDetectionCallback={onFrame}
 *   faceDetectionOptions={{ performanceMode: 'fast', minFaceSize: 0.15 }}
 *   ...
 * />
 * ```
 */
export function useFaceDetection({
	enabled,
	modeConfig,
}: UseFaceDetectionProps): UseFaceDetectionResult {
	// State for detection results
	const [faces, setFaces] = useState<DetectedFace[]>([]);
	const [primaryFace, setPrimaryFace] = useState<DetectedFace | undefined>();
	const [faceAreaPercent, setFaceAreaPercent] = useState<number>(0);
	const [framingGuidance, setFramingGuidance] = useState<FaceFramingGuidance>(
		computeFaceFramingGuidance(
			undefined,
			modeConfig.faceMinAreaPct,
			modeConfig.faceMaxAreaPct,
		),
	);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [frameDimensions] = useState<{
		width: number;
		height: number;
	}>({ width: 640, height: 480 }); // Default dimensions

	// Create face detector with optimized settings for framing
	// Fast mode prioritizes speed over accuracy for real-time feedback
	useFaceDetector({
		performanceMode: "fast",
		classificationMode: "none",
		minFaceSize: 0.15,
		trackingEnabled: true,
	});

	// Frame callback - receives faces from the Camera component
	// Note: This runs on the worklet thread via react-native-worklets-core
	const onFrame = useCallback(
		(pluginFaces: Face[]) => {
			"worklet";

			// Convert plugin faces to our format (pixel -> normalized coordinates)
			const detectedFaces = convertPluginFaces(
				pluginFaces,
				frameDimensions.width,
				frameDimensions.height,
			);

			// Select primary face for framing guidance
			const primary = selectPrimaryFace(detectedFaces);

			// Use runOnJS to update React state from worklet
			const runOnJS = (
				globalThis as unknown as { runOnJS?: <T>(fn: () => T) => T }
			).runOnJS;
			if (runOnJS) {
				runOnJS(() => {
					setFaces(detectedFaces);
					setPrimaryFace(primary);

					if (primary) {
						setFaceAreaPercent(calculateFaceAreaPercent(primary.bounds));
						setFramingGuidance(
							computeFaceFramingGuidance(
								primary,
								modeConfig.faceMinAreaPct,
								modeConfig.faceMaxAreaPct,
							),
						);
					} else {
						setFaceAreaPercent(0);
						setFramingGuidance(
							computeFaceFramingGuidance(
								undefined,
								modeConfig.faceMinAreaPct,
								modeConfig.faceMaxAreaPct,
							),
						);
					}
				});
			}
		},
		[
			frameDimensions.width,
			frameDimensions.height,
			modeConfig.faceMinAreaPct,
			modeConfig.faceMaxAreaPct,
		],
	);

	// Handle enabled/disabled state changes
	useEffect(() => {
		if (!enabled) {
			// Reset state when disabled
			setFaces([]);
			setPrimaryFace(undefined);
			setFaceAreaPercent(0);
			setFramingGuidance(
				computeFaceFramingGuidance(
					undefined,
					modeConfig.faceMinAreaPct,
					modeConfig.faceMaxAreaPct,
				),
			);
			setIsProcessing(false);
		} else {
			setIsProcessing(true);
		}
	}, [enabled, modeConfig]);

	return {
		faces,
		primaryFace,
		faceAreaPercent,
		framingGuidance,
		isProcessing,
		onFrame,
	};
}

// Re-export the interface for external consumers
export type { UseFaceDetectionResult };
