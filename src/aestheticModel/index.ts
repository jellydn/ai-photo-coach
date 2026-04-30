/**
 * Aesthetic model module
 * TFLite aesthetic model integration for hybrid scoring
 *
 * Usage:
 *   import { useAestheticFrameProcessor } from './aestheticModel';
 *
 *   const { isModelLoaded, processFrame } = useAestheticFrameProcessor({
 *     enabled: true,
 *     onModelOutput: (output) => setModelOutput(output),
 *   });
 */

// Model loader
export {
	didModelFailToLoad,
	getLastModelError,
	getLoadedModel,
	getModelLoadState,
	isModelLoaded,
	loadAestheticModel,
	MAX_MODEL_SIZE_MB,
	MODEL_ASSET_PATH,
	runAestheticInference,
	setTestModel,
	unloadAestheticModel,
} from "./modelLoader";
// Types
export type {
	AestheticFrameProcessorConfig,
	AestheticModelOutput,
	FrameData,
	ModelInputSpec,
	ModelLoadResult,
	ModelLoadState,
	PreprocessOptions,
	RawModelOutput,
	TFLiteModel,
} from "./types";
// Constants
export {
	DEFAULT_FRAME_PROCESSOR_CONFIG,
	DEFAULT_MODEL_INPUT_SPEC,
	DEFAULT_PREPROCESS_OPTIONS,
} from "./types";
// Re-export types for convenience
export type {
	UseAestheticFrameProcessorProps,
	UseAestheticFrameProcessorResult,
} from "./useAestheticFrameProcessor";
// Frame processor
export {
	AESTHETIC_FRAME_INTERVAL_MS,
	FrameSkipper,
	MAX_MODEL_INPUT_SIZE,
	preprocessFrameForModel,
	processAestheticFrameWorklet,
	TARGET_AESTHETIC_FPS,
	useAestheticFrameProcessor,
} from "./useAestheticFrameProcessor";
