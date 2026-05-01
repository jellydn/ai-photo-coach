/**
 * Capture State Machine Tests
 *
 * Tests the finite state machine for photo capture lifecycle.
 * Addresses CONCERNS.md: "Capture and burst lifecycle" fragile area.
 */

import {
	getInitialContext,
	getStateDescription,
	isCaptureActive,
	isCaptureComplete,
	isValidTransition,
	transition,
	type CaptureContext,
} from "../src/capture/CaptureStateMachine";

describe("Capture State Machine", () => {
	describe("getInitialContext", () => {
		it("should return idle state with default values", () => {
			const context = getInitialContext();
			expect(context.state).toBe("idle");
			expect(context.mode).toBe("single");
			expect(context.countdownValue).toBeNull();
			expect(context.burstIndex).toBe(0);
			expect(context.burstTotal).toBe(1);
			expect(context.error).toBeNull();
			expect(context.isAutoCapture).toBe(false);
		});
	});

	describe("isValidTransition", () => {
		it("should allow idle to preparing", () => {
			expect(isValidTransition("idle", "preparing")).toBe(true);
		});

		it("should not allow idle to countdown directly (must go through preparing)", () => {
			expect(isValidTransition("idle", "countdown")).toBe(false);
		});

		it("should not allow idle to capturing directly (must go through preparing)", () => {
			expect(isValidTransition("idle", "capturing")).toBe(false);
		});

		it("should allow preparing to countdown", () => {
			expect(isValidTransition("preparing", "countdown")).toBe(true);
		});

		it("should allow preparing to capturing", () => {
			expect(isValidTransition("preparing", "capturing")).toBe(true);
		});

		it("should not allow idle to completed directly", () => {
			expect(isValidTransition("idle", "completed")).toBe(false);
		});

		it("should allow capturing to processing", () => {
			expect(isValidTransition("capturing", "processing")).toBe(true);
		});

		it("should allow processing to completed", () => {
			expect(isValidTransition("processing", "completed")).toBe(true);
		});

		it("should allow burst in processing to capturing", () => {
			expect(isValidTransition("processing", "capturing")).toBe(true);
		});
	});

	describe("transition - START_MANUAL", () => {
		it("should transition from idle to preparing", () => {
			const context = getInitialContext();
			const newContext = transition(context, {
				type: "START_MANUAL",
				mode: "single",
			});
			expect(newContext.state).toBe("preparing");
			expect(newContext.mode).toBe("single");
			expect(newContext.isAutoCapture).toBe(false);
		});

		it("should transition to burst mode with burstTotal", () => {
			const context = getInitialContext();
			const newContext = transition(context, {
				type: "START_MANUAL",
				mode: "burst",
				burstTotal: 3,
			});
			expect(newContext.state).toBe("preparing");
			expect(newContext.mode).toBe("burst");
			expect(newContext.burstTotal).toBe(3);
		});

		it("should set error when not in idle state", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "capturing",
			};
			const newContext = transition(context, {
				type: "START_MANUAL",
				mode: "single",
			});
			expect(newContext.state).toBe("capturing"); // unchanged
			expect(newContext.error).toBe("Cannot start: invalid transition");
		});
	});

	describe("transition - START_AUTO", () => {
		it("should transition from idle to preparing with auto flag", () => {
			const context = getInitialContext();
			const newContext = transition(context, {
				type: "START_AUTO",
				burstTotal: 3,
			});
			expect(newContext.state).toBe("preparing");
			expect(newContext.mode).toBe("auto");
			expect(newContext.isAutoCapture).toBe(true);
			expect(newContext.burstTotal).toBe(3);
		});
	});

	describe("transition - CONDITIONS_MET", () => {
		it("should transition from preparing to countdown", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "preparing",
			};
			const newContext = transition(context, { type: "CONDITIONS_MET" });
			expect(newContext.state).toBe("countdown");
		});

		it("should not transition when not in preparing state", () => {
			const context = getInitialContext();
			const newContext = transition(context, { type: "CONDITIONS_MET" });
			expect(newContext.state).toBe("idle");
		});
	});

	describe("transition - COUNTDOWN_TICK", () => {
		it("should update countdown value", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "countdown",
			};
			const newContext = transition(context, {
				type: "COUNTDOWN_TICK",
				value: 2,
			});
			expect(newContext.countdownValue).toBe(2);
			expect(newContext.state).toBe("countdown");
		});

		it("should not update when not in countdown state", () => {
			const context = getInitialContext();
			const newContext = transition(context, {
				type: "COUNTDOWN_TICK",
				value: 2,
			});
			expect(newContext.countdownValue).toBeNull();
		});
	});

	describe("transition - COUNTDOWN_COMPLETE", () => {
		it("should transition from countdown to capturing", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "countdown",
				countdownValue: 0,
			};
			const newContext = transition(context, {
				type: "COUNTDOWN_COMPLETE",
			});
			expect(newContext.state).toBe("capturing");
			expect(newContext.countdownValue).toBeNull();
		});
	});

	describe("transition - CAPTURE_COMPLETE", () => {
		it("should transition from capturing to processing", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "capturing",
			};
			const newContext = transition(context, {
				type: "CAPTURE_COMPLETE",
			});
			expect(newContext.state).toBe("processing");
		});
	});

	describe("transition - BURST_NEXT", () => {
		it("should transition to next burst shot", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "processing",
				mode: "burst",
				burstIndex: 0,
				burstTotal: 3,
			};
			const newContext = transition(context, { type: "BURST_NEXT" });
			expect(newContext.state).toBe("capturing");
			expect(newContext.burstIndex).toBe(1);
		});

		it("should not transition if burst is complete", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "processing",
				mode: "burst",
				burstIndex: 2,
				burstTotal: 3,
			};
			const newContext = transition(context, { type: "BURST_NEXT" });
			expect(newContext.state).toBe("processing"); // unchanged
			expect(newContext.burstIndex).toBe(2);
		});

		it("should not transition in single mode", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "processing",
				mode: "single",
			};
			const newContext = transition(context, { type: "BURST_NEXT" });
			expect(newContext.state).toBe("processing");
		});
	});

	describe("transition - CANCEL", () => {
		it("should cancel from countdown", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "countdown",
				countdownValue: 2,
			};
			const newContext = transition(context, { type: "CANCEL" });
			expect(newContext.state).toBe("cancelled");
			expect(newContext.countdownValue).toBeNull();
		});

		it("should cancel from capturing", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "capturing",
			};
			const newContext = transition(context, { type: "CANCEL" });
			expect(newContext.state).toBe("cancelled");
		});

		it("should not cancel from idle", () => {
			const context = getInitialContext();
			const newContext = transition(context, { type: "CANCEL" });
			expect(newContext.state).toBe("idle");
		});
	});

	describe("transition - RESET", () => {
		it("should reset to initial context", () => {
			const context: CaptureContext = {
				...getInitialContext(),
				state: "completed",
				mode: "burst",
				burstIndex: 3,
				error: "some error",
			};
			const newContext = transition(context, { type: "RESET" });
			expect(newContext.state).toBe("idle");
			expect(newContext.mode).toBe("single");
			expect(newContext.burstIndex).toBe(0);
			expect(newContext.error).toBeNull();
		});
	});

	describe("isCaptureActive", () => {
		it("should return true for active states", () => {
			expect(isCaptureActive({ ...getInitialContext(), state: "preparing" })).toBe(true);
			expect(isCaptureActive({ ...getInitialContext(), state: "countdown" })).toBe(true);
			expect(isCaptureActive({ ...getInitialContext(), state: "capturing" })).toBe(true);
			expect(isCaptureActive({ ...getInitialContext(), state: "processing" })).toBe(true);
		});

		it("should return false for non-active states", () => {
			expect(isCaptureActive({ ...getInitialContext(), state: "idle" })).toBe(false);
			expect(isCaptureActive({ ...getInitialContext(), state: "completed" })).toBe(false);
			expect(isCaptureActive({ ...getInitialContext(), state: "cancelled" })).toBe(false);
			expect(isCaptureActive({ ...getInitialContext(), state: "error" })).toBe(false);
		});
	});

	describe("isCaptureComplete", () => {
		it("should return true for terminal states", () => {
			expect(isCaptureComplete({ ...getInitialContext(), state: "completed" })).toBe(true);
			expect(isCaptureComplete({ ...getInitialContext(), state: "cancelled" })).toBe(true);
			expect(isCaptureComplete({ ...getInitialContext(), state: "error" })).toBe(true);
		});

		it("should return false for non-terminal states", () => {
			expect(isCaptureComplete({ ...getInitialContext(), state: "idle" })).toBe(false);
			expect(isCaptureComplete({ ...getInitialContext(), state: "preparing" })).toBe(false);
			expect(isCaptureComplete({ ...getInitialContext(), state: "countdown" })).toBe(false);
			expect(isCaptureComplete({ ...getInitialContext(), state: "capturing" })).toBe(false);
			expect(isCaptureComplete({ ...getInitialContext(), state: "processing" })).toBe(false);
		});
	});

	describe("getStateDescription", () => {
		it("should return human-readable descriptions", () => {
			expect(getStateDescription("idle")).toBe("Ready to capture");
			expect(getStateDescription("countdown")).toBe("Countdown in progress");
			expect(getStateDescription("capturing")).toBe("Taking photo");
			expect(getStateDescription("completed")).toBe("Capture complete");
			expect(getStateDescription("error")).toBe("Capture failed");
		});
	});

	describe("full capture lifecycle - single shot", () => {
		it("should complete single shot lifecycle", () => {
			let context = getInitialContext();

			// Start manual capture
			context = transition(context, { type: "START_MANUAL", mode: "single" });
			expect(context.state).toBe("preparing");

			// Conditions met
			context = transition(context, { type: "CONDITIONS_MET" });
			expect(context.state).toBe("countdown");

			// Countdown
			context = transition(context, { type: "COUNTDOWN_TICK", value: 3 });
			context = transition(context, { type: "COUNTDOWN_TICK", value: 2 });
			context = transition(context, { type: "COUNTDOWN_TICK", value: 1 });

			// Countdown complete
			context = transition(context, { type: "COUNTDOWN_COMPLETE" });
			expect(context.state).toBe("capturing");

			// Capture complete
			context = transition(context, { type: "CAPTURE_COMPLETE" });
			expect(context.state).toBe("processing");

			// Processing complete
			context = transition(context, { type: "PROCESSING_COMPLETE" });
			expect(context.state).toBe("completed");

			// Reset
			context = transition(context, { type: "RESET" });
			expect(context.state).toBe("idle");
		});
	});

	describe("full capture lifecycle - burst mode", () => {
		it("should complete burst lifecycle with 3 shots", () => {
			let context = getInitialContext();

			// Start burst
			context = transition(context, {
				type: "START_MANUAL",
				mode: "burst",
				burstTotal: 3,
			});
			expect(context.state).toBe("preparing");
			expect(context.burstTotal).toBe(3);

			// Skip countdown for burst, go straight to capturing
			context = transition(context, { type: "CAPTURE_START" });
			expect(context.state).toBe("capturing");
			expect(context.burstIndex).toBe(0);

			// First shot complete
			context = transition(context, { type: "CAPTURE_COMPLETE" });
			expect(context.state).toBe("processing");

			// Next burst shot
			context = transition(context, { type: "BURST_NEXT" });
			expect(context.state).toBe("capturing");
			expect(context.burstIndex).toBe(1);

			// Second shot complete
			context = transition(context, { type: "CAPTURE_COMPLETE" });
			expect(context.state).toBe("processing");

			// Next burst shot
			context = transition(context, { type: "BURST_NEXT" });
			expect(context.state).toBe("capturing");
			expect(context.burstIndex).toBe(2);

			// Third shot complete
			context = transition(context, { type: "CAPTURE_COMPLETE" });
			expect(context.state).toBe("processing");

			// Burst complete
			context = transition(context, { type: "BURST_COMPLETE" });
			expect(context.state).toBe("completed");
		});
	});
});
