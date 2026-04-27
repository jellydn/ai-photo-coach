/**
 * Coaching prompt engine unit tests
 * Tests priority ordering, debouncing, and prompt selection
 */

import {
	COACHING_PROMPTS,
	type CoachingContext,
	type CoachingSignals,
	DEFAULT_PROMPT_DEBOUNCE_MS,
	isReadyForCapture,
	selectPrompt,
	shouldUpdatePrompt,
} from "../src/coaching/types";

describe("Coaching Prompt Engine", () => {
	describe("selectPrompt", () => {
		const baseContext: CoachingContext = {
			faceFramingEnabled: true,
			lightingAnalysisEnabled: true,
			compositionEnabled: true,
		};

		describe("Priority 1: Stability", () => {
			it("should return 'Hold steady' when device is unstable", () => {
				const signals: CoachingSignals = {
					isStable: false,
					isLevel: false,
					framingPrompt: "Step closer",
					lightingPrompt: "Too dark",
				};

				const result = selectPrompt(signals, baseContext);
				expect(result).toBe(COACHING_PROMPTS.UNSTABLE);
			});

			it("should return 'Hold steady' even when other issues exist", () => {
				const signals: CoachingSignals = {
					isStable: false,
					isLevel: true,
					framingPrompt: null,
					lightingPrompt: null,
				};

				const result = selectPrompt(signals, baseContext);
				expect(result).toBe(COACHING_PROMPTS.UNSTABLE);
			});
		});

		describe("Priority 2: Horizon Level", () => {
			it("should return 'Tilt to level' when stable but not level", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: false,
					framingPrompt: "Step closer",
					lightingPrompt: "Too dark",
				};

				const result = selectPrompt(signals, baseContext);
				expect(result).toBe(COACHING_PROMPTS.NOT_LEVEL);
			});

			it("should check level only after stability is satisfied", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: false,
					framingPrompt: null,
					lightingPrompt: null,
				};

				const result = selectPrompt(signals, baseContext);
				expect(result).toBe(COACHING_PROMPTS.NOT_LEVEL);
			});
		});

		describe("Priority 3: Framing", () => {
			it("should return framing prompt when stable and level but framing issues exist", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: true,
					framingPrompt: "Step closer",
					lightingPrompt: "Too dark",
				};

				const result = selectPrompt(signals, baseContext);
				expect(result).toBe("Step closer");
			});

			it("should skip framing when face framing is disabled for mode", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: true,
					framingPrompt: "Step closer",
					lightingPrompt: "Too dark",
				};

				const travelContext: CoachingContext = {
					...baseContext,
					faceFramingEnabled: false, // Travel mode has no face framing
				};

				const result = selectPrompt(signals, travelContext);
				expect(result).toBe("Too dark"); // Should skip to lighting
			});

			it("should pass through any framing prompt when framing is enabled", () => {
				const framingPrompts = [
					"Step closer",
					"Step back",
					"Lower camera",
					"Raise camera",
				];

				for (const prompt of framingPrompts) {
					const signals: CoachingSignals = {
						isStable: true,
						isLevel: true,
						framingPrompt: prompt,
						lightingPrompt: "Too dark",
					};

					const result = selectPrompt(signals, baseContext);
					expect(result).toBe(prompt);
				}
			});
		});

		describe("Priority 4: Lighting", () => {
			it("should return lighting prompt when stable, level, no framing issues", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: true,
					framingPrompt: null,
					lightingPrompt: "Too dark",
				};

				const result = selectPrompt(signals, baseContext);
				expect(result).toBe("Too dark");
			});

			it("should skip lighting when lighting analysis is disabled for mode", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: true,
					framingPrompt: null,
					lightingPrompt: "Too dark",
					compositionPrompt: "Center subject",
				};

				const noLightingContext: CoachingContext = {
					...baseContext,
					lightingAnalysisEnabled: false,
				};

				const result = selectPrompt(signals, noLightingContext);
				expect(result).toBe("Center subject"); // Should skip to composition
			});

			it("should pass through any lighting prompt", () => {
				const lightingPrompts = ["Too dark", "Too bright", "Face the light"];

				for (const prompt of lightingPrompts) {
					const signals: CoachingSignals = {
						isStable: true,
						isLevel: true,
						framingPrompt: null,
						lightingPrompt: prompt,
					};

					const result = selectPrompt(signals, baseContext);
					expect(result).toBe(prompt);
				}
			});
		});

		describe("Priority 5: Composition", () => {
			it("should return composition prompt when all other conditions satisfied", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: true,
					framingPrompt: null,
					lightingPrompt: null,
					compositionPrompt: "Center subject",
				};

				const result = selectPrompt(signals, baseContext);
				expect(result).toBe("Center subject");
			});

			it("should skip composition when disabled", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: true,
					framingPrompt: null,
					lightingPrompt: null,
					compositionPrompt: "Center subject",
				};

				const noCompositionContext: CoachingContext = {
					...baseContext,
					compositionEnabled: false,
				};

				const result = selectPrompt(signals, noCompositionContext);
				expect(result).toBeNull();
			});
		});

		describe("No-prompt case", () => {
			it("should return null when all conditions are satisfied", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: true,
					framingPrompt: null,
					lightingPrompt: null,
				};

				const result = selectPrompt(signals, baseContext);
				expect(result).toBeNull();
			});

			it("should return null when all features disabled", () => {
				const signals: CoachingSignals = {
					isStable: true,
					isLevel: true,
					framingPrompt: "Step closer",
					lightingPrompt: "Too dark",
					compositionPrompt: "Center subject",
				};

				const allDisabledContext: CoachingContext = {
					faceFramingEnabled: false,
					lightingAnalysisEnabled: false,
					compositionEnabled: false,
				};

				const result = selectPrompt(signals, allDisabledContext);
				expect(result).toBeNull();
			});
		});
	});

	describe("isReadyForCapture", () => {
		const baseContext: CoachingContext = {
			faceFramingEnabled: true,
			lightingAnalysisEnabled: true,
			compositionEnabled: true,
		};

		it("should return false when unstable", () => {
			const signals: CoachingSignals = {
				isStable: false,
				isLevel: true,
				framingPrompt: null,
				lightingPrompt: null,
			};

			expect(isReadyForCapture(signals, baseContext)).toBe(false);
		});

		it("should return false when not level", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: false,
				framingPrompt: null,
				lightingPrompt: null,
			};

			expect(isReadyForCapture(signals, baseContext)).toBe(false);
		});

		it("should return false when framing issues exist (if enabled)", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: "Step closer",
				lightingPrompt: null,
			};

			expect(isReadyForCapture(signals, baseContext)).toBe(false);
		});

		it("should return false when lighting issues exist (if enabled)", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: null,
				lightingPrompt: "Too dark",
			};

			expect(isReadyForCapture(signals, baseContext)).toBe(false);
		});

		it("should return true when all conditions satisfied", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: null,
				lightingPrompt: null,
			};

			expect(isReadyForCapture(signals, baseContext)).toBe(true);
		});

		it("should ignore framing issues when face framing disabled", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: "Step closer",
				lightingPrompt: null,
			};

			const travelContext: CoachingContext = {
				...baseContext,
				faceFramingEnabled: false,
			};

			expect(isReadyForCapture(signals, travelContext)).toBe(true);
		});

		it("should ignore lighting issues when lighting analysis disabled", () => {
			const signals: CoachingSignals = {
				isStable: true,
				isLevel: true,
				framingPrompt: null,
				lightingPrompt: "Too dark",
			};

			const noLightingContext: CoachingContext = {
				...baseContext,
				lightingAnalysisEnabled: false,
			};

			expect(isReadyForCapture(signals, noLightingContext)).toBe(true);
		});
	});

	describe("shouldUpdatePrompt (debouncing)", () => {
		const debounceMs = 500;

		it("should allow immediate update for first prompt", () => {
			const now = Date.now();
			const result = shouldUpdatePrompt(
				"Hold steady",
				null,
				now - 1000,
				debounceMs,
			);

			expect(result.shouldUpdate).toBe(true);
			expect(result.newPrompt).toBe("Hold steady");
		});

		it("should allow immediate clear (null prompt)", () => {
			const now = Date.now();
			const result = shouldUpdatePrompt(
				null,
				"Hold steady",
				now - 100,
				debounceMs,
			);

			expect(result.shouldUpdate).toBe(true);
			expect(result.newPrompt).toBeNull();
		});

		it("should not update if prompt unchanged", () => {
			const now = Date.now();
			const result = shouldUpdatePrompt(
				"Hold steady",
				"Hold steady",
				now - 1000,
				debounceMs,
			);

			expect(result.shouldUpdate).toBe(false);
			expect(result.newPrompt).toBe("Hold steady");
		});

		it("should update immediately if debounce period has passed", () => {
			const now = Date.now();
			const result = shouldUpdatePrompt(
				"Tilt to level",
				"Hold steady",
				now - 600,
				debounceMs,
			);

			expect(result.shouldUpdate).toBe(true);
			expect(result.newPrompt).toBe("Tilt to level");
		});

		it("should not update if within debounce period", () => {
			const now = Date.now();
			const result = shouldUpdatePrompt(
				"Tilt to level",
				"Hold steady",
				now - 100,
				debounceMs,
			);

			expect(result.shouldUpdate).toBe(false);
			expect(result.newPrompt).toBe("Hold steady");
		});

		it("should update timestamp on successful update", () => {
			const before = Date.now();
			const result = shouldUpdatePrompt(
				"Step closer",
				"Hold steady",
				before - 1000,
				debounceMs,
			);
			const after = Date.now();

			expect(result.shouldUpdate).toBe(true);
			expect(result.newUpdateTime).toBeGreaterThanOrEqual(before);
			expect(result.newUpdateTime).toBeLessThanOrEqual(after);
		});

		it("should preserve last update time when not updating", () => {
			const lastUpdate = Date.now() - 100;
			const result = shouldUpdatePrompt(
				"Tilt to level",
				"Hold steady",
				lastUpdate,
				debounceMs,
			);

			expect(result.shouldUpdate).toBe(false);
			expect(result.newUpdateTime).toBe(lastUpdate);
		});

		it("should use default debounce if not specified", () => {
			const now = Date.now();
			const result = shouldUpdatePrompt(
				"Tilt to level",
				"Hold steady",
				now - 100,
			);

			// Should not update (within default 500ms)
			expect(result.shouldUpdate).toBe(false);
		});

		it("should respect custom debounce value", () => {
			const now = Date.now();
			const customDebounce = 100;

			const result = shouldUpdatePrompt(
				"Tilt to level",
				"Hold steady",
				now - 150,
				customDebounce,
			);

			expect(result.shouldUpdate).toBe(true);
		});
	});

	describe("Prompt string requirements", () => {
		it("all built-in prompts should be 5 words or less", () => {
			const allPrompts = Object.values(COACHING_PROMPTS);
			for (const prompt of allPrompts) {
				const wordCount = prompt.split(/\s+/).length;
				expect(wordCount).toBeLessThanOrEqual(5);
			}
		});

		it("should have prompts defined for all priority levels", () => {
			expect(COACHING_PROMPTS.UNSTABLE).toBeDefined();
			expect(COACHING_PROMPTS.NOT_LEVEL).toBeDefined();
			expect(COACHING_PROMPTS.TOO_DARK).toBeDefined();
			expect(COACHING_PROMPTS.TOO_BRIGHT).toBeDefined();
			expect(COACHING_PROMPTS.BACKLIT).toBeDefined();
		});
	});

	describe("Constants", () => {
		it("should export DEFAULT_PROMPT_DEBOUNCE_MS as 500", () => {
			expect(DEFAULT_PROMPT_DEBOUNCE_MS).toBe(500);
		});
	});
});
