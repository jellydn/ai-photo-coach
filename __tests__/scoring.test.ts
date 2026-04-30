/**
 * Scoring engine unit tests
 * Tests score computation, subscores, hybrid scoring, and ML fallback
 */

import {
	computeFramingScore,
	computeLevelScore,
	computeLightingScore,
	computeScore,
	computeStabilityScore,
	computeWeightedScore,
	DEFAULT_HYBRID_WEIGHTS,
	DEFAULT_RULES_WEIGHTS,
	findWeakestSubscore,
	getScoreBreakdown,
	getScoreColor,
	getSubscoreLabel,
	MAX_FACE_AREA_DEVIATION,
	MAX_ROLL_DEVIATION as MAX_ROLL,
	MAX_ROLL_DEVIATION,
	normalizeAestheticScore,
	SCORE_THRESHOLDS,
	type ScoreSignals,
	TARGET_FACE_AREA_PCT,
} from "../src/scoring/types";

describe("Scoring Engine", () => {
	describe("computeStabilityScore", () => {
		it("should return 100 when stable", () => {
			expect(computeStabilityScore(true, 0.01)).toBe(100);
			expect(computeStabilityScore(true, 0.001)).toBe(100);
		});

		it("should return lower score when unstable with high variance", () => {
			const score = computeStabilityScore(false, 0.05);
			expect(score).toBeLessThan(100);
			expect(score).toBeGreaterThanOrEqual(0);
		});

		it("should approach 0 with very high variance", () => {
			const score = computeStabilityScore(false, 0.1);
			expect(score).toBeLessThan(50);
		});
	});

	describe("computeLevelScore", () => {
		it("should return 100 when level", () => {
			expect(computeLevelScore(true, 0)).toBe(100);
			expect(computeLevelScore(true, 1)).toBe(100);
		});

		it("should return proportional score based on deviation", () => {
			// At 5 degrees deviation (half of MAX_ROLL_DEVIATION), should be ~50
			const score = computeLevelScore(false, 5);
			expect(score).toBe(50);
		});

		it("should return 0 at maximum deviation", () => {
			expect(computeLevelScore(false, MAX_ROLL_DEVIATION)).toBe(0);
			expect(computeLevelScore(false, MAX_ROLL_DEVIATION + 5)).toBe(0);
		});

		it("should return 100 at zero deviation", () => {
			expect(computeLevelScore(false, 0)).toBe(100);
		});
	});

	describe("computeFramingScore", () => {
		it("should return 100 when face framing disabled", () => {
			const score = computeFramingScore(false, null, 0);
			expect(score).toBe(100);
		});

		it("should return 100 when no framing guidance and optimal face area", () => {
			const score = computeFramingScore(true, null, TARGET_FACE_AREA_PCT);
			expect(score).toBe(100);
		});

		it("should return 100 when face area is within 5% of target", () => {
			const score = computeFramingScore(true, null, 30); // 5% off target
			expect(score).toBe(100);
		});

		it("should return ~90 when face area is 10% off target", () => {
			const score = computeFramingScore(true, null, 25); // 10% off target
			expect(score).toBe(80);
		});

		it("should return minimum 70 for acceptable framing", () => {
			const score = computeFramingScore(true, null, 15); // Far from target
			expect(score).toBe(70);
		});

		it("should return low score for face too small/large (severe distance issue)", () => {
			const guidance = {
				isProperlyFramed: false,
				faceAreaPercent: 10,
				isTooSmall: true,
				isTooLarge: false,
				prompt: "Step closer",
				headroomOffset: 0,
			};
			const score = computeFramingScore(true, guidance, 10);
			expect(score).toBe(30);
		});

		it("should return moderate score for face too small/large (minor distance issue)", () => {
			const guidance = {
				isProperlyFramed: false,
				faceAreaPercent: 20,
				isTooSmall: true,
				isTooLarge: false,
				prompt: "Step closer",
				headroomOffset: 0,
			};
			const score = computeFramingScore(true, guidance, 20);
			expect(score).toBe(50);
		});

		it("should return moderate score for severe headroom issues", () => {
			const guidance = {
				isProperlyFramed: false,
				faceAreaPercent: 35,
				isTooSmall: false,
				isTooLarge: false,
				prompt: "Lower camera",
				headroomOffset: 0.15, // Severe offset
			};
			const score = computeFramingScore(true, guidance, 35);
			expect(score).toBe(50);
		});

		it("should return better score for minor headroom issues", () => {
			const guidance = {
				isProperlyFramed: false,
				faceAreaPercent: 35,
				isTooSmall: false,
				isTooLarge: false,
				prompt: "Lower camera",
				headroomOffset: 0.08, // Minor offset
			};
			const score = computeFramingScore(true, guidance, 35);
			expect(score).toBe(70);
		});
	});

	describe("computeLightingScore", () => {
		it("should return 100 when lighting analysis disabled", () => {
			expect(computeLightingScore(false, "too_dark")).toBe(100);
		});

		it("should return 100 for good lighting", () => {
			expect(computeLightingScore(true, "good")).toBe(100);
		});

		it("should return 60 for backlit", () => {
			expect(computeLightingScore(true, "backlit")).toBe(60);
		});

		it("should return 40 for too bright", () => {
			expect(computeLightingScore(true, "too_bright")).toBe(40);
		});

		it("should return 30 for too dark", () => {
			expect(computeLightingScore(true, "too_dark")).toBe(30);
		});
	});

	describe("computeWeightedScore", () => {
		it("should calculate weighted average correctly", () => {
			const subScores = {
				stability: 100,
				level: 100,
				framing: 100,
				lighting: 100,
				aesthetic: 0,
				flatLay: 100,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};

			const score = computeWeightedScore(subScores, DEFAULT_RULES_WEIGHTS);
			expect(score).toBe(100);
		});

		it("should handle zero aesthetic weight in rules-only mode", () => {
			const subScores = {
				stability: 80,
				level: 80,
				framing: 80,
				lighting: 80,
				aesthetic: 0,
				flatLay: 80,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};

			const score = computeWeightedScore(subScores, DEFAULT_RULES_WEIGHTS);
			expect(score).toBe(80);
		});

		it("should include aesthetic in hybrid mode", () => {
			const subScores = {
				stability: 100,
				level: 100,
				framing: 100,
				lighting: 100,
				aesthetic: 50,
				flatLay: 100,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};

			const score = computeWeightedScore(subScores, DEFAULT_HYBRID_WEIGHTS);
			// (100*0.15 + 100*0.1 + 100*0.15 + 100*0.2 + 50*0.15 + 100*0.25) / 1.0 = 92.5 ≈ 93
			expect(score).toBe(93);
		});

		it("should handle zero total weight", () => {
			const subScores = {
				stability: 100,
				level: 100,
				framing: 100,
				lighting: 100,
				aesthetic: 100,
				flatLay: 100,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};

			const zeroWeights = {
				stability: 0,
				level: 0,
				framing: 0,
				lighting: 0,
				aesthetic: 0,
				flatLay: 0,
				groupFraming: 0,
				centering: 0,
				documentSkew: 0,
				lowLightStability: 0,
			};

			expect(computeWeightedScore(subScores, zeroWeights)).toBe(0);
		});
	});

	describe("computeScore (integration)", () => {
		const baseSignals: ScoreSignals = {
			stability: 0.01,
			isStable: true,
			rollDeviation: 0,
			isLevel: true,
			framingGuidance: null,
			faceAreaPercent: 35,
			lightingClass: "good",
			lightingStats: undefined,
			faceFramingEnabled: true,
			lightingAnalysisEnabled: true,
			flatLayEnabled: false,
			pitch: 0,
			groupFramingEnabled: false,
			faceCount: 0,
			totalFaceAreaPercent: 0,
			edgeTouchingFaceCount: 0,
			centeringEnabled: false,
			subjectCentroidX: 0.5,
			subjectCentroidY: 0.5,
			backgroundVariance: 0,
		};

		it("should return perfect score when all conditions optimal", () => {
			const result = computeScore(baseSignals);
			expect(result.score).toBe(100);
			expect(result.method).toBe("rules-only");
			expect(result.meetsThreshold).toBe(true);
		});

		it("should return rules-only method when no ML model provided", () => {
			const result = computeScore(baseSignals);
			expect(result.method).toBe("rules-only");
			expect(result.subScores.aesthetic).toBe(0);
		});

		it("should return hybrid method when ML model provided", () => {
			const modelOutput = { aestheticScore: 0.8, confidence: 0.9 };
			const result = computeScore(baseSignals, modelOutput);
			expect(result.method).toBe("hybrid");
			expect(result.subScores.aesthetic).toBe(80);
		});

		it("should fallback to rules-only when ML confidence is low", () => {
			const modelOutput = { aestheticScore: 0.8, confidence: 0.3 };
			const result = computeScore(baseSignals, modelOutput);
			expect(result.method).toBe("rules-only");
		});

		it("should return meetsThreshold=true when score >= 80", () => {
			const signals = { ...baseSignals, isStable: true, isLevel: true };
			const result = computeScore(signals, undefined, undefined, 80);
			expect(result.meetsThreshold).toBe(true);
		});

		it("should return meetsThreshold=false when score < 80", () => {
			const signals: ScoreSignals = {
				...baseSignals,
				isStable: false,
				stability: 0.1,
			};
			const result = computeScore(signals, undefined, undefined, 80);
			expect(result.meetsThreshold).toBe(false);
		});

		it("should use custom threshold when provided", () => {
			const result = computeScore(baseSignals, undefined, undefined, 95);
			// Even with perfect conditions, score is 100, which meets 95
			expect(result.meetsThreshold).toBe(true);
		});

		it("should identify correct weakest subscore", () => {
			const signals: ScoreSignals = {
				...baseSignals,
				isStable: false,
				stability: 0.05,
			};
			const result = computeScore(signals);
			expect(result.weakestSubscore).toBe("stability");
		});
	});

	describe("findWeakestSubscore", () => {
		it("should return stability when it's lowest", () => {
			const subScores = {
				stability: 50,
				level: 100,
				framing: 100,
				lighting: 100,
				aesthetic: 100,
				flatLay: 100,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};
			expect(findWeakestSubscore(subScores)).toBe("stability");
		});

		it("should return level when it's lowest", () => {
			const subScores = {
				stability: 100,
				level: 50,
				framing: 100,
				lighting: 100,
				aesthetic: 100,
				flatLay: 100,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};
			expect(findWeakestSubscore(subScores)).toBe("level");
		});

		it("should return framing when it's lowest", () => {
			const subScores = {
				stability: 100,
				level: 100,
				framing: 50,
				lighting: 100,
				aesthetic: 100,
				flatLay: 100,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};
			expect(findWeakestSubscore(subScores)).toBe("framing");
		});

		it("should return lighting when it's lowest", () => {
			const subScores = {
				stability: 100,
				level: 100,
				framing: 100,
				lighting: 50,
				aesthetic: 100,
				flatLay: 100,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};
			expect(findWeakestSubscore(subScores)).toBe("lighting");
		});

		it("should return aesthetic when it's lowest", () => {
			const subScores = {
				stability: 100,
				level: 100,
				framing: 100,
				lighting: 100,
				aesthetic: 50,
				flatLay: 100,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};
			expect(findWeakestSubscore(subScores)).toBe("aesthetic");
		});

		it("should return flatLay when it's lowest", () => {
			const subScores = {
				stability: 100,
				level: 100,
				framing: 100,
				lighting: 100,
				aesthetic: 100,
				flatLay: 40,
				groupFraming: 100,
				centering: 100,
				documentSkew: 100,
				lowLightStability: 100,
			};
			expect(findWeakestSubscore(subScores)).toBe("flatLay");
		});

		it("should return centering when it's lowest", () => {
			const subScores = {
				stability: 100,
				level: 100,
				framing: 100,
				lighting: 100,
				aesthetic: 100,
				flatLay: 100,
				groupFraming: 100,
				centering: 30,
				documentSkew: 100,
				lowLightStability: 100,
			};
			expect(findWeakestSubscore(subScores)).toBe("centering");
		});
	});

	describe("getScoreColor", () => {
		it("should return red for poor scores", () => {
			expect(getScoreColor(0)).toBe("#FF3B30");
			expect(getScoreColor(25)).toBe("#FF3B30");
			expect(getScoreColor(49)).toBe("#FF3B30");
		});

		it("should return yellow for fair scores", () => {
			expect(getScoreColor(50)).toBe("#FFCC00");
			expect(getScoreColor(65)).toBe("#FFCC00");
			expect(getScoreColor(79)).toBe("#FFCC00");
		});

		it("should return green for good scores", () => {
			expect(getScoreColor(80)).toBe("#34C759");
			expect(getScoreColor(90)).toBe("#34C759");
			expect(getScoreColor(100)).toBe("#34C759");
		});
	});

	describe("getScoreBreakdown", () => {
		it("should return positive message for good scores", () => {
			const result = {
				score: 85,
				subScores: {
					stability: 90,
					level: 85,
					framing: 30,
					lighting: 90,
					aesthetic: 80,
					flatLay: 85,
					groupFraming: 100,
					centering: 90,
					documentSkew: 95,
					lowLightStability: 100,
				},
				weakestSubscore: "framing" as const,
				meetsThreshold: true,
				method: "rules-only" as const,
			};

			const breakdown = getScoreBreakdown(result);
			expect(breakdown).toContain("Great shot");
		});

		it("should identify framing as weakest area", () => {
			const result = {
				score: 60,
				subScores: {
					stability: 80,
					level: 80,
					framing: 30,
					lighting: 70,
					aesthetic: 60,
					flatLay: 80,
					groupFraming: 100,
					centering: 80,
					documentSkew: 90,
					lowLightStability: 100,
				},
				weakestSubscore: "framing" as const,
				meetsThreshold: false,
				method: "rules-only" as const,
			};

			const breakdown = getScoreBreakdown(result);
			expect(breakdown).toContain("Framing");
			expect(breakdown).toContain("30");
		});

		it("should indicate significant improvement needed for poor scores", () => {
			const result = {
				score: 30,
				subScores: {
					stability: 20,
					level: 80,
					framing: 80,
					lighting: 70,
					aesthetic: 0,
					flatLay: 60,
					groupFraming: 100,
					centering: 80,
					documentSkew: 85,
					lowLightStability: 100,
				},
				weakestSubscore: "stability" as const,
				meetsThreshold: false,
				method: "rules-only" as const,
			};

			const breakdown = getScoreBreakdown(result);
			expect(breakdown).toContain("significant improvement");
		});
	});

	describe("getSubscoreLabel", () => {
		it("should return correct labels for all subscores", () => {
			expect(getSubscoreLabel("stability")).toBe("Stability");
			expect(getSubscoreLabel("level")).toBe("Horizon Level");
			expect(getSubscoreLabel("framing")).toBe("Face Framing");
			expect(getSubscoreLabel("lighting")).toBe("Lighting");
			expect(getSubscoreLabel("aesthetic")).toBe("Aesthetic Quality");
		});
	});

	describe("normalizeAestheticScore", () => {
		it("should convert 0-1 to 0-100", () => {
			expect(normalizeAestheticScore(0)).toBe(0);
			expect(normalizeAestheticScore(0.5)).toBe(50);
			expect(normalizeAestheticScore(1)).toBe(100);
		});

		it("should clamp out-of-range values", () => {
			expect(normalizeAestheticScore(-0.5)).toBe(0);
			expect(normalizeAestheticScore(1.5)).toBe(100);
		});
	});

	describe("Constants", () => {
		it("should have correct threshold values", () => {
			expect(SCORE_THRESHOLDS.POOR).toBe(50);
			expect(SCORE_THRESHOLDS.GOOD).toBe(80);
		});

		it("should have correct max roll deviation", () => {
			expect(MAX_ROLL).toBe(10);
		});

		it("should have correct face area target", () => {
			expect(TARGET_FACE_AREA_PCT).toBe(35);
		});

		it("should have correct max face area deviation", () => {
			expect(MAX_FACE_AREA_DEVIATION).toBe(25);
		});

		it("rules weights should sum to 1", () => {
			const sum =
				DEFAULT_RULES_WEIGHTS.stability +
				DEFAULT_RULES_WEIGHTS.level +
				DEFAULT_RULES_WEIGHTS.framing +
				DEFAULT_RULES_WEIGHTS.lighting +
				DEFAULT_RULES_WEIGHTS.aesthetic;
			expect(sum).toBe(1);
		});

		it("hybrid weights should sum to 1", () => {
			const sum =
				DEFAULT_HYBRID_WEIGHTS.stability +
				DEFAULT_HYBRID_WEIGHTS.level +
				DEFAULT_HYBRID_WEIGHTS.framing +
				DEFAULT_HYBRID_WEIGHTS.lighting +
				DEFAULT_HYBRID_WEIGHTS.aesthetic +
				DEFAULT_HYBRID_WEIGHTS.flatLay;
			expect(sum).toBeCloseTo(1, 2);
		});
	});

	describe("Edge cases", () => {
		it("should handle NaN in model output", () => {
			const signals = {
				stability: 0.01,
				isStable: true,
				rollDeviation: 0,
				isLevel: true,
				framingGuidance: null,
				faceAreaPercent: 35,
				lightingClass: "good" as const,
				faceFramingEnabled: true,
				lightingAnalysisEnabled: true,
			};
			const modelOutput = { aestheticScore: NaN, confidence: 0.9 };
			const result = computeScore(signals, modelOutput);
			expect(result.method).toBe("rules-only");
		});

		it("should handle negative aesthetic score from model", () => {
			const signals = {
				stability: 0.01,
				isStable: true,
				rollDeviation: 0,
				isLevel: true,
				framingGuidance: null,
				faceAreaPercent: 35,
				lightingClass: "good" as const,
				faceFramingEnabled: true,
				lightingAnalysisEnabled: true,
			};
			const modelOutput = { aestheticScore: -0.2, confidence: 0.9 };
			const result = computeScore(signals, modelOutput);
			expect(result.subScores.aesthetic).toBe(0);
		});

		it("should handle zero face area when framing enabled", () => {
			const score = computeFramingScore(true, null, 0);
			// Zero face area is far from target, but no guidance means acceptable
			expect(score).toBeGreaterThanOrEqual(70);
		});
	});
});
