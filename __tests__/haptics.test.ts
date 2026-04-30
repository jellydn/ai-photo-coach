/**
 * Haptics module unit tests
 *
 * Tests for haptic feedback functionality including rate limiting,
 * event triggering, and settings integration.
 */

import { renderHook } from "@testing-library/react-native";
import {
	clearHapticRateLimits,
	DEFAULT_HAPTIC_RATE_LIMIT_MS,
	getTimeSinceLastHaptic,
	shouldTriggerHaptic,
	triggerHaptic,
	triggerHapticEvent,
} from "../src/haptics/haptics";
import { EVENT_HAPTIC_MAP } from "../src/haptics/types";
import { type UseHapticsProps, useHaptics } from "../src/haptics/useHaptics";

// Mock React Native Vibration
jest.mock("react-native", () => ({
	Vibration: {
		vibrate: jest.fn(),
	},
}));

import { Vibration } from "react-native";

describe("Haptics Module", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		clearHapticRateLimits();
	});

	afterEach(() => {
		clearHapticRateLimits();
	});

	describe("shouldTriggerHaptic", () => {
		it("returns true for first event of a type", () => {
			const result = shouldTriggerHaptic("ready");
			expect(result).toBe(true);
		});

		it("returns false when rate limit has not passed", () => {
			shouldTriggerHaptic("ready", 1000);
			const result = shouldTriggerHaptic("ready", 1000);
			expect(result).toBe(false);
		});

		it("returns true after rate limit has passed", async () => {
			shouldTriggerHaptic("ready", 50);
			// Wait for rate limit (using real timeout since rate limiting uses Date.now())
			await new Promise<void>((resolve) => setTimeout(resolve, 60));
			const result = shouldTriggerHaptic("ready", 50);
			expect(result).toBe(true);
		});

		it("tracks different event types independently", () => {
			shouldTriggerHaptic("ready");
			// Different event type should still trigger
			const result = shouldTriggerHaptic("capture");
			expect(result).toBe(true);
		});

		it("uses default rate limit when not specified", () => {
			shouldTriggerHaptic("ready");
			// Should be rate limited with default 1500ms
			const result = shouldTriggerHaptic("ready");
			expect(result).toBe(false);
		});
	});

	describe("clearHapticRateLimits", () => {
		it("clears all rate limiting state", () => {
			shouldTriggerHaptic("ready");
			shouldTriggerHaptic("capture");

			clearHapticRateLimits();

			// Should be able to trigger again immediately
			expect(shouldTriggerHaptic("ready")).toBe(true);
			expect(shouldTriggerHaptic("capture")).toBe(true);
		});
	});

	describe("getTimeSinceLastHaptic", () => {
		it("returns Infinity when event has never been triggered", () => {
			const result = getTimeSinceLastHaptic("ready");
			expect(result).toBe(Infinity);
		});

		it("returns time in milliseconds since last trigger", () => {
			shouldTriggerHaptic("ready");
			const result = getTimeSinceLastHaptic("ready");
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThan(100);
		});
	});

	describe("triggerHaptic", () => {
		it("triggers light haptic with 10ms vibration", () => {
			triggerHaptic("light");
			expect(Vibration.vibrate).toHaveBeenCalledWith(10);
		});

		it("triggers medium haptic with 25ms vibration", () => {
			triggerHaptic("medium");
			expect(Vibration.vibrate).toHaveBeenCalledWith(25);
		});

		it("triggers heavy haptic with 50ms vibration", () => {
			triggerHaptic("heavy");
			expect(Vibration.vibrate).toHaveBeenCalledWith(50);
		});

		it("triggers success haptic with pattern", () => {
			triggerHaptic("success");
			expect(Vibration.vibrate).toHaveBeenCalledWith([0, 15, 50, 15]);
		});

		it("triggers error haptic with pattern", () => {
			triggerHaptic("error");
			expect(Vibration.vibrate).toHaveBeenCalledWith([0, 30, 30, 30]);
		});

		it("defaults to light haptic for unknown intensity", () => {
			triggerHaptic("unknown" as any);
			expect(Vibration.vibrate).toHaveBeenCalledWith(10);
		});
	});

	describe("triggerHapticEvent", () => {
		it("returns false when haptics are disabled", () => {
			const result = triggerHapticEvent("ready", { enabled: false });
			expect(result).toBe(false);
			expect(Vibration.vibrate).not.toHaveBeenCalled();
		});

		it("returns true and triggers haptic when enabled", () => {
			const result = triggerHapticEvent("ready", { enabled: true });
			expect(result).toBe(true);
			expect(Vibration.vibrate).toHaveBeenCalled();
		});

		it("returns false when rate limited", () => {
			triggerHapticEvent("ready", { enabled: true, rateLimitMs: 1000 });
			const result = triggerHapticEvent("ready", {
				enabled: true,
				rateLimitMs: 1000,
			});
			expect(result).toBe(false);
		});

		it("maps events to correct intensities", () => {
			// Test all event types
			(
				Object.keys(EVENT_HAPTIC_MAP) as Array<keyof typeof EVENT_HAPTIC_MAP>
			).forEach((event) => {
				clearHapticRateLimits();
				triggerHapticEvent(event, { enabled: true });
				expect(Vibration.vibrate).toHaveBeenCalled();
				jest.clearAllMocks();
			});
		});

		it("uses default enabled state (true) when not specified", () => {
			const result = triggerHapticEvent("ready");
			expect(result).toBe(true);
			expect(Vibration.vibrate).toHaveBeenCalled();
		});

		it("uses default rate limit when not specified", () => {
			triggerHapticEvent("ready", { enabled: true });
			// Should be rate limited immediately
			const result = triggerHapticEvent("ready", { enabled: true });
			expect(result).toBe(false);
		});
	});

	describe("Constants", () => {
		it("DEFAULT_HAPTIC_RATE_LIMIT_MS is 1500", () => {
			expect(DEFAULT_HAPTIC_RATE_LIMIT_MS).toBe(1500);
		});

		it("EVENT_HAPTIC_MAP has correct mappings", () => {
			expect(EVENT_HAPTIC_MAP.ready).toBe("light");
			expect(EVENT_HAPTIC_MAP.capture).toBe("medium");
			expect(EVENT_HAPTIC_MAP.countdown).toBe("light");
			expect(EVENT_HAPTIC_MAP.error).toBe("error");
		});
	});
});

