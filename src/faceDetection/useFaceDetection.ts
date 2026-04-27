/**
 * Face detection hook for VisionCamera v5
 * Integrates MLKit face detection with camera frames
 */

import { useEffect, useState } from "react";
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
}

/**
 * Mock face detection result for demonstration
 * In production, this would use MLKit via frame processor
 */
function mockDetectFaces(): DetectedFace[] {
	// Return a mock face for demonstration
	// This would be replaced with actual MLKit detection
	return [
		{
			id: "face-1",
			bounds: {
				x: 0.25,
				y: 0.25,
				width: 0.5,
				height: 0.5,
			},
			confidence: 0.9,
		},
	];
}

/**
 * Hook for face detection
 *
 * Note: In the current implementation, this hook provides a stub interface.
 * The actual MLKit face detection integration with VisionCamera v5 frame processors
 * requires native module setup which is beyond the scope of this iteration.
 *
 * The hook provides:
 * - Face detection state management
 * - Framing guidance calculation
 * - Proper TypeScript interfaces for future integration
 *
 * TODO: Integrate with react-native-vision-camera-face-detector frame processor
 * when native module configuration is complete.
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

	// Simulated detection effect
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
			return;
		}

		setIsProcessing(true);

		// Simulate face detection at ~10 FPS (every 100ms)
		// In production, this would be driven by frame processor callbacks
		const interval = setInterval(() => {
			const detectedFaces = mockDetectFaces();
			const primary = selectPrimaryFace(detectedFaces);
			const guidance = computeFaceFramingGuidance(
				primary,
				modeConfig.faceMinAreaPct,
				modeConfig.faceMaxAreaPct,
			);
			const areaPercent = primary
				? calculateFaceAreaPercent(primary.bounds)
				: 0;

			setFaces(detectedFaces);
			setPrimaryFace(primary);
			setFaceAreaPercent(areaPercent);
			setFramingGuidance(guidance);
		}, 100);

		return () => {
			clearInterval(interval);
			setIsProcessing(false);
		};
	}, [enabled, modeConfig]);

	return {
		faces,
		primaryFace,
		faceAreaPercent,
		framingGuidance,
		isProcessing,
	};
}
