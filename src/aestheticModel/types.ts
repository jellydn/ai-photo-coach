/**
 * Aesthetic model types for TFLite model integration
 * Defines types for model loading, inference, and output
 */

/**
 * Model loading state
 */
export type ModelLoadState = "loading" | "loaded" | "error" | "not_loaded";

/**
 * Model loading result
 */
export interface ModelLoadResult {
	/** Whether model loaded successfully */
	success: boolean;
	/** Error message if loading failed */
	error?: string;
	/** Model size in bytes (if available) */
	modelSize?: number;
}

/**
 * Input tensor specification for aesthetic model
 * Expected input: 224x224 RGB image normalized to [0, 1]
 */
export interface ModelInputSpec {
	/** Input width in pixels */
	width: number;
	/** Input height in pixels */
	height: number;
	/** Number of channels (3 for RGB) */
	channels: number;
	/** Normalization: pixel values divided by this (typically 255) */
	normalization: number;
}

/** Default input spec for aesthetic model: 224x224 RGB, normalized by 255 */
export const DEFAULT_MODEL_INPUT_SPEC: ModelInputSpec = {
	width: 224,
	height: 224,
	channels: 3,
	normalization: 255,
};

/**
 * Raw output from TFLite model inference
 */
export interface RawModelOutput {
	/** Raw aesthetic score from model (before normalization) */
	rawScore: number;
	/** Confidence in prediction (0-1) */
	confidence: number;
}

/**
 * Processed aesthetic model output
 * Matches MLModelOutput interface from scoring module
 */
export interface AestheticModelOutput {
	/** Aesthetic quality score (0-1) */
	aestheticScore: number;
	/** Confidence in prediction (0-1) */
	confidence: number;
}

/**
 * Frame processor configuration
 */
export interface AestheticFrameProcessorConfig {
	/** Target FPS for model inference (default 5 Hz) */
	targetFps: number;
	/** Input image size for model (default 224) */
	inputSize: number;
	/** Whether to use GPU acceleration if available */
	useGpu: boolean;
	/** Whether to skip processing when frame is unchanged */
	skipDuplicateFrames: boolean;
}

/** Default frame processor configuration */
export const DEFAULT_FRAME_PROCESSOR_CONFIG: AestheticFrameProcessorConfig = {
	targetFps: 5,
	inputSize: 224,
	useGpu: false,
	skipDuplicateFrames: true,
};

/**
 * Frame data for model inference
 */
export interface FrameData {
	/** RGBA pixel buffer */
	pixels: Uint8Array;
	/** Frame width */
	width: number;
	/** Frame height */
	height: number;
}

/**
 * Preprocessing options for frame data
 */
export interface PreprocessOptions {
	/** Target width after resize */
	targetWidth: number;
	/** Target height after resize */
	targetHeight: number;
	/** Whether to normalize pixel values to [0, 1] */
	normalize: boolean;
	/** Normalization divisor (typically 255) */
	normalizationDivisor: number;
}

/** Default preprocessing options */
export const DEFAULT_PREPROCESS_OPTIONS: PreprocessOptions = {
	targetWidth: 224,
	targetHeight: 224,
	normalize: true,
	normalizationDivisor: 255,
};

/**
 * TFLite model interface (abstracted for testing)
 */
export interface TFLiteModel {
	/** Run inference on input data */
	run(input: Float32Array): Promise<Float32Array>;
	/** Get input tensor shape */
	getInputShape(): number[];
	/** Get output tensor shape */
	getOutputShape(): number[];
	/** Release model resources */
	close(): void;
}

/**
 * Model loader interface
 */
export interface ModelLoader {
	/** Load model from path */
	loadModel(modelPath: string): Promise<TFLiteModel>;
	/** Get last error if loading failed */
	getLastError(): string | null;
}