describe("useHaptics Hook", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		clearHapticRateLimits();
	});

	afterEach(() => {
		clearHapticRateLimits();
	});

	it("returns enabled state from props", () => {
		const { result } = renderHook(() =>
			useHaptics({
				enabled: true,
				score: 50,
				isStable: false,
				autoCaptureThreshold: 80,
			}),
		);
		expect(result.current.enabled).toBe(true);
	});

	it("returns disabled state from props", () => {
		const { result } = renderHook(() =>
			useHaptics({
				enabled: false,
				score: 50,
				isStable: false,
				autoCaptureThreshold: 80,
			}),
		);
		expect(result.current.enabled).toBe(false);
	});

	it("trigger returns false when haptics disabled", () => {
		const { result } = renderHook(() =>
			useHaptics({
				enabled: false,
				score: 50,
				isStable: false,
				autoCaptureThreshold: 80,
			}),
		);
		const triggerResult = result.current.trigger("ready");
		expect(triggerResult).toBe(false);
		expect(Vibration.vibrate).not.toHaveBeenCalled();
	});

	it("trigger returns true when haptics enabled", () => {
		const { result } = renderHook(() =>
			useHaptics({
				enabled: true,
				score: 50,
				isStable: false,
				autoCaptureThreshold: 80,
			}),
		);
		const triggerResult = result.current.trigger("ready");
		expect(triggerResult).toBe(true);
		expect(Vibration.vibrate).toHaveBeenCalled();
	});

	it("triggerCapture triggers capture event", () => {
		const { result } = renderHook(() =>
			useHaptics({
				enabled: true,
				score: 50,
				isStable: false,
				autoCaptureThreshold: 80,
			}),
		);
		const triggerResult = result.current.triggerCapture();
		expect(triggerResult).toBe(true);
		expect(Vibration.vibrate).toHaveBeenCalledWith(25); // medium intensity for capture
	});

	it("respects rate limiting", () => {
		const { result } = renderHook(() =>
			useHaptics({
				enabled: true,
				score: 50,
				isStable: false,
				autoCaptureThreshold: 80,
				rateLimitMs: 1000,
			}),
		);
		result.current.trigger("ready");
		const secondResult = result.current.trigger("ready");
		expect(secondResult).toBe(false);
	});

	it("triggers ready haptic when score crosses threshold while stable", () => {
		// Start below threshold, unstable
		const { rerender } = renderHook(
			(props: UseHapticsProps) => useHaptics(props),
			{
				initialProps: {
					enabled: true,
					score: 70,
					isStable: false,
					autoCaptureThreshold: 80,
				},
			},
		);

		// Rerender with score above threshold and stable
		rerender({
			enabled: true,
			score: 85,
			isStable: true,
			autoCaptureThreshold: 80,
		});

		// Should have triggered ready haptic
		expect(Vibration.vibrate).toHaveBeenCalled();
	});

	it("does not trigger ready haptic when score crosses threshold but unstable", () => {
		// Start below threshold, unstable
		const { rerender } = renderHook(
			(props: UseHapticsProps) => useHaptics(props),
			{
				initialProps: {
					enabled: true,
					score: 70,
					isStable: false,
					autoCaptureThreshold: 80,
				},
			},
		);

		jest.clearAllMocks();

		// Rerender with score above threshold but still unstable
		rerender({
			enabled: true,
			score: 85,
			isStable: false,
			autoCaptureThreshold: 80,
		});

		// Should not have triggered ready haptic
		expect(Vibration.vibrate).not.toHaveBeenCalled();
	});

	it("triggers ready haptic when becoming stable while above threshold", () => {
		// Start above threshold but unstable
		const { rerender } = renderHook(
			(props: UseHapticsProps) => useHaptics(props),
			{
				initialProps: {
					enabled: true,
					score: 85,
					isStable: false,
					autoCaptureThreshold: 80,
				},
			},
		);

		jest.clearAllMocks();

		// Rerender with stable state
		rerender({
			enabled: true,
			score: 85,
			isStable: true,
			autoCaptureThreshold: 80,
		});

		// Should have triggered ready haptic
		expect(Vibration.vibrate).toHaveBeenCalled();
	});

	it("does not trigger ready haptic when already above threshold and stable", () => {
		// Start above threshold and stable
		const { rerender } = renderHook(
			(props: UseHapticsProps) => useHaptics(props),
			{
				initialProps: {
					enabled: true,
					score: 85,
					isStable: true,
					autoCaptureThreshold: 80,
				},
			},
		);

		jest.clearAllMocks();

		// Rerender with same state
		rerender({
			enabled: true,
			score: 85,
			isStable: true,
			autoCaptureThreshold: 80,
		});

		// Should not trigger again (already triggered)
		expect(Vibration.vibrate).not.toHaveBeenCalled();
	});

	it("resets ready trigger when score drops below threshold", () => {
		// Start above threshold and stable (triggered ready)
		const { rerender } = renderHook(
			(props: UseHapticsProps) => useHaptics(props),
			{
				initialProps: {
					enabled: true,
					score: 85,
					isStable: true,
					autoCaptureThreshold: 80,
				},
			},
		);

		jest.clearAllMocks();

		// Score drops below threshold
		rerender({
			enabled: true,
			score: 75,
			isStable: true,
			autoCaptureThreshold: 80,
		});

		// Then goes back above
		rerender({
			enabled: true,
			score: 85,
			isStable: true,
			autoCaptureThreshold: 80,
		});

		// Should trigger again since state was reset
		expect(Vibration.vibrate).toHaveBeenCalled();
	});

	it("resets ready trigger when becoming unstable", () => {
		// Start above threshold and stable (triggered ready)
		const { rerender } = renderHook(
			(props: UseHapticsProps) => useHaptics(props),
			{
				initialProps: {
					enabled: true,
					score: 85,
					isStable: true,
					autoCaptureThreshold: 80,
				},
			},
		);

		jest.clearAllMocks();

		// Becomes unstable
		rerender({
			enabled: true,
			score: 85,
			isStable: false,
			autoCaptureThreshold: 80,
		});

		// Then becomes stable again
		rerender({
			enabled: true,
			score: 85,
			isStable: true,
			autoCaptureThreshold: 80,
		});

		// Should trigger again since state was reset
		expect(Vibration.vibrate).toHaveBeenCalled();
	});

	it("uses default rate limit of 1500ms", () => {
		const { result } = renderHook(() =>
			useHaptics({
				enabled: true,
				score: 50,
				isStable: false,
				autoCaptureThreshold: 80,
				// no rateLimitMs specified
			}),
		);
		result.current.trigger("ready");
		const secondResult = result.current.trigger("ready");
		// Should be rate limited with default 1500ms
		expect(secondResult).toBe(false);
	});
});
