/**
 * useShotAnalysis — deep module behind the shot-analysis seam.
 *
 * Owns the sensor subscriptions, frame analysis, and scoring intake that
 * CameraScreen used to wire by hand (~15 hooks, ~20 hand-assembled
 * scalars). The screen consumes one narrow result and wires camera
 * concerns only.
 */

import { useMemo } from "react";
import type { useFrameOutput } from "react-native-vision-camera";
import type { ModeConfig } from "../config/modes";
import { useProductCentering } from "../camera/useProductCentering";
import type { DocumentSkewResult } from "../documentDetection";
import { detectDocumentSkew } from "../documentDetection";
import {
	useEdgeDetection,
	useEdgeDetectionFrameOutput,
} from "../edgeDetection";
import {
	computeGroupFramingAnalysis,
	useFaceDetection,
} from "../faceDetection";
import type {
	DetectedFace,
	FaceFramingGuidance,
	GroupFramingAnalysis,
} from "../faceDetection/types";
import { useLighting, useLightingFrameOutput } from "../lighting";
import type { LightingClass } from "../lighting/types";
import { useScoring } from "../scoring";
import type { SubScores } from "../scoring/types";
import { useHorizonLevel, usePitchDetection, useStability } from "../sensors";

/** Face area percentage, rounded to match legacy UI. */
function calculateFaceAreaPercent(bounds: {
	width: number;
	height: number;
}): number {
	return Math.round(bounds.width * bounds.height * 100);
}

export interface UseShotAnalysisOptions {
	/** Mode configuration (thresholds and enabled features) */
	modeConfig: ModeConfig;
	/** Food mode (flat-lay guidance) */
	isFoodMode: boolean;
	/** Group mode (group framing) */
	isGroupMode: boolean;
	/** Product mode (centering guidance) */
	isProductMode: boolean;
	/** Document mode (phone level + skew detection) */
	isDocumentMode: boolean;
	/** Pet/Kids mode (fast-subject scoring) */
	isPetKidsMode: boolean;
	/** Night mode (low-light stability scoring) */
	isNightMode: boolean;
	/** Whether face framing analysis is enabled */
	faceFramingEnabled: boolean;
	/** Whether lighting analysis is enabled */
	lightingAnalysisEnabled: boolean;
	/** Whether edge detection is enabled (Travel mode) */
	edgeDetectionEnabled: boolean;
}

export interface ShotAnalysisResult {
	// ---- Scoring ----
	/** Overall shot-readiness score (0-100) */
	score: number;
	/** Individual component scores */
	subScores: SubScores;
	/** Which subscore is the weakest */
	weakestSubscore: keyof SubScores;
	/** Human-readable label for weakest subscore */
	weakestSubscoreLabel: string;
	/** Whether score meets auto-capture threshold */
	meetsThreshold: boolean;
	/** Whether breakdown view is expanded */
	isBreakdownVisible: boolean;
	/** Toggle breakdown visibility */
	toggleBreakdown: () => void;

	// ---- Sensors ----
	/** Current roll angle in degrees (smoothed) */
	roll: number;
	/** Whether device is level */
	isLevel: boolean;
	/** Whether device is stable */
	isStable: boolean;
	/** Pitch angle for flat-lay guidance (food mode) */
	pitch: number;
	/** Pitch angle for phone-level guidance (document mode) */
	documentPitch: number;
	/** Whether device is in flat-lay position */
	isFlatLay: boolean;

	// ---- Face framing ----
	/** All detected faces */
	faces: DetectedFace[];
	/** Primary (largest/centered) face */
	primaryFace: DetectedFace | undefined;
	/** Face framing guidance for the primary face */
	framingGuidance: FaceFramingGuidance;
	/** Group framing analysis (group mode) */
	groupAnalysis: GroupFramingAnalysis | undefined;

	// ---- Lighting ----
	/** Current lighting classification */
	lightingClass: LightingClass;
	/** User-facing lighting prompt */
	lightingPrompt: string | null;

	// ---- Edge / document ----
	/** Edge detection prompt (Travel mode) */
	edgeDetectionPrompt: string | null;
	/** Document skew detection result (document mode) */
	documentSkewResult: DocumentSkewResult | null;

	// ---- Product centering ----
	/** Product centering prompt (product mode) */
	productCenteringPrompt: string | null;
	/** Product background prompt (product mode) */
	productBackgroundPrompt: string | null;

	// ---- Frame outputs (fed to the camera's outputs array) ----
	frameOutputs: Array<ReturnType<typeof useFrameOutput> | null>;
}

/**
 * React hook owning the shot-analysis cluster.
 *
 * Subscribes to the motion sensors, runs the frame-analysis processors
 * (face, lighting, edge, document skew, product centering), and feeds the
 * scoring intake — then exposes one narrow result for the camera screen.
 */
