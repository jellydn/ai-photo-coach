/**
 * Face detection hook using MLKit via react-native-vision-camera-face-detector v2
 * Uses VisionCamera v5's useFrameOutput + useAsyncRunner for async face detection
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	type Frame,
	useAsyncRunner,
	useFrameOutput,
} from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import type { ModeConfig } from "../config/modes";
import {
	calculateFaceAreaPercent,
	computeFaceFramingGuidance,
	type DetectedFace,
	type FaceBounds,
	type FaceFramingGuidance,
	selectPrimaryFace,
} from "./types";

interface UseFaceDetectionProps {
	enabled: boolean;
	modeConfig: ModeConfig;
}

export interface UseFaceDetectionResult {
	faces: DetectedFace[];
	primaryFace: DetectedFace | undefined;
	faceAreaPercent: number;
	framingGuidance: FaceFramingGuidance;
	isProcessing: boolean;
	frameOutput: ReturnType<typeof useFrameOutput> | null;
}

function normalizePluginFaceToDetectedFace(
	bounds: { x: number; y: number; width: number; height: number },
	landmarks:
		| Record<string, { x: number; y: number } | undefined>
		| undefined,
	frameWidth: number,
	frameHeight: number,
	index: number,
	trackingId?: number,
	rollAngle?: number,
	pitchAngle?: number,
	yawAngle?: number,
	confidence?: number,
): DetectedFace {
	const normalizedBounds: FaceBounds = {
		x: bounds.x / frameWidth,
		y: bounds.y / frameHeight,
		width: bounds.width / frameWidth,
		height: bounds.height / frameHeight,
	};

	const leftEye = landmarks?.LEFT_EYE;
	const rightEye = landmarks?.RIGHT_EYE;
	const noseBase = landmarks?.NOSE_BASE;
	const leftMouth = landmarks?.MOUTH_LEFT;
	const rightMouth = landmarks?.MOUTH_RIGHT;

	return {
		id: trackingId?.toString() ?? `face-${index}`,
		bounds: normalizedBounds,
		landmarks: landmarks
			? {
					leftEye: leftEye
						? { x: leftEye.x / frameWidth, y: leftEye.y / frameHeight }
						: undefined,
					rightEye: rightEye
						? { x: rightEye.x / frameWidth, y: rightEye.y / frameHeight }
						: undefined,
					noseBase: noseBase
						? { x: noseBase.x / frameWidth, y: noseBase.y / frameHeight }
						: undefined,
					leftMouth: leftMouth
						? { x: leftMouth.x / frameWidth, y: leftMouth.y / frameHeight }
						: undefined,
					rightMouth: rightMouth
						? {
								x: rightMouth.x / frameWidth,
								y: rightMouth.y / frameHeight,
							}
						: undefined,
				}
			: undefined,
		confidence: confidence ?? 0.9,
		rollAngle: rollAngle ?? 0,
		pitchAngle: pitchAngle ?? 0,
		yawAngle: yawAngle ?? 0,
	};
}

export function useFaceDetection({
	enabled,
	modeConfig,
}: UseFaceDetectionProps): UseFaceDetectionResult {
	const [faces, setFaces] = useState<DetectedFace[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	// Track in-flight detection to handle enabled state changes
	const inFlightDetectionRef = useRef<boolean>(false);
	const enabledRef = useRef(enabled);

	// Keep enabled ref up to date for frame processor worklet
	useEffect(() => {
		enabledRef.current = enabled;
		// When disabled, clear any pending face data and reset processing state
		if (!enabled) {
			setFaces([]);
			setIsProcessing(false);
			inFlightDetectionRef.current = false;
		}
	}, [enabled]);

	const faceDetector = useFaceDetector({
		performanceMode: "fast",
		trackingEnabled: true,
		minFaceSize: modeConfig.faceFraming ? 0.15 : 0.1,
		runLandmarks: true,
		runClassifications: true,
		cameraFacing: "back",
	});

	const asyncRunner = useAsyncRunner();

	useEffect(() => {
		return () => {
			try {
				faceDetector.stopListeners();
			} catch (e) {
				// Ignore cleanup errors on unmount, but log in development
				if (__DEV__) {
					console.warn("Face detector cleanup error:", e);
				}
			}
		};
	}, [faceDetector]);

	const onFacesDetected = useCallback(
		(detectedFaces: DetectedFace[]) => {
			setFaces(detectedFaces);
			setIsProcessing(false);
		},
		[],
	);

	const onFacesDetectedRef = useRef(onFacesDetected);
	onFacesDetectedRef.current = onFacesDetected;

	const onDetectionError = useCallback(() => {
		setIsProcessing(false);
	}, []);

	const onErrorRef = useRef(onDetectionError);
	onErrorRef.current = onDetectionError;

	const frameOutput = useFrameOutput({
		pixelFormat: "yuv",
		onFrame: (frame: Frame) => {
			"worklet";

			let handedOffToAsyncRunner = false;
			let startedDetection = false;

			try {
				if (!enabled) {
					return;
				}

				// Skip if a detection is already in progress to prevent overlapping operations
				if (inFlightDetectionRef.current) {
					return;
				}

				// Track that we have an in-flight detection
				inFlightDetectionRef.current = true;
				startedDetection = true;

				// Mark processing as active via runOnJS
				const setProcessingFn = (globalThis as Record<string, unknown>)
					.runOnJS as ((fn: () => void) => () => void) | undefined;
				if (setProcessingFn) {
					setProcessingFn(() => {
						setIsProcessing(true);
					})();
				}

				const finished = asyncRunner.runAsync(async () => {
					"worklet";
					try {
						const pluginFaces = await faceDetector.detectFaces(frame);

						const width = frame.width;
						const height = frame.height;

						const detectedFaces: DetectedFace[] = [];

						for (let i = 0; i < pluginFaces.length; i++) {
							const f = pluginFaces[i];
							const lm = f.landmarks;

							const landmarkMap: Record<
								string,
								{ x: number; y: number } | undefined
							> = {};
							if (lm) {
								if (lm.LEFT_EYE) {
									landmarkMap.LEFT_EYE = {
										x: lm.LEFT_EYE.x,
										y: lm.LEFT_EYE.y,
									};
								}
								if (lm.RIGHT_EYE) {
									landmarkMap.RIGHT_EYE = {
										x: lm.RIGHT_EYE.x,
										y: lm.RIGHT_EYE.y,
									};
								}
								if (lm.NOSE_BASE) {
									landmarkMap.NOSE_BASE = {
										x: lm.NOSE_BASE.x,
										y: lm.NOSE_BASE.y,
									};
								}
								if (lm.MOUTH_LEFT) {
									landmarkMap.MOUTH_LEFT = {
										x: lm.MOUTH_LEFT.x,
										y: lm.MOUTH_LEFT.y,
									};
								}
								if (lm.MOUTH_RIGHT) {
									landmarkMap.MOUTH_RIGHT = {
										x: lm.MOUTH_RIGHT.x,
										y: lm.MOUTH_RIGHT.y,
									};
								}
							}

							// Use detector-provided confidence if available, otherwise fall back to expression-based heuristic
							const detectionConfidence = (f as unknown as Record<string, number>).confidence ?? Math.max(
								f.leftEyeOpenProbability ?? 0.9,
								f.rightEyeOpenProbability ?? 0.9,
								f.smilingProbability ?? 0.9,
							);

							detectedFaces.push(
								normalizePluginFaceToDetectedFace(
									{
										x: f.bounds.x,
										y: f.bounds.y,
										width: f.bounds.width,
										height: f.bounds.height,
									},
									lm ? landmarkMap : undefined,
									width,
									height,
									i,
									f.trackingId ?? undefined,
									f.rollAngle ?? undefined,
									f.pitchAngle ?? undefined,
									f.yawAngle ?? undefined,
									detectionConfidence,
								),
							);
						}

						const runOnJSFn = (globalThis as Record<string, unknown>)
							.runOnJS as ((fn: () => void) => () => void) | undefined;
						if (runOnJSFn) {
							const callback = runOnJSFn(() => {
								// Check if still enabled before updating state
								if (enabledRef.current) {
									onFacesDetectedRef.current(detectedFaces);
								}
								inFlightDetectionRef.current = false;
							});
							callback();
						} else {
							// Fallback: clear guard when runOnJS unavailable (e.g., mock environments)
							inFlightDetectionRef.current = false;
						}
					} catch {
						const runOnJSFn = (globalThis as Record<string, unknown>)
							.runOnJS as ((fn: () => void) => () => void) | undefined;
						if (runOnJSFn) {
							const callback = runOnJSFn(() => {
								// Check if still enabled before updating state
								if (enabledRef.current) {
									onErrorRef.current();
								}
								inFlightDetectionRef.current = false;
							});
							callback();
						} else {
							// Fallback: clear guard when runOnJS unavailable
							inFlightDetectionRef.current = false;
						}
					} finally {
						frame.dispose();
					}
				});

				handedOffToAsyncRunner = finished;
			} finally {
				if (!handedOffToAsyncRunner) {
					if (startedDetection) {
						inFlightDetectionRef.current = false;
					}
					frame.dispose();
				}
			}
		},
	});

	if (!enabled) {
		const primaryFace = selectPrimaryFace([]);
		const faceAreaPercent = 0;
		const framingGuidance = computeFaceFramingGuidance(
			undefined,
			modeConfig.faceMinAreaPct,
			modeConfig.faceMaxAreaPct,
		);

		return {
			faces: [],
			primaryFace,
			faceAreaPercent,
			framingGuidance,
			isProcessing: false,
			frameOutput: null,
		};
	}

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
		isProcessing,
		frameOutput,
	};
}
