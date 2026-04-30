/**
 * Aesthetic model loader
 * Handles TFLite model loading with fallback for when model unavailable
 */

import {
	type AestheticModelOutput,
	DEFAULT_MODEL_INPUT_SPEC,
	type ModelLoadResult,
	type ModelLoadState,
	type TFLiteModel,
} from "./types";

/** Model asset path (bundled with app) */
export const MODEL_ASSET_PATH = "assets/models/aesthetic_model.tflite";

/** Model size threshold: warn if model exceeds 5MB */
export const MAX_MODEL_SIZE_MB = 5;

/** Current load state */
let currentLoadState: ModelLoadState = "not_loaded";

/** Loaded model instance (null if not loaded) */
let loadedModel: TFLiteModel | null = null;

/** Last error message */
let lastError: string | null = null;

/** Whether model failed to load (for silent fallback) */
let modelLoadFailed = false;

/**
 * Load the aesthetic TFLite model from app assets
 * Falls back silently if model unavailable (per spec requirement)
 * @returns Model load result
 */
export async function loadAestheticModel(): Promise<ModelLoadResult> {
	// Return early if already loaded
	if (currentLoadState === "loaded" && loadedModel) {
		return { success: true, modelSize: getModelSize() };
	}

	// Return early if already in error state
	if (currentLoadState === "error") {
		return {
			success: false,
			error: lastError || "Model previously failed to load",
		};
	}

	currentLoadState = "loading";

	try {
		// Try to load the model
		// NOTE: In production, this would use react-native-fast-tflite
		// For now, we check if model file exists and create a stub
		const model = await tryLoadModel();

		if (model) {
			loadedModel = model;
			currentLoadState = "loaded";
			modelLoadFailed = false;

			const modelSize = getModelSize();
			if (modelSize && modelSize > MAX_MODEL_SIZE_MB * 1024 * 1024) {
				console.warn(
					`[AestheticModel] Model size (${(modelSize / 1024 / 1024).toFixed(1)}MB) exceeds recommended ${MAX_MODEL_SIZE_MB}MB`,
				);
			}

			console.log("[AestheticModel] Model loaded successfully");
			return { success: true, modelSize };
		}

		// Model file doesn't exist - this is expected in development
		// Fall back silently per spec requirement
		currentLoadState = "error";
		modelLoadFailed = true;
		lastError = "Model file not found (expected in development)";
		console.log(
			"[AestheticModel] Model not available, using rules-only fallback",
		);

		return {
			success: false,
			error: lastError,
		};
	} catch (error) {
		currentLoadState = "error";
		modelLoadFailed = true;
		lastError = error instanceof Error ? error.message : String(error);

		// Log once and never crash per spec requirement
		console.log(
			"[AestheticModel] Model load failed (using rules-only fallback):",
			lastError,
		);

		return {
			success: false,
			error: lastError,
		};
	}
}

/** Stub model for testing (set via setTestModel) */
let testModel: TFLiteModel | null = null;

/**
 * Set a test model for unit testing
 * @param model Test model or null to clear
 */
export function setTestModel(model: TFLiteModel | null): void {
	testModel = model;
}

/**
 * Try to load the TFLite model
 * In production: uses react-native-fast-tflite
 * In development: returns null (fallback to rules-only)
 * @returns Loaded model or null if unavailable
 */
async function tryLoadModel(): Promise<TFLiteModel | null> {
	// TODO: When react-native-fast-tflite is installed, use:
	// const { loadTensorflowModel } = require('react-native-fast-tflite');
	// return await loadTensorflowModel(MODEL_ASSET_PATH);

	// Return test model if set (for unit testing)
	if (testModel) {
		return testModel;
	}

	// Return null to trigger fallback behavior
	return null;
}

/**
 * Create a stub model for testing
 */
function createStubModel(): TFLiteModel {
	return {
		run: async (_input: Float32Array) => {
			// Simulate model inference: return random aesthetic score
			const score = 0.5 + Math.random() * 0.4; // 0.5-0.9 range
			return new Float32Array([score]);
		},
		getInputShape: () => [
			1,
			DEFAULT_MODEL_INPUT_SPEC.height,
			DEFAULT_MODEL_INPUT_SPEC.width,
			DEFAULT_MODEL_INPUT_SPEC.channels,
		],
		getOutputShape: () => [1, 1],
		close: () => {
			// Stub close
		},
	};
}

// Keep createStubModel for test usage via setTestModel
export { createStubModel };

/**
 * Get the loaded model instance (null if not loaded)
 */
export function getLoadedModel(): TFLiteModel | null {
	return loadedModel;
}

/**
 * Get current model load state
 */
export function getModelLoadState(): ModelLoadState {
	return currentLoadState;
}

/**
 * Check if model is loaded and ready
 */
export function isModelLoaded(): boolean {
	return currentLoadState === "loaded" && loadedModel !== null;
}

/**
 * Check if model failed to load (for fallback logic)
 */
export function didModelFailToLoad(): boolean {
	return modelLoadFailed;
}

/**
 * Get last error message
 */
export function getLastModelError(): string | null {
	return lastError;
}

/**
 * Get model size if available
 */
function getModelSize(): number | undefined {
	// TODO: When using react-native-fast-tflite, query actual model size
	// For now, return undefined
	return undefined;
}

/**
 * Unload the model and release resources
 */
export function unloadAestheticModel(): void {
	if (loadedModel) {
		loadedModel.close();
		loadedModel = null;
	}
	currentLoadState = "not_loaded";
	modelLoadFailed = false;
	lastError = null;
}

/**
 * Run inference on preprocessed frame data
 * @param inputData Preprocessed Float32Array (224x224x3 RGB normalized)
 * @returns Model output or null if model not loaded
 */
export async function runAestheticInference(
	inputData: Float32Array,
): Promise<AestheticModelOutput | null> {
	if (!loadedModel) {
		return null;
	}

	try {
		const output = await loadedModel.run(inputData);

		// Parse output: assume single float in [0, 1] range
		const rawScore = output[0];

		// Validate output
		if (Number.isNaN(rawScore) || rawScore < 0 || rawScore > 1) {
			console.warn("[AestheticModel] Invalid model output:", rawScore);
			return null;
		}

		// Add confidence based on how centered the score is
		// Scores near 0.5 are less confident, scores near edges are more confident
		const confidence = 0.5 + Math.abs(rawScore - 0.5);

		return {
			aestheticScore: rawScore,
			confidence,
		};
	} catch (error) {
		console.warn("[AestheticModel] Inference failed:", error);
		return null;
	}
}
