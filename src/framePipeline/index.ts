/**
 * Frame Pipeline module
 *
 * A deep module owning the shared VisionCamera v5 worklet lifecycle
 * (enabled guard, pixel extraction, runOnJS bridge, dispose in finally)
 * so frame processors stay thin: they plug in an analysis function only.
 */

export { useFramePipeline } from "./useFramePipeline";
export type { UseFramePipelineOptions } from "./useFramePipeline";
