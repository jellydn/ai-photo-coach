/**
 * useShotAnalysis Hook Tests
 *
 * Verifies the deep shot-analysis module: sensor subscription wiring,
 * mode-gated analysis (group framing, document skew), frame output
 * collection, and the composed scoring intake bundle.
 */

import { renderHook } from "@testing-library/react-native";
import { modeConfig } from "../src/config/modes";
import { useShotAnalysis } from "../src/shotAnalysis";
import type { UseShotAnalysisOptions } from "../src/shotAnalysis";
import { useHorizonLevel, usePitchDetection, useStability } from "../src/sensors";
import {
	computeGroupFramingAnalysis,
	useFaceDetection,
} from "../src/faceDetection";
import { useLighting, useLightingFrameOutput } from "../src/lighting";
import { useEdgeDetection, useEdgeDetectionFrameOutput } from "../src/edgeDetection";
import { useProductCentering } from "../src/camera/useProductCentering";
import { detectDocumentSkew } from "../src/documentDetection";
import { useScoring } from "../src/scoring";

// Mock leaf modules behind the seam
jest.mock("../src/sensors", () => ({
	useHorizonLevel: jest.fn(),
	useStability: jest.fn(),
	usePitchDetection: jest.fn(),
}));

jest.mock("../src/faceDetection", () => ({
	useFaceDetection: jest.fn(),
	computeGroupFramingAnalysis: jest.fn(),
}));

jest.mock("../src/lighting", () => ({
	useLighting: jest.fn(),
	useLightingFrameOutput: jest.fn(),
}));

jest.mock("../src/edgeDetection", () => ({
	useEdgeDetection: jest.fn(),
	useEdgeDetectionFrameOutput: jest.fn(),
}));

jest.mock("../src/camera/useProductCentering", () => ({
	useProductCentering: jest.fn(),
}));

jest.mock("../src/documentDetection", () => ({
	detectDocumentSkew: jest.fn(),
}));

jest.mock("../src/scoring", () => ({
	useScoring: jest.fn(),
}));

const mockUseHorizonLevel = useHorizonLevel as jest.Mock;
const mockUseStability = useStability as jest.Mock;
const mockUsePitchDetection = usePitchDetection as jest.Mock;
const mockUseFaceDetection = useFaceDetection as jest.Mock;
const mockComputeGroupFramingAnalysis = computeGroupFramingAnalysis as jest.Mock;
const mockUseLighting = useLighting as jest.Mock;
const mockUseLightingFrameOutput = useLightingFrameOutput as jest.Mock;
const mockUseEdgeDetection = useEdgeDetection as jest.Mock;
const mockUseEdgeDetectionFrameOutput = useEdgeDetectionFrameOutput as jest.Mock;
const mockUseProductCentering = useProductCentering as jest.Mock;
const mockDetectDocumentSkew = detectDocumentSkew as jest.Mock;
const mockUseScoring = useScoring as jest.Mock;

