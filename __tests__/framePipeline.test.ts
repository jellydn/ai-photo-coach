/**
 * Frame Pipeline unit tests
 * Verifies the shared worklet lifecycle: enabled guard, pixel extraction,
 * runOnJS bridge, and mandatory frame.dispose() in try/finally.
 */

import { renderHook } from "@testing-library/react-native";
import { type Frame, useFrameOutput } from "react-native-vision-camera";
import { useFramePipeline } from "../src/framePipeline";

/** Build a minimal VisionCamera frame shaped like the native one. */
function createMockFrame(overrides: Partial<Frame> = {}): Frame {
	const width = overrides.width ?? 640;
	const height = overrides.height ?? 480;
	const pixelData = new Uint8Array(width * height * 4);
	return {
		width,
		height,
		pixelFormat: "rgb",
		timestamp: Date.now(),
		orientation: "portrait",
		isValid: true,
		bytesPerRow: width * 4,
		isPlanar: false,
		isMirrored: false,
		getPixelBuffer: jest.fn(() => pixelData.buffer),
		getPlanes: jest.fn(() => []),
		dispose: jest.fn(),
		...overrides,
	} as unknown as Frame;
}

describe("useFramePipeline", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Provide a runOnJS bridge so the worklet path is exercised in tests.
		(globalThis as Record<string, unknown>).runOnJS = (
			fn: () => void,
		) => () => fn();
	});

	it("should return null frame output when disabled", () => {
		const analyze = jest.fn();
		const onResult = jest.fn();

		const { result } = renderHook(() =>
			useFramePipeline({
				enabled: false,
				analyze,
				onResult,
			}),
		);

		expect(result.current).toBeNull();
	});

	it("should return a frame output when enabled", () => {
		const { result } = renderHook(() =>
			useFramePipeline({
				enabled: true,
				analyze: () => 42,
				onResult: () => {},
			}),
		);

		expect(result.current).toBeDefined();
		expect(useFrameOutput).toHaveBeenCalled();
	});

	it("should extract pixels, run analysis, bridge result, and dispose frame", () => {
		const analyze = jest.fn(
			(pixels: Uint8Array, width: number, height: number) => ({
				pixels: pixels.length,
				width,
				height,
			}),
		);
		const onResult = jest.fn();

		renderHook(() =>
			useFramePipeline({
				enabled: true,
				analyze,
				onResult,
			}),
		);

		// Grab the onFrame worklet that was passed to useFrameOutput.
		const options = (useFrameOutput as jest.Mock).mock.calls[0][0];
		expect(options.onFrame).toBeDefined();

		const frame = createMockFrame({ width: 640, height: 480 });
		options.onFrame(frame);

		expect(analyze).toHaveBeenCalledTimes(1);
		const [pixels, width, height] = analyze.mock.calls[0];
		expect(width).toBe(640);
		expect(height).toBe(480);
		expect(pixels).toBeInstanceOf(Uint8Array);
		expect(pixels.length).toBe(640 * 480 * 4);

		expect(onResult).toHaveBeenCalledTimes(1);
		expect(onResult.mock.calls[0][0]).toEqual({
			pixels: 640 * 480 * 4,
			width: 640,
			height: 480,
		});

		// Frame must always be disposed (try/finally lifecycle).
		expect(frame.dispose).toHaveBeenCalled();
	});

	it("should dispose the frame without analyzing when disabled", () => {
		const analyze = jest.fn();
		const onResult = jest.fn();

		renderHook(() =>
			useFramePipeline({
				enabled: false,
				analyze,
				onResult,
			}),
		);

		// The pipeline registers onFrame even when disabled; driving it must
		// short-circuit: dispose without analyzing.
		const options = (useFrameOutput as jest.Mock).mock.calls[0][0];
		expect(options.onFrame).toBeDefined();

		const frame = createMockFrame();
		options.onFrame(frame);
		expect(analyze).not.toHaveBeenCalled();
		expect(frame.dispose).toHaveBeenCalled();
	});
});
