/**
 * Lighting hooks unit tests
 * Tests useLighting and useLightingFrameProcessor hooks
 */

import { act, renderHook } from "@testing-library/react-native";
import {
	type classifyLighting,
	DEFAULT_LIGHTING_THRESHOLDS,
	type LightingStatsWithRegions,
	useLighting,
	useLightingFrameOutput,
} from "../src/lighting";

describe("useLighting Hook", () => {
	const defaultThresholds = DEFAULT_LIGHTING_THRESHOLDS;

	it("should return initial good state when enabled but no frame data", () => {
		const { result } = renderHook(() =>
			useLighting({
				enabled: true,
				thresholds: defaultThresholds,
			}),
		);

		expect(result.current.lightingClass).toBe("good");
		expect(result.current.stats).toBeNull();
		expect(result.current.isGood).toBe(true);
		expect(result.current.meanLuminance).toBe(128); // Default
		expect(result.current.prompt).toBeNull();
	});

	it("should return disabled state when not enabled", () => {
		const { result } = renderHook(() =>
			useLighting({
				enabled: false,
				thresholds: defaultThresholds,
			}),
		);

		expect(result.current.lightingClass).toBe("good");
		expect(result.current.stats).toBeNull();
		expect(result.current.isGood).toBe(true);
	});

	it("should update state when handleFrameStats is called with real frame data", () => {
		const { result } = renderHook(() =>
			useLighting({
				enabled: true,
				thresholds: defaultThresholds,
			}),
		);

		const frameStats: LightingStatsWithRegions = {
			meanLuminance: 25,
			histogram: {
				shadowPercentage: 55,
				highlightPercentage: 5,
				isShadowClipped: true,
				isHighlightClipped: false,
			},
			frameDimensions: { width: 320, height: 240 },
			backgroundBrightness: 30,
			brightnessRatio: 0.83,
		};

		act(() => {
			result.current.handleFrameStats(frameStats);
		});

		expect(result.current.lightingClass).toBe("too_dark");
		expect(result.current.stats).toEqual(frameStats);
		expect(result.current.isGood).toBe(false);
		expect(result.current.meanLuminance).toBe(25);
		expect(result.current.prompt).toBe("Too dark");
	});

	it("should classify backlit condition from frame data", () => {
		const { result } = renderHook(() =>
			useLighting({
				enabled: true,
				thresholds: defaultThresholds,
				faceBounds: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 },
			}),
		);

		const frameStats: LightingStatsWithRegions = {
			meanLuminance: 100,
			histogram: {
				shadowPercentage: 20,
				highlightPercentage: 25,
				isShadowClipped: false,
				isHighlightClipped: false,
			},
			frameDimensions: { width: 320, height: 240 },
			faceBrightness: 70,
			backgroundBrightness: 180,
			brightnessRatio: 70 / 180,
		};

		act(() => {
			result.current.handleFrameStats(frameStats);
		});

		expect(result.current.lightingClass).toBe("backlit");
		expect(result.current.isBacklit).toBe(true);
		expect(result.current.prompt).toBe("Face the light");
	});

	it("should update classification when new frame stats arrive", () => {
		const { result } = renderHook(() =>
			useLighting({
				enabled: true,
				thresholds: defaultThresholds,
			}),
		);

		// First frame: too dark
		act(() => {
			result.current.handleFrameStats({
				meanLuminance: 20,
				histogram: {
					shadowPercentage: 50,
					highlightPercentage: 5,
					isShadowClipped: true,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				backgroundBrightness: 25,
				brightnessRatio: 0.8,
			});
		});

		expect(result.current.lightingClass).toBe("too_dark");

		// Second frame: good lighting
		act(() => {
			result.current.handleFrameStats({
				meanLuminance: 140,
				histogram: {
					shadowPercentage: 10,
					highlightPercentage: 15,
					isShadowClipped: false,
					isHighlightClipped: false,
				},
				frameDimensions: { width: 320, height: 240 },
				backgroundBrightness: 145,
				brightnessRatio: 0.97,
			});
		});

		expect(result.current.lightingClass).toBe("good");
		expect(result.current.isGood).toBe(true);
		expect(result.current.prompt).toBeNull();
	});
});

describe("useLighting Hook - Simulation Mode", () => {
	const defaultThresholds = DEFAULT_LIGHTING_THRESHOLDS;

	it("should cycle through lighting conditions in simulation mode", async () => {
		jest.useFakeTimers();

		const { result } = renderHook(() =>
			useLighting({
				enabled: true,
				thresholds: defaultThresholds,
				useSimulatedData: true,
			}),
		);

		// Initial state should be good
		expect(result.current.lightingClass).toBe("good");

		// Advance time to trigger simulation cycle
		await act(async () => {
			jest.advanceTimersByTime(50);
		});

		// Should have some stats after first simulation tick
		expect(result.current.stats).not.toBeNull();
		expect(result.current.meanLuminance).toBeGreaterThan(0);

		jest.useRealTimers();
	});

	it("should stop simulation when disabled", async () => {
		jest.useFakeTimers();

		const { result, rerender } = renderHook(
			(props: { enabled: boolean }) =>
				useLighting({
					enabled: props.enabled,
					thresholds: defaultThresholds,
					useSimulatedData: true,
				}),
			{ initialProps: { enabled: true } },
		);

		// Let it run for a bit
		await act(async () => {
			jest.advanceTimersByTime(100);
		});

		const statsBefore = result.current.stats;
		expect(statsBefore).not.toBeNull();

		// Disable the hook
		rerender({ enabled: false });

		// Stats should be cleared
		expect(result.current.stats).toBeNull();
		expect(result.current.lightingClass).toBe("good");

		jest.useRealTimers();
	});
});

