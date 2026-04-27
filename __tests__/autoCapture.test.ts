/**
 * Unit tests for auto-capture module
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
	COUNTDOWN_INTERVAL_MS,
	canStartAutoCapture,
	DEFAULT_COUNTDOWN_DURATION,
	useAutoCapture,
} from "../src/autoCapture";

// Use real timers for more predictable async behavior
jest.useRealTimers();

describe("Auto-capture types and pure functions", () => {
	describe("canStartAutoCapture", () => {
		it("returns true when score >= threshold AND isStable", () => {
			expect(canStartAutoCapture(80, true, 80)).toBe(true);
			expect(canStartAutoCapture(85, true, 80)).toBe(true);
			expect(canStartAutoCapture(100, true, 80)).toBe(true);
		});

		it("returns false when score < threshold", () => {
			expect(canStartAutoCapture(79, true, 80)).toBe(false);
			expect(canStartAutoCapture(50, true, 80)).toBe(false);
			expect(canStartAutoCapture(0, true, 80)).toBe(false);
		});

		it("returns false when not stable", () => {
			expect(canStartAutoCapture(80, false, 80)).toBe(false);
			expect(canStartAutoCapture(100, false, 80)).toBe(false);
		});

		it("returns false when both conditions fail", () => {
			expect(canStartAutoCapture(79, false, 80)).toBe(false);
		});

		it("works with different thresholds", () => {
			expect(canStartAutoCapture(70, true, 70)).toBe(true);
			expect(canStartAutoCapture(85, true, 85)).toBe(true);
			expect(canStartAutoCapture(69, true, 70)).toBe(false);
		});
	});

	describe("constants", () => {
		it("COUNTDOWN_INTERVAL_MS is 1000", () => {
			expect(COUNTDOWN_INTERVAL_MS).toBe(1000);
		});

		it("DEFAULT_COUNTDOWN_DURATION is 3", () => {
			expect(DEFAULT_COUNTDOWN_DURATION).toBe(3);
		});
	});
});

describe("useAutoCapture hook", () => {
	it("initializes with idle state", () => {
		const { result } = renderHook(() =>
			useAutoCapture({
				enabled: true,
				score: 0,
				isStable: false,
				autoCaptureThreshold: 80,
			}),
		);

		expect(result.current.state).toBe("idle");
		expect(result.current.countdownValue).toBeNull();
		expect(result.current.isCountingDown).toBe(false);
		expect(result.current.canAutoCapture).toBe(false);
	});

	it("does not start countdown when disabled", () => {
		const { result } = renderHook(() =>
			useAutoCapture({
				enabled: false,
				score: 85,
				isStable: true,
				autoCaptureThreshold: 80,
			}),
		);

		expect(result.current.state).toBe("idle");
		expect(result.current.isCountingDown).toBe(false);
	});

	it("starts countdown when conditions are met", async () => {
		const { result } = renderHook(() =>
			useAutoCapture({
				enabled: true,
				score: 85,
				isStable: true,
				autoCaptureThreshold: 80,
			}),
		);

		// Wait for countdown to start (should be immediate)
		await waitFor(
			() => {
				expect(result.current.state).toBe("counting");
			},
			{ timeout: 100 },
		);

		expect(result.current.isCountingDown).toBe(true);
		expect(result.current.countdownValue).toBe(3);
	});

	it("transitions to capturing after countdown", async () => {
		const { result } = renderHook(() =>
			useAutoCapture({
				enabled: true,
				score: 85,
				isStable: true,
				autoCaptureThreshold: 80,
			}),
		);

		// Wait for countdown to start
		await waitFor(() => expect(result.current.state).toBe("counting"), {
			timeout: 100,
		});
		expect(result.current.countdownValue).toBe(3);

		// Trigger capture manually to verify state transition works
		act(() => {
			result.current.triggerCapture();
		});

		expect(result.current.state).toBe("capturing");
		expect(result.current.countdownValue).toBeNull();
		expect(result.current.isCountingDown).toBe(false);
	});

	it("cancels countdown when conditions break", async () => {
		const { result, rerender } = renderHook(
			(props: { score: number; isStable: boolean }) =>
				useAutoCapture({
					enabled: true,
					score: props.score,
					isStable: props.isStable,
					autoCaptureThreshold: 80,
				}),
			{
				initialProps: { score: 85, isStable: true },
			},
		);

		// Wait for countdown to start
		await waitFor(() => expect(result.current.state).toBe("counting"), {
			timeout: 100,
		});

		// Break conditions (become unstable)
		act(() => {
			rerender({ score: 85, isStable: false });
		});

		// Should cancel
		expect(result.current.state).toBe("idle");
		expect(result.current.countdownValue).toBeNull();
		expect(result.current.isCountingDown).toBe(false);
	});

	it("cancels countdown when score drops below threshold", async () => {
		const { result, rerender } = renderHook(
			(props: { score: number }) =>
				useAutoCapture({
					enabled: true,
					score: props.score,
					isStable: true,
					autoCaptureThreshold: 80,
				}),
			{
				initialProps: { score: 85 },
			},
		);

		// Wait for countdown to start
		await waitFor(() => expect(result.current.state).toBe("counting"), {
			timeout: 100,
		});

		// Drop score
		act(() => {
			rerender({ score: 75 });
		});

		// Should cancel immediately
		expect(result.current.state).toBe("idle");
	});

	it("cancelCountdown manually resets state", () => {
		const { result } = renderHook(() =>
			useAutoCapture({
				enabled: true,
				score: 50,
				isStable: false,
				autoCaptureThreshold: 80,
			}),
		);

		// Start at idle state
		expect(result.current.state).toBe("idle");

		// Trigger capture manually to change state
		act(() => {
			result.current.triggerCapture();
		});
		expect(result.current.state).toBe("capturing");

		// Cancel manually to reset state
		act(() => {
			result.current.cancelCountdown();
		});

		expect(result.current.state).toBe("idle");
		expect(result.current.countdownValue).toBeNull();
		expect(result.current.isCountingDown).toBe(false);
	});

	it("triggerCapture transitions to capturing immediately", async () => {
		const { result } = renderHook(() =>
			useAutoCapture({
				enabled: true,
				score: 85,
				isStable: true,
				autoCaptureThreshold: 80,
			}),
		);

		// Trigger manually
		act(() => {
			result.current.triggerCapture();
		});

		expect(result.current.state).toBe("capturing");
	});

	it("supports custom countdown duration", async () => {
		const { result } = renderHook(() =>
			useAutoCapture({
				enabled: true,
				score: 85,
				isStable: true,
				autoCaptureThreshold: 80,
				countdownDuration: 5,
			}),
		);

		// Wait for countdown to start
		await waitFor(() => expect(result.current.state).toBe("counting"), {
			timeout: 100,
		});

		expect(result.current.countdownValue).toBe(5);
	});

	it("reports canAutoCapture correctly", async () => {
		const { result, rerender } = renderHook(
			(props: { score: number; isStable: boolean }) =>
				useAutoCapture({
					enabled: true,
					score: props.score,
					isStable: props.isStable,
					autoCaptureThreshold: 80,
				}),
			{
				initialProps: { score: 79, isStable: false },
			},
		);

		expect(result.current.canAutoCapture).toBe(false);

		// Meet conditions
		act(() => {
			rerender({ score: 85, isStable: true });
		});

		// Wait for state to update
		await waitFor(() => expect(result.current.canAutoCapture).toBe(true), {
			timeout: 100,
		});
	});
});
