/**
 * countdownTimer Tests
 *
 * Verifies the deep countdown module: tick/complete lifecycle,
 * stop/dispose semantics, and redundant-start protection.
 */

import {
	createCountdownTimer,
	type CountdownTimerCallbacks,
} from "../src/capture/countdownTimer";

describe("createCountdownTimer", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	const makeCallbacks = (): CountdownTimerCallbacks => ({
		onTick: jest.fn(),
		onComplete: jest.fn(),
	});

	describe("start", () => {
		it("fires onTick immediately with the full duration", () => {
			const callbacks = makeCallbacks();
			const timer = createCountdownTimer(callbacks, 3);

			timer.start();

			expect(callbacks.onTick).toHaveBeenCalledTimes(1);
			expect(callbacks.onTick).toHaveBeenCalledWith(3);
			expect(timer.isRunning()).toBe(true);
		});

		it("ticks down once per interval", () => {
			const callbacks = makeCallbacks();
			const timer = createCountdownTimer(callbacks, 3, 1000);

			timer.start();
			jest.advanceTimersByTime(1000);

			expect(callbacks.onTick).toHaveBeenLastCalledWith(2);

			jest.advanceTimersByTime(1000);
			expect(callbacks.onTick).toHaveBeenLastCalledWith(1);
			expect(callbacks.onComplete).not.toHaveBeenCalled();
		});

		it("fires onComplete when the countdown reaches zero and stops", () => {
			const callbacks = makeCallbacks();
			const timer = createCountdownTimer(callbacks, 2, 1000);

			timer.start();
			jest.advanceTimersByTime(2000);

			expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
			expect(timer.isRunning()).toBe(false);
			expect(callbacks.onTick).toHaveBeenCalledTimes(2); // 2 then 1, complete at zero
		});

		it("ignores redundant start calls while running", () => {
			const callbacks = makeCallbacks();
			const timer = createCountdownTimer(callbacks, 3, 1000);

			timer.start();
			timer.start();
			timer.start();

			expect(callbacks.onTick).toHaveBeenCalledTimes(1);
		});
	});

	describe("stop / dispose", () => {
		it("stop halts the countdown without firing onComplete", () => {
			const callbacks = makeCallbacks();
			const timer = createCountdownTimer(callbacks, 3, 1000);

			timer.start();
			jest.advanceTimersByTime(1000);
			timer.stop();

			expect(timer.isRunning()).toBe(false);
			jest.advanceTimersByTime(5000);
			expect(callbacks.onComplete).not.toHaveBeenCalled();
			expect(callbacks.onTick).toHaveBeenLastCalledWith(2);
		});

		it("stop is safe when not running", () => {
			const timer = createCountdownTimer(makeCallbacks(), 3);
			expect(() => timer.stop()).not.toThrow();
		});


		it("can restart after stop", () => {
			const callbacks = makeCallbacks();
			const timer = createCountdownTimer(callbacks, 3, 1000);

			timer.start();
			timer.stop();
			timer.start();

			// Restart re-emits the full duration tick
			expect(callbacks.onTick).toHaveBeenLastCalledWith(3);
			expect(callbacks.onTick).toHaveBeenCalledTimes(2);
		});
	});

	describe("duration handling", () => {
		it("defaults to a 3-second countdown", () => {
			const callbacks = makeCallbacks();
			const timer = createCountdownTimer(callbacks);

			timer.start();
			expect(callbacks.onTick).toHaveBeenCalledWith(3);
		});

		it("clamps duration to a minimum of 1 second", () => {
			const callbacks = makeCallbacks();
			const timer = createCountdownTimer(callbacks, 0, 1000);

			timer.start();
			expect(callbacks.onTick).toHaveBeenCalledWith(1);
			jest.advanceTimersByTime(1000);
			expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
		});
	});
});
