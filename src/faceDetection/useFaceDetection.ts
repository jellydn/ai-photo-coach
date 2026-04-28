/**
 * Face detection stub for VisionCamera v5 migration
 * TODO: Re-implement face detection when compatible package is available
 */

import { useCallback, useState } from "react";
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
	 * Stub implementation - does nothing
	 */
	onFrame: (frame: unknown) => void;
}

/**
 * Stub hook for face detection during v5 migration
 * Returns empty/default values - face detection temporarily disabled
 */
export function useFaceDetection({
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	enabled,
	modeConfig,
}: UseFaceDetectionProps): UseFaceDetectionResult {
	const [faces] = useState<DetectedFace[]>([]);

	// Stub frame callback - does nothing
	const onFrame = useCallback(() => {
		// Face detection temporarily disabled
	}, []);

	// Compute derived values
	const primaryFace = selectPrimaryFace(faces);
	const faceAreaPercent = primaryFace?.bounds
		? calculateFaceAreaPercent(primaryFace.bounds)
		: 0;
	const framingGuidance = computeFaceFramingGuidance(
		primaryFace,
		modeConfig.faceMinAreaPct,
		modeConfig.faceMaxAreaPct,
	);

	return {
		faces,
		primaryFace,
		faceAreaPercent,
		framingGuidance,
		isProcessing: false,
		onFrame,
	};
}
