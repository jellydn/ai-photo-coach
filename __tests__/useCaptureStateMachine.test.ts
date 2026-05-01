/**
 * useCaptureStateMachine Hook Tests
 *
 * Tests for the React hook that integrates CaptureStateMachine with components.
 */

import { act, renderHook } from "@testing-library/react-native";
import {
	useCaptureStateMachine,
	type UseCaptureStateMachineProps,
} from "../src/capture/useCaptureStateMachine";

describe("useCaptureStateMachine", () => {
	const defaultProps: UseCaptureStateMachineProps = {
		autoCaptureEnabled: false,
		score: 0,
		isStable: false,
		autoCaptureThreshold: 80,
	};

	describe("initial state", () => {
		it("should start in idle state", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			expect(result.current.context.state).toBe("idle");
			expect(result.current.isCapturing).toBe(false);
			expect(result.current.countdownValue).toBeNull();
			expect(result.current.burstProgress).toBeNull();
		});
	});

	describe("startManualCapture", () => {
		it("should transition to preparing on manual start", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
			});
			expect(result.current.context.state).toBe("preparing");
			expect(result.current.context.mode).toBe("single");
			expect(result.current.isCapturing).toBe(true);
		});

		it("should start burst mode with correct total", () => {
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				burstShotCount: 5,
			}));
			act(() => {
				result.current.startManualCapture("burst");
			});
			expect(result.current.context.mode).toBe("burst");
			expect(result.current.context.burstTotal).toBe(5);
			expect(result.current.burstProgress).toEqual({ current: 1, total: 5 });
		});

		it("should use provided burst total", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("burst", 3);
			});
			expect(result.current.context.burstTotal).toBe(3);
		});
	});

	describe("startAutoCapture", () => {
		it("should not start when auto capture is disabled", () => {
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				autoCaptureEnabled: false,
				score: 90,
				isStable: true,
			}));
			act(() => {
				result.current.startAutoCapture();
			});
			expect(result.current.context.state).toBe("idle");
		});

		it("should not start when score is below threshold", () => {
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				autoCaptureEnabled: true,
				score: 50,
				isStable: true,
			}));
			act(() => {
				result.current.startAutoCapture();
			});
			expect(result.current.context.state).toBe("idle");
		});

		it("should not start when not stable", () => {
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				autoCaptureEnabled: true,
				score: 90,
				isStable: false,
			}));
			act(() => {
				result.current.startAutoCapture();
			});
			expect(result.current.context.state).toBe("idle");
		});

		it("should start when conditions are met", () => {
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				autoCaptureEnabled: true,
				score: 90,
				isStable: true,
				autoCaptureThreshold: 80,
			}));
			act(() => {
				result.current.startAutoCapture();
			});
			expect(result.current.context.state).toBe("preparing");
			expect(result.current.context.isAutoCapture).toBe(true);
		});

		it("should start burst mode with auto capture", () => {
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				autoCaptureEnabled: true,
				score: 90,
				isStable: true,
				burstMode: true,
				burstShotCount: 4,
			}));
			act(() => {
				result.current.startAutoCapture();
			});
			expect(result.current.context.mode).toBe("auto");
			expect(result.current.context.burstTotal).toBe(4);
		});
	});

	describe("cancelCapture", () => {
		it("should cancel from preparing state", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
			});
			expect(result.current.context.state).toBe("preparing");
			act(() => {
				result.current.cancelCapture();
			});
			expect(result.current.context.state).toBe("cancelled");
			expect(result.current.isCapturing).toBe(false);
		});

		it("should cancel from capturing state", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
				result.current.markCaptureStarted();
			});
			expect(result.current.context.state).toBe("capturing");
			act(() => {
				result.current.cancelCapture();
			});
			expect(result.current.context.state).toBe("cancelled");
		});
	});

	describe("markCaptureStarted", () => {
		it("should transition to capturing", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
				result.current.markCaptureStarted();
			});
			expect(result.current.context.state).toBe("capturing");
		});
	});

	describe("markCaptureComplete", () => {
		it("should transition to processing", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
				result.current.markCaptureStarted();
				result.current.markCaptureComplete();
			});
			expect(result.current.context.state).toBe("processing");
		});
	});

	describe("markProcessingComplete", () => {
		it("should transition to completed", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
				result.current.markCaptureStarted();
				result.current.markCaptureComplete();
				result.current.markProcessingComplete();
			});
			expect(result.current.context.state).toBe("completed");
			expect(result.current.isCapturing).toBe(false);
		});
	});

	describe("reset", () => {
		it("should reset to idle from completed", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
				result.current.markCaptureStarted();
				result.current.markCaptureComplete();
				result.current.markProcessingComplete();
			});
			expect(result.current.context.state).toBe("completed");
			act(() => {
				result.current.reset();
			});
			expect(result.current.context.state).toBe("idle");
			expect(result.current.context.burstIndex).toBe(0);
		});

		it("should reset to idle from cancelled", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
				result.current.cancelCapture();
			});
			expect(result.current.context.state).toBe("cancelled");
			act(() => {
				result.current.reset();
			});
			expect(result.current.context.state).toBe("idle");
		});
	});

	describe("callbacks", () => {
		it("should call onCaptureStart when entering capturing", () => {
			const onCaptureStart = jest.fn();
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				onCaptureStart,
			}));
			act(() => {
				result.current.startManualCapture("single");
				result.current.markCaptureStarted();
			});
			expect(onCaptureStart).toHaveBeenCalledTimes(1);
			expect(onCaptureStart).toHaveBeenCalledWith(
				expect.objectContaining({ state: "capturing" })
			);
		});

		it("should call onCaptureComplete when entering completed", () => {
			const onCaptureComplete = jest.fn();
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				onCaptureComplete,
			}));
			act(() => {
				result.current.startManualCapture("single");
				result.current.markCaptureStarted();
				result.current.markCaptureComplete();
				result.current.markProcessingComplete();
			});
			expect(onCaptureComplete).toHaveBeenCalledTimes(1);
			expect(onCaptureComplete).toHaveBeenCalledWith(
				expect.objectContaining({ state: "completed" })
			);
		});
	});

	describe("burst mode flow", () => {
		it("should track burst progress correctly", () => {
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				burstShotCount: 3,
			}));
			act(() => {
				result.current.startManualCapture("burst");
			});
			expect(result.current.burstProgress).toEqual({ current: 1, total: 3 });

			act(() => {
				result.current.markCaptureStarted();
				result.current.markCaptureComplete();
			});
			expect(result.current.context.state).toBe("processing");

			act(() => {
				result.current.nextBurstShot();
			});
			expect(result.current.context.state).toBe("capturing");
			expect(result.current.context.burstIndex).toBe(1);
			expect(result.current.burstProgress).toEqual({ current: 2, total: 3 });
		});

		it("should complete burst after all shots", () => {
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				burstShotCount: 2,
			}));
			act(() => {
				result.current.startManualCapture("burst");
				result.current.markCaptureStarted();
				result.current.markCaptureComplete();
			});
			// First shot complete
			act(() => {
				result.current.nextBurstShot();
				result.current.markCaptureStarted();
				result.current.markCaptureComplete();
			});
			// Second shot complete
			act(() => {
				result.current.completeBurst();
			});
			expect(result.current.context.state).toBe("completed");
			expect(result.current.context.burstIndex).toBe(1);
		});

		it("should call onBurstShot when advancing burst", () => {
			const onBurstShot = jest.fn();
			const { result } = renderHook(() => useCaptureStateMachine({
				...defaultProps,
				burstShotCount: 3,
				onBurstShot,
			}));
			act(() => {
				result.current.startManualCapture("burst");
				result.current.markCaptureStarted();
				result.current.markCaptureComplete();
				result.current.nextBurstShot();
			});
			expect(onBurstShot).toHaveBeenCalledWith(1, 3);
		});
	});

	describe("isCapturing flag", () => {
		it("should be true during active states", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
			});
			expect(result.current.isCapturing).toBe(true);

			act(() => {
				result.current.markCaptureStarted();
			});
			expect(result.current.isCapturing).toBe(true);
		});

		it("should be false in terminal states", () => {
			const { result } = renderHook(() => useCaptureStateMachine(defaultProps));
			act(() => {
				result.current.startManualCapture("single");
				result.current.markCaptureStarted();
				result.current.markCaptureComplete();
				result.current.markProcessingComplete();
			});
			expect(result.current.isCapturing).toBe(false);
			expect(result.current.context.state).toBe("completed");
		});
	});
});
