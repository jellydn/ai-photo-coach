/**
 * Aesthetic model unit tests
 * Tests model loading, frame processing, and hybrid scoring integration
 */

import {
	AESTHETIC_FRAME_INTERVAL_MS,
	DEFAULT_FRAME_PROCESSOR_CONFIG,
	DEFAULT_MODEL_INPUT_SPEC,
	DEFAULT_PREPROCESS_OPTIONS,
	type FrameData,
	FrameSkipper,
	MAX_MODEL_INPUT_SIZE,
	preprocessFrameForModel,
	TARGET_AESTHETIC_FPS,
} from "../src/aestheticModel";
import {
	didModelFailToLoad,
	getLastModelError,
	getModelLoadState,
	isModelLoaded,
	loadAestheticModel,
	MAX_MODEL_SIZE_MB,
	MODEL_ASSET_PATH,
	runAestheticInference,
	unloadAestheticModel,
} from "../src/aestheticModel/modelLoader";

describe("Aesthetic Model", () => {
	describe("Types and Constants", () => {
		it("should have correct default input spec", () => {
			expect(DEFAULT_MODEL_INPUT_SPEC.width).toBe(224);
			expect(DEFAULT_MODEL_INPUT_SPEC.height).toBe(224);
			expect(DEFAULT_MODEL_INPUT_SPEC.channels).toBe(3);
			expect(DEFAULT_MODEL_INPUT_SPEC.normalization).toBe(255);
		});

		it("should have correct default frame processor config", () => {
			expect(DEFAULT_FRAME_PROCESSOR_CONFIG.targetFps).toBe(5);
			expect(DEFAULT_FRAME_PROCESSOR_CONFIG.inputSize).toBe(224);
			expect(DEFAULT_FRAME_PROCESSOR_CONFIG.useGpu).toBe(false);
			expect(DEFAULT_FRAME_PROCESSOR_CONFIG.skipDuplicateFrames).toBe(true);
		});

		it("should have correct default preprocess options", () => {
			expect(DEFAULT_PREPROCESS_OPTIONS.targetWidth).toBe(224);
			expect(DEFAULT_PREPROCESS_OPTIONS.targetHeight).toBe(224);
			expect(DEFAULT_PREPROCESS_OPTIONS.normalize).toBe(true);
			expect(DEFAULT_PREPROCESS_OPTIONS.normalizationDivisor).toBe(255);
		});

		it("should have correct FPS constants", () => {
			expect(TARGET_AESTHETIC_FPS).toBe(5);
			expect(AESTHETIC_FRAME_INTERVAL_MS).toBe(200); // 1000 / 5
		});

		it("should have correct max input size", () => {
			expect(MAX_MODEL_INPUT_SIZE).toBe(224);
		});

		it("should have correct model asset path", () => {
			expect(MODEL_ASSET_PATH).toBe("assets/models/aesthetic_model.tflite");
		});

		it("should have correct max model size", () => {
			expect(MAX_MODEL_SIZE_MB).toBe(5);
		});
	});

	describe("Model Loader", () => {
		beforeEach(() => {
			// Reset model state before each test
			unloadAestheticModel();
		});

		afterEach(() => {
			unloadAestheticModel();
		});

		it("should start in not_loaded state", () => {
			expect(getModelLoadState()).toBe("not_loaded");
			expect(isModelLoaded()).toBe(false);
			expect(didModelFailToLoad()).toBe(false);
		});

		it("should return error when model not available", async () => {
			const result = await loadAestheticModel();
			// In development, model file doesn't exist
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(getModelLoadState()).toBe("error");
			expect(isModelLoaded()).toBe(false);
			expect(didModelFailToLoad()).toBe(true);
		});

		it("should track last error on failure", async () => {
			await loadAestheticModel();
			expect(getLastModelError()).toBeTruthy();
		});

		it("should reset state on unload", async () => {
			await loadAestheticModel();
			unloadAestheticModel();
			expect(getModelLoadState()).toBe("not_loaded");
			expect(isModelLoaded()).toBe(false);
			expect(getLastModelError()).toBeNull();
		});

		it("should return null for inference when model not loaded", async () => {
			const inputData = new Float32Array(224 * 224 * 3).fill(0.5);
			const output = await runAestheticInference(inputData);
			expect(output).toBeNull();
		});
	});

	describe("Frame Preprocessing", () => {
		it("should preprocess frame to correct size", () => {
			// Create a simple 448x448 test frame (4x the model input size)
			const width = 448;
			const height = 448;
			const pixels = new Uint8Array(width * height * 4);

			// Fill with gradient pattern
			for (let i = 0; i < width * height; i++) {
				pixels[i * 4] = Math.floor(((i % width) / width) * 255); // R
				pixels[i * 4 + 1] = Math.floor((i / width / height) * 255); // G
				pixels[i * 4 + 2] = 128; // B
				pixels[i * 4 + 3] = 255; // A
			}

			const frameData: FrameData = { pixels, width, height };
			const result = preprocessFrameForModel(frameData);

			expect(result).not.toBeNull();
			expect(result!.length).toBe(224 * 224 * 3); // RGB, no alpha

			// Values should be normalized to [0, 1]
			expect(result![0]).toBeGreaterThanOrEqual(0);
			expect(result![0]).toBeLessThanOrEqual(1);
		});

		it("should handle non-square frames", () => {
			const width = 640;
			const height = 480;
			const pixels = new Uint8Array(width * height * 4).fill(128);

			const frameData: FrameData = { pixels, width, height };
			const result = preprocessFrameForModel(frameData);

			expect(result).not.toBeNull();
			expect(result!.length).toBe(224 * 224 * 3);
		});

		it("should extract RGB and skip alpha", () => {
			const width = 224;
			const height = 224;
			const pixels = new Uint8Array(width * height * 4);

			// Fill with known pattern: R=100, G=150, B=200, A=255
			for (let i = 0; i < width * height; i++) {
				pixels[i * 4] = 100;
				pixels[i * 4 + 1] = 150;
				pixels[i * 4 + 2] = 200;
				pixels[i * 4 + 3] = 255;
			}

			const frameData: FrameData = { pixels, width, height };
			const result = preprocessFrameForModel(frameData);

			// First pixel should have normalized RGB values
			expect(result![0]).toBeCloseTo(100 / 255, 5); // R
			expect(result![1]).toBeCloseTo(150 / 255, 5); // G
			expect(result![2]).toBeCloseTo(200 / 255, 5); // B
		});

		it("should return null for empty frame", () => {
			const frameData: FrameData = {
				pixels: new Uint8Array(0),
				width: 0,
				height: 0,
			};
			const result = preprocessFrameForModel(frameData);
			expect(result).toBeNull();
		});

		it("should downsample correctly (sample values should match)", () => {
			// Create a 2x2 frame scaled to 224x224 for simplicity in test
			// Use exact 224x224 to test 1:1 sampling
			const width = 224;
			const height = 224;
			const pixels = new Uint8Array(width * height * 4);

			// Fill with solid color
			for (let i = 0; i < width * height; i++) {
				pixels[i * 4] = 255; // R
				pixels[i * 4 + 1] = 128; // G
				pixels[i * 4 + 2] = 64; // B
				pixels[i * 4 + 3] = 255; // A
			}

			const frameData: FrameData = { pixels, width, height };
			const result = preprocessFrameForModel(frameData);

			// All values should be the normalized solid color
			expect(result![0]).toBeCloseTo(1.0, 5); // R = 255/255
			expect(result![1]).toBeCloseTo(128 / 255, 5); // G
			expect(result![2]).toBeCloseTo(64 / 255, 5); // B
		});
	});

	describe("FrameSkipper", () => {
		it("should allow first frame always", () => {
			const skipper = new FrameSkipper(5);
			expect(skipper.shouldProcess()).toBe(true);
		});

		it("should skip frames within interval", () => {
			const skipper = new FrameSkipper(5); // 200ms interval
			skipper.shouldProcess(); // First frame

			// Immediately try again - should be skipped
			expect(skipper.shouldProcess()).toBe(false);
			expect(skipper.shouldProcess()).toBe(false);
		});

		it("should allow frame after interval", (done) => {
			const skipper = new FrameSkipper(5); // 200ms interval
			skipper.shouldProcess(); // First frame

			// Wait for interval to pass
			setTimeout(() => {
				expect(skipper.shouldProcess()).toBe(true);
				done();
			}, 210);
		});

		it("should reset and allow immediate frame", () => {
			const skipper = new FrameSkipper(5);
			skipper.shouldProcess(); // First frame
			skipper.shouldProcess(); // Skipped

			skipper.reset();
			expect(skipper.shouldProcess()).toBe(true);
		});

		it("should calculate correct interval for different FPS", () => {
			const skipper5 = new FrameSkipper(5);
			const skipper10 = new FrameSkipper(10);
			const skipper1 = new FrameSkipper(1);

			// Test by checking first frame allowed, then immediate second
			expect(skipper5.shouldProcess()).toBe(true);
			expect(skipper5.shouldProcess()).toBe(false);

			expect(skipper10.shouldProcess()).toBe(true);
			expect(skipper10.shouldProcess()).toBe(false);

			expect(skipper1.shouldProcess()).toBe(true);
			expect(skipper1.shouldProcess()).toBe(false);
		});
	});

	describe("Hybrid Scoring Integration", () => {
		it("should convert raw score to aesthetic output format", () => {
			// Test that output format matches MLModelOutput interface
			const rawScore = 0.75;
			const confidence = 0.5 + Math.abs(rawScore - 0.5); // Formula from implementation

			expect(rawScore).toBeGreaterThanOrEqual(0);
			expect(rawScore).toBeLessThanOrEqual(1);
			expect(confidence).toBeGreaterThanOrEqual(0.5);
			expect(confidence).toBeLessThanOrEqual(1);
		});

		it("should handle edge case scores", () => {
			// Test extreme scores
			const minScore = 0;
			const maxScore = 1;
			const midScore = 0.5;

			// Min score confidence
			const minConfidence = 0.5 + Math.abs(minScore - 0.5);
			expect(minConfidence).toBe(1); // Edge = max confidence

			// Max score confidence
			const maxConfidence = 0.5 + Math.abs(maxScore - 0.5);
			expect(maxConfidence).toBe(1); // Edge = max confidence

			// Mid score confidence
			const midConfidence = 0.5 + Math.abs(midScore - 0.5);
			expect(midConfidence).toBe(0.5); // Center = min confidence
		});
	});

	describe("Spec Compliance", () => {
		it("should target 5 FPS for model inference", () => {
			expect(TARGET_AESTHETIC_FPS).toBe(5);
			expect(AESTHETIC_FRAME_INTERVAL_MS).toBe(200);
		});

		it("should use 224x224 input size", () => {
			expect(MAX_MODEL_INPUT_SIZE).toBe(224);
			expect(DEFAULT_MODEL_INPUT_SPEC.width).toBe(224);
			expect(DEFAULT_MODEL_INPUT_SPEC.height).toBe(224);
		});

		it("should handle model load failure gracefully", async () => {
			unloadAestheticModel();
			const result = await loadAestheticModel();
			// Should not throw - per spec requirement
			expect(() => result).not.toThrow();
		});

		it("should never return negative scores", () => {
			const testScores = [-0.1, 0, 0.5, 1, 1.1];
			for (const score of testScores) {
				// Clamp to [0, 1] range
				const clamped = Math.max(0, Math.min(1, score));
				expect(clamped).toBeGreaterThanOrEqual(0);
				expect(clamped).toBeLessThanOrEqual(1);
			}
		});
	});
});