describe("useShotAnalysis", () => {
	const portrait = modeConfig.portrait;

	const baseOptions: UseShotAnalysisOptions = {
		modeConfig: portrait,
		isFoodMode: false,
		isGroupMode: false,
		isProductMode: false,
		isDocumentMode: false,
		isPetKidsMode: false,
		isNightMode: false,
		faceFramingEnabled: portrait.faceFraming,
		lightingAnalysisEnabled: portrait.lightingAnalysis,
		edgeDetectionEnabled: portrait.edgeDetection,
	};

	const scoringResult = {
		score: 85,
		subScores: {
			stability: 90,
			level: 80,
			framing: 85,
			lighting: 80,
			aesthetic: 70,
			flatLay: 100,
			groupFraming: 100,
			centering: 100,
			documentSkew: 100,
			lowLightStability: 100,
		},
		weakestSubscore: "level",
		weakestSubscoreLabel: "Level",
		meetsThreshold: true,
		isBreakdownVisible: false,
		toggleBreakdown: jest.fn(),
		showBreakdown: jest.fn(),
		hideBreakdown: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockUseHorizonLevel.mockReturnValue({
			roll: 0,
			isLevel: true,
			rawRoll: 0,
			isAvailable: true,
			error: null,
		});
		mockUseStability.mockReturnValue({
			isStable: true,
			sampleCount: 10,
			stabilityScore: 0.01,
			isAvailable: true,
			error: null,
		});
		mockUsePitchDetection.mockReturnValue({ pitch: 0, isFlatLay: false });
		mockUseFaceDetection.mockReturnValue({
			faces: [],
			primaryFace: undefined,
			faceAreaPercent: 0,
			framingGuidance: null,
			isProcessing: false,
			frameOutput: null,
		});
		mockComputeGroupFramingAnalysis.mockReturnValue({
			faceCount: 0,
			totalFaceAreaPercent: 0,
			edgeTouchingFaces: [],
			framingScore: 100,
		});
		mockUseLighting.mockReturnValue({
			prompt: null,
			lightingClass: "good" as const,
			meanLuminance: 128,
			handleFrameStats: jest.fn(),
		});
		mockUseLightingFrameOutput.mockReturnValue({ frameOutput: null });
		mockUseEdgeDetection.mockReturnValue({
			hasDominantLines: false,
			primaryOrientation: "none",
			confidence: 0,
			isAligned: true,
			prompt: null,
			frameStats: null,
			handleFrameStats: jest.fn(),
		});
		mockUseEdgeDetectionFrameOutput.mockReturnValue({ frameOutput: null });
		mockUseProductCentering.mockReturnValue({
			centroidX: 0.5,
			centroidY: 0.5,
			backgroundVariance: 0.1,
			isCentered: true,
			centeringPrompt: null,
			backgroundPrompt: null,
		});
		mockDetectDocumentSkew.mockReturnValue({
			hasDocument: true,
			skewAngle: 0,
			isFlat: true,
			confidence: 0.9,
			prompt: null,
		});
		mockUseScoring.mockReturnValue(scoringResult);
	});

	it("wires the sensor subscriptions with mode thresholds", () => {
		renderHook(() => useShotAnalysis(baseOptions));

		expect(mockUseHorizonLevel).toHaveBeenCalledWith({
			toleranceDeg: portrait.horizonToleranceDeg,
		});
		expect(mockUseStability).toHaveBeenCalledWith({
			threshold: portrait.stabilityThreshold,
			windowMs: portrait.stabilityWindowMs,
		});
		// Food mode off: pitch detection stays disabled for flat-lay
		expect(mockUsePitchDetection).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: false }),
		);
	});

	it("feeds a composed signals bundle into the scoring seam", () => {
		renderHook(() => useShotAnalysis(baseOptions));

		expect(mockUseScoring).toHaveBeenCalledWith({
			signals: expect.objectContaining({
				stability: 0.01,
				isStable: true,
				rollDeviation: 0,
				isLevel: true,
				framingGuidance: null,
				faceAreaPercent: 0,
				lightingClass: "good",
				faceFramingEnabled: portrait.faceFraming,
				lightingAnalysisEnabled: portrait.lightingAnalysis,
				flatLayEnabled: false,
				groupFramingEnabled: false,
				centeringEnabled: false,
				documentSkewEnabled: false,
				petKidsModeEnabled: false,
				nightModeEnabled: false,
				meanLuminance: 128,
			}),
			autoCaptureThreshold: portrait.autoCaptureScore,
		});
	});

	it("exposes the narrow result surface", () => {
		const { result } = renderHook(() => useShotAnalysis(baseOptions));

		expect(result.current.score).toBe(85);
		expect(result.current.weakestSubscore).toBe("level");
		expect(result.current.meetsThreshold).toBe(true);
		expect(result.current.roll).toBe(0);
		expect(result.current.isLevel).toBe(true);
		expect(result.current.isStable).toBe(true);
		expect(result.current.isFlatLay).toBe(false);
		expect(result.current.lightingClass).toBe("good");
		expect(result.current.frameOutputs).toEqual([]);
	});

	it("computes group framing analysis only in group mode", () => {
		mockUseFaceDetection.mockReturnValue({
			faces: [{ id: "face-1" }],
			primaryFace: undefined,
			faceAreaPercent: 0,
			framingGuidance: null,
			isProcessing: false,
			frameOutput: null,
		});

		const { result: groupResult } = renderHook(() =>
			useShotAnalysis({ ...baseOptions, isGroupMode: true }),
		);
		expect(mockComputeGroupFramingAnalysis).toHaveBeenCalledTimes(1);
		expect(groupResult.current.groupAnalysis).toBeDefined();

		mockUseFaceDetection.mockReturnValue({
			faces: [{ id: "face-2" }],
			primaryFace: undefined,
			faceAreaPercent: 0,
			framingGuidance: null,
			isProcessing: false,
			frameOutput: null,
		});
		renderHook(() => useShotAnalysis(baseOptions));
		// Non-group render must not recompute group analysis
		expect(mockComputeGroupFramingAnalysis).toHaveBeenCalledTimes(1);
	});

	it("runs document skew detection only in document mode with frame stats", () => {
		mockUseEdgeDetection.mockReturnValue({
			hasDominantLines: true,
			primaryOrientation: "horizontal",
			confidence: 0.8,
			isAligned: true,
			prompt: null,
			frameStats: { some: "stats" },
			handleFrameStats: jest.fn(),
		});

		// Document mode on: skew detection runs and result is exposed
		const { result } = renderHook(() =>
			useShotAnalysis({ ...baseOptions, isDocumentMode: true }),
		);
		expect(mockDetectDocumentSkew).toHaveBeenCalledTimes(1);
		expect(result.current.documentSkewResult).toEqual({
			hasDocument: true,
			skewAngle: 0,
			isFlat: true,
			confidence: 0.9,
			prompt: null,
		});

		// Document mode off: no skew detection
		mockUseEdgeDetection.mockReturnValue({
			hasDominantLines: true,
			primaryOrientation: "horizontal",
			confidence: 0.8,
			isAligned: true,
			prompt: null,
			frameStats: { some: "stats" },
			handleFrameStats: jest.fn(),
		});
		renderHook(() => useShotAnalysis(baseOptions));
		expect(mockDetectDocumentSkew).toHaveBeenCalledTimes(1);
	});

	it("collects non-null frame outputs for the camera outputs array", () => {
		const faceFrameOutput = { frame: "face" };
		const lightingFrameOutput = { frame: "lighting" };
		mockUseFaceDetection.mockReturnValue({
			faces: [],
			primaryFace: undefined,
			faceAreaPercent: 0,
			framingGuidance: null,
			isProcessing: false,
			frameOutput: faceFrameOutput,
		});
		mockUseLightingFrameOutput.mockReturnValue({
			frameOutput: lightingFrameOutput,
		});

		const { result } = renderHook(() => useShotAnalysis(baseOptions));

		expect(result.current.frameOutputs).toContain(faceFrameOutput);
		expect(result.current.frameOutputs).toContain(lightingFrameOutput);
	});
});