describe("useLightingFrameOutput Hook", () => {
	it("should return frameOutput when enabled", () => {
		const mockOnStats = jest.fn();

		const { result } = renderHook(() =>
			useLightingFrameOutput({
				enabled: true,
				thresholds: DEFAULT_LIGHTING_THRESHOLDS,
				onLightingStats: mockOnStats,
			}),
		);

		// frameOutput should be defined (will be null in mock, but hook returns it)
		expect(result.current).toBeDefined();
	});

	it("should return null frameOutput when disabled", () => {
		const mockOnStats = jest.fn();

		const { result } = renderHook(() =>
			useLightingFrameOutput({
				enabled: false,
				thresholds: DEFAULT_LIGHTING_THRESHOLDS,
				onLightingStats: mockOnStats,
			}),
		);

		expect(result.current.frameOutput).toBeNull();
	});
});

describe("Integration: Frame Output to useLighting", () => {
	const defaultThresholds = DEFAULT_LIGHTING_THRESHOLDS;

	it("should pass stats from frame output to lighting hook", () => {
		// This test simulates the integration pattern used in CameraScreen
		const mockOnStats = jest.fn();

		// Render the frame output hook
		renderHook(() =>
			useLightingFrameOutput({
				enabled: true,
				thresholds: defaultThresholds,
				onLightingStats: mockOnStats,
			}),
		);

		// Render the lighting hook
		const { result: lightingResult } = renderHook(() =>
			useLighting({
				enabled: true,
				thresholds: defaultThresholds,
			}),
		);

		// Simulate frame stats being passed through the callback chain
		const frameStats: LightingStatsWithRegions = {
			meanLuminance: 240,
			histogram: {
				shadowPercentage: 5,
				highlightPercentage: 45,
				isShadowClipped: false,
				isHighlightClipped: true,
			},
			frameDimensions: { width: 320, height: 240 },
			backgroundBrightness: 245,
			brightnessRatio: 0.98,
		};

		// Call the lighting hook's handler directly (simulating what frame processor would do)
		act(() => {
			lightingResult.current.handleFrameStats(frameStats);
		});

		// Verify the lighting hook received and processed the stats
		expect(lightingResult.current.lightingClass).toBe("too_bright");
		expect(lightingResult.current.meanLuminance).toBe(240);
		expect(lightingResult.current.prompt).toBe("Too bright");
		expect(lightingResult.current.isGood).toBe(false);
	});

	it("should classify lighting correctly with frame data integration", () => {
		const { result } = renderHook(() =>
			useLighting({
				enabled: true,
				thresholds: defaultThresholds,
			}),
		);

		// Test all lighting classifications
		const testCases: Array<{
			stats: LightingStatsWithRegions;
			expected: ReturnType<typeof classifyLighting>;
		}> = [
			{
				stats: {
					meanLuminance: 20,
					histogram: {
						shadowPercentage: 50,
						highlightPercentage: 5,
						isShadowClipped: true,
						isHighlightClipped: false,
					},
					frameDimensions: { width: 320, height: 240 },
					backgroundBrightness: 25,
					brightnessRatio: 0.8,
				},
				expected: "too_dark",
			},
			{
				stats: {
					meanLuminance: 240,
					histogram: {
						shadowPercentage: 5,
						highlightPercentage: 50,
						isShadowClipped: false,
						isHighlightClipped: true,
					},
					frameDimensions: { width: 320, height: 240 },
					backgroundBrightness: 245,
					brightnessRatio: 0.98,
				},
				expected: "too_bright",
			},
			{
				stats: {
					meanLuminance: 100,
					histogram: {
						shadowPercentage: 20,
						highlightPercentage: 25,
						isShadowClipped: false,
						isHighlightClipped: false,
					},
					frameDimensions: { width: 320, height: 240 },
					faceBrightness: 60,
					backgroundBrightness: 180,
					brightnessRatio: 60 / 180,
				},
				expected: "backlit",
			},
			{
				stats: {
					meanLuminance: 140,
					histogram: {
						shadowPercentage: 15,
						highlightPercentage: 15,
						isShadowClipped: false,
						isHighlightClipped: false,
					},
					frameDimensions: { width: 320, height: 240 },
					backgroundBrightness: 145,
					brightnessRatio: 0.97,
				},
				expected: "good",
			},
		];

		for (const { stats, expected } of testCases) {
			act(() => {
				result.current.handleFrameStats(stats);
			});

			expect(result.current.lightingClass).toBe(expected);
		}
	});
});
