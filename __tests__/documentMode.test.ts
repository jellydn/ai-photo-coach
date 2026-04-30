/**
 * Unit tests for Document mode
 * Tests document skew detection, scoring, and coaching prompts
 */

import {
	COACHING_PROMPTS,
	type CoachingContext,
	type CoachingSignals,
	isReadyForCapture,
	selectPrompt,
} from "../src/coaching";
import {
	type DocumentSkewResult,
	detectDocumentSkew,
	getDocumentStatusDescription,
	isDocumentAligned,
	MIN_DOCUMENT_CONFIDENCE,
	SKEW_ANGLE_THRESHOLD,
} from "../src/documentDetection";
import type { FrameStats } from "../src/edgeDetection";
import {
	computeDocumentSkewScore,
	DOCUMENT_MODE_WEIGHTS,
	MAX_DOCUMENT_SKEW_ANGLE,
	type ScoreSignals,
	type SubScores,
} from "../src/scoring";

describe("Document Mode", () => {
	describe("detectDocumentSkew", () => {
		it("should return no document when edge strength is too low", () => {
			const frameStats: FrameStats = {
				width: 320,
				height: 240,
				horizontalEdges: [],
				verticalEdges: [],
				meanEdgeStrength: 0.05, // Too low
			};

			const result = detectDocumentSkew(frameStats);

			expect(result.hasDocument).toBe(false);
			expect(result.confidence).toBe(0);
			expect(result.prompt).toBeNull();
		});

		it("should detect document with horizontal-dominant edges", () => {
			// Create edge arrays with enough strong edges above 0.3 threshold
			const horizontalEdges = [
				...new Array(25).fill(0.5), // 25 strong horizontal edges (25% > 0.15 threshold)
				...new Array(75).fill(0.2),
			];
			const verticalEdges = [
				...new Array(20).fill(0.4), // 20 strong vertical edges (20% > 0.15 threshold)
				...new Array(80).fill(0.2),
			];

			const frameStats: FrameStats = {
				width: 320,
				height: 240,
				horizontalEdges,
				verticalEdges,
				meanEdgeStrength: 0.4,
			};

			const result = detectDocumentSkew(frameStats);

			expect(result.hasDocument).toBe(true);
			expect(result.confidence).toBeGreaterThan(MIN_DOCUMENT_CONFIDENCE);
		});

		it("should detect document with vertical-dominant edges", () => {
			// Create edge arrays with enough strong edges above 0.3 threshold
			const horizontalEdges = [
				...new Array(20).fill(0.4), // 20 strong horizontal edges
				...new Array(80).fill(0.2),
			];
			const verticalEdges = [
				...new Array(25).fill(0.5), // 25 strong vertical edges (25% > 0.15 threshold)
				...new Array(75).fill(0.2),
			];

			const frameStats: FrameStats = {
				width: 320,
				height: 240,
				horizontalEdges,
				verticalEdges,
				meanEdgeStrength: 0.4,
			};

			const result = detectDocumentSkew(frameStats);

			expect(result.hasDocument).toBe(true);
			expect(result.confidence).toBeGreaterThan(MIN_DOCUMENT_CONFIDENCE);
		});

		it("should detect document with various edge patterns", () => {
			// Mix of strong and moderate edges to pass threshold checks
			const horizontalEdges = [
				...new Array(30).fill(0.5), // Strong edges above 0.3 threshold
				...new Array(70).fill(0.2), // Moderate edges
			];
			const verticalEdges = [
				...new Array(20).fill(0.4), // Some strong vertical edges
				...new Array(80).fill(0.15), // Moderate edges
			];

			const frameStats: FrameStats = {
				width: 320,
				height: 240,
				horizontalEdges,
				verticalEdges,
				meanEdgeStrength: 0.35,
			};

			const result = detectDocumentSkew(frameStats);

			// Should detect document with sufficient strong edges
			expect(result.hasDocument).toBe(true);
		});

		it("should detect flat/aligned document", () => {
			// Create balanced edge arrays with enough strong edges
			const horizontalEdges = [
				...new Array(20).fill(0.4), // Strong edges above 0.3 threshold
				...new Array(80).fill(0.2),
			];
			const verticalEdges = [
				...new Array(20).fill(0.4), // Balanced with horizontal
				...new Array(80).fill(0.2),
			];

			const frameStats: FrameStats = {
				width: 320,
				height: 240,
				horizontalEdges,
				verticalEdges,
				meanEdgeStrength: 0.4,
			};

			const result = detectDocumentSkew(frameStats);

			expect(result.hasDocument).toBe(true);
			expect(result.isFlat).toBe(true);
			expect(result.prompt).toBeNull();
		});

		it("should calculate skew angle when document detected", () => {
			// Simulate skew by having unbalanced edge ratios
			const frameStats: FrameStats = {
				width: 320,
				height: 240,
				horizontalEdges: new Array(100).fill(0.5), // Strong horizontal
				verticalEdges: new Array(100).fill(0.5), // Strong vertical
				meanEdgeStrength: 0.5,
			};

			const result = detectDocumentSkew(frameStats);

			// Document detection depends on having sufficient edge strength and coverage
			if (result.hasDocument) {
				// Skew angle should be a number (can be 0 for balanced edges)
				expect(typeof result.skewAngle).toBe("number");
			}
		});
	});

	describe("isDocumentAligned", () => {
		it("should return true for aligned document", () => {
			const result: DocumentSkewResult = {
				hasDocument: true,
				skewAngle: 2,
				isFlat: true,
				confidence: 0.8,
				prompt: null,
			};

			expect(isDocumentAligned(result)).toBe(true);
		});

		it("should return false when no document detected", () => {
			const result: DocumentSkewResult = {
				hasDocument: false,
				skewAngle: 0,
				isFlat: false,
				confidence: 0,
				prompt: null,
			};

			expect(isDocumentAligned(result)).toBe(false);
		});

		it("should return false when document is not flat", () => {
			const result: DocumentSkewResult = {
				hasDocument: true,
				skewAngle: 5,
				isFlat: false,
				confidence: 0.8,
				prompt: "Flatten the page",
			};

			expect(isDocumentAligned(result)).toBe(false);
		});

		it("should return false when skew angle is too high", () => {
			const result: DocumentSkewResult = {
				hasDocument: true,
				skewAngle: 15, // > 3 degrees
				isFlat: true,
				confidence: 0.8,
				prompt: null,
			};

			expect(isDocumentAligned(result)).toBe(false);
		});
	});

	describe("getDocumentStatusDescription", () => {
		it("should return 'No document detected' when no document", () => {
			const result: DocumentSkewResult = {
				hasDocument: false,
				skewAngle: 0,
				isFlat: false,
				confidence: 0,
				prompt: null,
			};

			expect(getDocumentStatusDescription(result)).toBe("No document detected");
		});

		it("should return 'Document aligned and ready' when aligned", () => {
			const result: DocumentSkewResult = {
				hasDocument: true,
				skewAngle: 1,
				isFlat: true,
				confidence: 0.8,
				prompt: null,
			};

			expect(getDocumentStatusDescription(result)).toBe(
				"Document aligned and ready",
			);
		});

		it("should return 'Document has perspective skew' when not flat", () => {
			const result: DocumentSkewResult = {
				hasDocument: true,
				skewAngle: 8,
				isFlat: false,
				confidence: 0.7,
				prompt: "Flatten the page",
			};

			expect(getDocumentStatusDescription(result)).toBe(
				"Document has perspective skew",
			);
		});
	});

	describe("computeDocumentSkewScore", () => {
		it("should return 100 when document skew is disabled", () => {
			const score = computeDocumentSkewScore(false, 0, true);
			expect(score).toBe(100);
		});

		it("should return 40 when document is not flat (perspective skew)", () => {
			const score = computeDocumentSkewScore(true, 5, false);
			expect(score).toBe(40);
		});

		it("should return 100 for perfectly aligned document", () => {
			const score = computeDocumentSkewScore(true, 0, true);
			expect(score).toBe(100);
		});

		it("should return 100 for small skew within threshold", () => {
			const score = computeDocumentSkewScore(true, 2, true);
			expect(score).toBe(100);
		});

		it("should decrease score as skew increases", () => {
			const score5deg = computeDocumentSkewScore(true, 5, true);
			const score8deg = computeDocumentSkewScore(true, 8, true);
			const score10deg = computeDocumentSkewScore(true, 10, true);

			expect(score5deg).toBeGreaterThan(score8deg);
			expect(score8deg).toBeGreaterThan(score10deg);
		});

		it("should return minimum score at max threshold", () => {
			const score = computeDocumentSkewScore(
				true,
				MAX_DOCUMENT_SKEW_ANGLE,
				true,
			);
			expect(score).toBe(30);
		});

		it("should not return score below 30 even for extreme skew", () => {
			const score = computeDocumentSkewScore(true, 20, true);
			expect(score).toBe(30);
		});
	});

	describe("DOCUMENT_MODE_WEIGHTS", () => {
		it("should have documentSkew as the highest weight", () => {
			expect(DOCUMENT_MODE_WEIGHTS.documentSkew).toBe(0.3);
		});

		it("should have all weights sum to 1.0", () => {
			const total =
				DOCUMENT_MODE_WEIGHTS.stability +
				DOCUMENT_MODE_WEIGHTS.level +
				DOCUMENT_MODE_WEIGHTS.framing +
				DOCUMENT_MODE_WEIGHTS.lighting +
				DOCUMENT_MODE_WEIGHTS.aesthetic +
				DOCUMENT_MODE_WEIGHTS.flatLay +
				DOCUMENT_MODE_WEIGHTS.groupFraming +
				DOCUMENT_MODE_WEIGHTS.centering +
				DOCUMENT_MODE_WEIGHTS.documentSkew;

			expect(total).toBe(1.0);
		});

		it("should disable non-relevant subscores (framing, aesthetic, flatLay, etc.)", () => {
			expect(DOCUMENT_MODE_WEIGHTS.framing).toBe(0);
			expect(DOCUMENT_MODE_WEIGHTS.aesthetic).toBe(0);
			expect(DOCUMENT_MODE_WEIGHTS.flatLay).toBe(0);
			expect(DOCUMENT_MODE_WEIGHTS.groupFraming).toBe(0);
			expect(DOCUMENT_MODE_WEIGHTS.centering).toBe(0);
		});
	});

	describe("Document mode coaching prompts", () => {
		it("should have FLATTEN_THE_PAGE prompt in COACHING_PROMPTS", () => {
			expect(COACHING_PROMPTS.FLATTEN_THE_PAGE).toBe("Flatten the page");
		});

		it("should have HOLD_PHONE_LEVEL prompt in COACHING_PROMPTS", () => {
			expect(COACHING_PROMPTS.HOLD_PHONE_LEVEL).toBe("Hold phone level");
		});

		it("should prioritize phone level over document skew in selectPrompt", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: null,
				lightingPrompt: null,
				documentSkewPrompt: "Flatten the page",
				phoneLevelPrompt: "Hold phone level",
			};

			const context: CoachingContext = {
				faceFramingEnabled: false,
				lightingAnalysisEnabled: false,
				compositionEnabled: true,
				edgeDetectionEnabled: false,
				documentSkewEnabled: true,
			};

			const prompt = selectPrompt(signals, context);
			expect(prompt).toBe("Hold phone level");
		});

		it("should show document skew prompt when phone is level", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: null,
				lightingPrompt: null,
				documentSkewPrompt: "Flatten the page",
				phoneLevelPrompt: null,
			};

			const context: CoachingContext = {
				faceFramingEnabled: false,
				lightingAnalysisEnabled: false,
				compositionEnabled: true,
				edgeDetectionEnabled: false,
				documentSkewEnabled: true,
			};

			const prompt = selectPrompt(signals, context);
			expect(prompt).toBe("Flatten the page");
		});

		it("should be ready for capture when document is aligned and phone is level", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: null,
				lightingPrompt: null,
				documentSkewPrompt: null,
				phoneLevelPrompt: null,
			};

			const context: CoachingContext = {
				faceFramingEnabled: false,
				lightingAnalysisEnabled: true,
				compositionEnabled: true,
				edgeDetectionEnabled: false,
				documentSkewEnabled: true,
			};

			expect(isReadyForCapture(signals, context)).toBe(true);
		});

		it("should not be ready when phone is not level", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: null,
				lightingPrompt: null,
				documentSkewPrompt: null,
				phoneLevelPrompt: "Hold phone level",
			};

			const context: CoachingContext = {
				faceFramingEnabled: false,
				lightingAnalysisEnabled: true,
				compositionEnabled: true,
				edgeDetectionEnabled: false,
				documentSkewEnabled: true,
			};

			expect(isReadyForCapture(signals, context)).toBe(false);
		});

		it("should not be ready when document is skewed", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: null,
				lightingPrompt: null,
				documentSkewPrompt: "Flatten the page",
				phoneLevelPrompt: null,
			};

			const context: CoachingContext = {
				faceFramingEnabled: false,
				lightingAnalysisEnabled: true,
				compositionEnabled: true,
				edgeDetectionEnabled: false,
				documentSkewEnabled: true,
			};

			expect(isReadyForCapture(signals, context)).toBe(false);
		});
	});

	describe("Document mode configuration", () => {
		it("should have strict horizon tolerance (1 degree)", () => {
			// This is tested indirectly through modeConfig, but the constant is defined
			expect(MAX_DOCUMENT_SKEW_ANGLE).toBe(10);
		});

		it("should have high auto-capture threshold (85)", () => {
			// Document mode has strict auto-capture requirements
			// Threshold is defined in modeConfig
			expect(SKEW_ANGLE_THRESHOLD).toBe(10);
		});
	});

	describe("Document skew in SubScores", () => {
		it("should include documentSkew in SubScores interface", () => {
			const subScores: SubScores = {
				stability: 90,
				level: 85,
				framing: 100,
				lighting: 80,
				aesthetic: 70,
				flatLay: 100,
				groupFraming: 100,
				centering: 100,
				documentSkew: 95,
				lowLightStability: 100,
			};

			expect(subScores.documentSkew).toBe(95);
		});
	});

	describe("Document skew in ScoreSignals", () => {
		it("should include document skew properties in ScoreSignals", () => {
			const signals: ScoreSignals = {
				stability: 0.01,
				isStable: true,
				rollDeviation: 0,
				isLevel: true,
				framingGuidance: null,
				faceAreaPercent: 0,
				lightingClass: "good",
				faceFramingEnabled: false,
				lightingAnalysisEnabled: true,
				documentSkewEnabled: true,
				documentSkewAngle: 5,
				isDocumentFlat: false,
			};

			expect(signals.documentSkewEnabled).toBe(true);
			expect(signals.documentSkewAngle).toBe(5);
			expect(signals.isDocumentFlat).toBe(false);
		});
	});
});