export function useShotAnalysis({
	modeConfig,
	isFoodMode,
	isGroupMode,
	isProductMode,
	isDocumentMode,
	isPetKidsMode,
	isNightMode,
	faceFramingEnabled,
	lightingAnalysisEnabled,
	edgeDetectionEnabled,
}: UseShotAnalysisOptions): ShotAnalysisResult {
	// Subscribe to horizon level sensor
	const { roll, isLevel } = useHorizonLevel({
		toleranceDeg: modeConfig.horizonToleranceDeg,
	});

	// Subscribe to stability detection (accelerometer + gyroscope)
	const { isStable, stabilityScore } = useStability({
		threshold: modeConfig.stabilityThreshold,
		windowMs: modeConfig.stabilityWindowMs,
	});

	// Pitch detection for food mode flat-lay guidance
	const { pitch, isFlatLay } = usePitchDetection({
		enabled: isFoodMode,
		toleranceDeg: 15,
	});

	// Pitch detection for document mode phone level guidance
	const { pitch: documentPitch } = usePitchDetection({
		enabled: isDocumentMode,
		toleranceDeg: 10,
	});

	// Face detection for portrait/group mode
	const {
		faces,
		primaryFace,
		framingGuidance,
		frameOutput: faceFrameOutput,
	} = useFaceDetection({
		enabled: faceFramingEnabled,
		modeConfig,
	});

	// Group framing analysis (group mode)
	const groupAnalysis = isGroupMode
		? computeGroupFramingAnalysis(faces)
		: undefined;

	// Lighting thresholds shared by the analysis hook and its frame output
	// (memoized so both keep a stable object identity across renders)
	const lightingThresholds = useMemo(
		() => ({
			tooDarkThreshold: modeConfig.lightingTooDarkThreshold,
			tooBrightThreshold: modeConfig.lightingTooBrightThreshold,
			shadowClipThreshold: 30,
			highlightClipThreshold: 25,
			backlitRatioThreshold: modeConfig.lightingBacklitThreshold,
			minFaceBrightnessDiff: 30,
		}),
		[
			modeConfig.lightingTooDarkThreshold,
			modeConfig.lightingTooBrightThreshold,
			modeConfig.lightingBacklitThreshold,
		],
	);

	// Lighting quality analysis — real frame data from the frame processor
	const {
		prompt: lightingPrompt,
		lightingClass,
		meanLuminance,
		handleFrameStats,
	} = useLighting({
		enabled: lightingAnalysisEnabled,
		faceBounds: primaryFace?.bounds,
		thresholds: lightingThresholds,
	});

	// Frame output for lighting analysis
	const { frameOutput: lightingFrameOutput } = useLightingFrameOutput({
		enabled: lightingAnalysisEnabled,
		faceBounds: primaryFace?.bounds,
		thresholds: lightingThresholds,
		onLightingStats: handleFrameStats,
	});

	// Product mode centering guidance
	const {
		centroidX: productCentroidX,
		centroidY: productCentroidY,
		backgroundVariance: productBackgroundVariance,
		centeringPrompt: productCenteringPrompt,
		backgroundPrompt: productBackgroundPrompt,
	} = useProductCentering({
		enabled: isProductMode,
		isStable,
		lightingClass,
	});

	// Edge detection for Travel mode scenery framing
	const {
		prompt: edgeDetectionPrompt,
		frameStats,
		handleFrameStats: handleEdgeFrameStats,
	} = useEdgeDetection({
		enabled: edgeDetectionEnabled,
	});

	// Document skew detection (reuses edge detection frame stats)
	const documentSkewResult: DocumentSkewResult | null = useMemo(() => {
		if (!isDocumentMode || !frameStats) {
			return null;
		}
		return detectDocumentSkew(frameStats);
	}, [isDocumentMode, frameStats]);

	// Frame output for edge detection
	const { frameOutput: edgeDetectionFrameOutput } = useEdgeDetectionFrameOutput(
		{
			enabled: edgeDetectionEnabled,
			onFrameStats: handleEdgeFrameStats,
		},
	);

	// Frame outputs collected for the camera's outputs array
	const frameOutputs = useMemo(() => {
		const outputs: Array<ReturnType<typeof useFrameOutput> | null> = [];
		if (faceFrameOutput) {
			outputs.push(faceFrameOutput);
		}
		if (lightingFrameOutput) {
			outputs.push(lightingFrameOutput);
		}
		if (edgeDetectionFrameOutput) {
			outputs.push(edgeDetectionFrameOutput);
		}
		return outputs;
	}, [faceFrameOutput, lightingFrameOutput, edgeDetectionFrameOutput]);

	// Shot-readiness scoring — one typed FrameSignals bundle behind the seam
	const {
		score,
		subScores,
		weakestSubscore,
		weakestSubscoreLabel,
		meetsThreshold,
		isBreakdownVisible,
		toggleBreakdown,
	} = useScoring({
		signals: {
			stability: stabilityScore,
			isStable,
			rollDeviation: Math.abs(roll),
			isLevel,
			framingGuidance,
			faceAreaPercent: primaryFace
				? calculateFaceAreaPercent(primaryFace.bounds)
				: 0,
			lightingClass,
			faceFramingEnabled,
			lightingAnalysisEnabled,
			flatLayEnabled: isFoodMode,
			pitch,
			groupFramingEnabled: isGroupMode,
			faceCount: faces.length,
			totalFaceAreaPercent: groupAnalysis?.totalFaceAreaPercent ?? 0,
			edgeTouchingFaceCount: groupAnalysis?.edgeTouchingFaces.length ?? 0,
			centeringEnabled: isProductMode,
			subjectCentroidX: productCentroidX,
			subjectCentroidY: productCentroidY,
			backgroundVariance: productBackgroundVariance,
			documentSkewEnabled: isDocumentMode,
			documentSkewAngle: documentSkewResult?.skewAngle ?? 0,
			isDocumentFlat: documentSkewResult?.isFlat ?? true,
			petKidsModeEnabled: isPetKidsMode,
			nightModeEnabled: isNightMode,
			meanLuminance,
		},
		autoCaptureThreshold: modeConfig.autoCaptureScore,
	});

	return {
		score,
		subScores,
		weakestSubscore,
		weakestSubscoreLabel,
		meetsThreshold,
		isBreakdownVisible,
		toggleBreakdown,
		roll,
		isLevel,
		isStable,
		pitch,
		documentPitch,
		isFlatLay,
		faces,
		primaryFace,
		framingGuidance,
		groupAnalysis,
		lightingClass,
		lightingPrompt,
		edgeDetectionPrompt,
		documentSkewResult,
		productCenteringPrompt,
		productBackgroundPrompt,
		frameOutputs,
	};
}
