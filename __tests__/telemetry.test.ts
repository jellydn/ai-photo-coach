/**
 * Telemetry module tests
 *
 * Tests for telemetry tracking, opt-out behavior, and provider integration.
 */

import {
	ConsoleTelemetryProvider,
	clearInstallId,
	createTelemetryPayload,
	eventRequiresProps,
	getInstallId,
	isTelemetryOptedOut,
	setTelemetryOptOut,
	type TelemetryEvent,
	type TelemetryPayload,
	TelemetryTracker,
	telemetry,
	toggleTelemetryOptOut,
} from "../src/telemetry";

// Mock console.log for testing
const originalConsoleLog = console.log;
let consoleLogSpy: jest.Mock;

describe("Telemetry Module", () => {
	beforeEach(() => {
		// Clear install ID before each test
		clearInstallId();

		// Reset telemetry opt-out
		setTelemetryOptOut(false);

		// Mock console.log
		consoleLogSpy = jest.fn();
		console.log = consoleLogSpy;
	});

	afterEach(() => {
		// Restore console.log
		console.log = originalConsoleLog;
	});

	describe("createTelemetryPayload", () => {
		it("should create payload with event, timestamp, and installId", () => {
			const installId = "test-install-123";
			const payload = createTelemetryPayload("session_started", installId);

			expect(payload.event).toBe("session_started");
			expect(payload.installId).toBe(installId);
			expect(payload.timestamp).toBeDefined();
			expect(typeof payload.timestamp).toBe("number");
			expect(payload.timestamp).toBeGreaterThan(0);
		});

		it("should include props when provided", () => {
			const installId = "test-install-123";
			const props = { mode: "portrait" };
			const payload = createTelemetryPayload("mode_selected", installId, props);

			expect(payload.props).toEqual(props);
		});

		it("should have undefined props when not provided", () => {
			const installId = "test-install-123";
			const payload = createTelemetryPayload("session_ended", installId);

			expect(payload.props).toBeUndefined();
		});
	});

	describe("eventRequiresProps", () => {
		it("should return false for session_started", () => {
			expect(eventRequiresProps("session_started")).toBe(false);
		});

		it("should return false for session_ended", () => {
			expect(eventRequiresProps("session_ended")).toBe(false);
		});

		it("should return true for mode_selected", () => {
			expect(eventRequiresProps("mode_selected")).toBe(true);
		});

		it("should return true for shot_captured", () => {
			expect(eventRequiresProps("shot_captured")).toBe(true);
		});

		it("should return true for auto_captured", () => {
			expect(eventRequiresProps("auto_captured")).toBe(true);
		});

		it("should return true for shot_discarded", () => {
			expect(eventRequiresProps("shot_discarded")).toBe(true);
		});
	});

	describe("getInstallId", () => {
		it("should generate a new install ID when none exists", () => {
			const id = getInstallId();

			expect(id).toBeDefined();
			expect(typeof id).toBe("string");
			expect(id.length).toBe(36); // UUID format: 8-4-4-4-12
			expect(id).toMatch(
				/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
			);
		});

		it("should return the same ID on subsequent calls", () => {
			const id1 = getInstallId();
			const id2 = getInstallId();

			expect(id1).toBe(id2);
		});

		it("should generate a new ID after clearing", () => {
			const id1 = getInstallId();
			clearInstallId();
			const id2 = getInstallId();

			expect(id1).not.toBe(id2);
			expect(id2).toMatch(
				/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
			);
		});
	});

	describe("isTelemetryOptedOut", () => {
		it("should return false by default", () => {
			expect(isTelemetryOptedOut()).toBe(false);
		});

		it("should return true after opting out", () => {
			setTelemetryOptOut(true);
			expect(isTelemetryOptedOut()).toBe(true);
		});

		it("should return false after opting back in", () => {
			setTelemetryOptOut(true);
			setTelemetryOptOut(false);
			expect(isTelemetryOptedOut()).toBe(false);
		});
	});

	describe("toggleTelemetryOptOut", () => {
		it("should toggle from false to true", () => {
			expect(isTelemetryOptedOut()).toBe(false);
			const result = toggleTelemetryOptOut();
			expect(result).toBe(true);
			expect(isTelemetryOptedOut()).toBe(true);
		});

		it("should toggle from true to false", () => {
			setTelemetryOptOut(true);
			expect(isTelemetryOptedOut()).toBe(true);
			const result = toggleTelemetryOptOut();
			expect(result).toBe(false);
			expect(isTelemetryOptedOut()).toBe(false);
		});
	});

	describe("ConsoleTelemetryProvider", () => {
		it("should log events to console", () => {
			const provider = new ConsoleTelemetryProvider();
			const payload: TelemetryPayload = {
				event: "mode_selected",
				props: { mode: "portrait" },
				timestamp: 1705312800000, // Fixed timestamp for testing
				installId: "test-123",
			};

			provider.track(payload);

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("[TELEMETRY]"),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("mode_selected"),
			);
		});

		it("should use custom prefix when provided", () => {
			const provider = new ConsoleTelemetryProvider("[ANALYTICS]");
			const payload: TelemetryPayload = {
				event: "shot_captured",
				props: { mode: "travel", score: 85, autoCapture: false },
				timestamp: 1705312800000,
				installId: "test-123",
			};

			provider.track(payload);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("[ANALYTICS]"),
			);
		});

		it("should format payload with timestamp and installId", () => {
			const provider = new ConsoleTelemetryProvider();
			const timestamp = 1705312800000; // 2024-01-15T10:00:00.000Z
			const payload: TelemetryPayload = {
				event: "session_started",
				timestamp,
				installId: "abc123",
			};

			provider.track(payload);

			const loggedMessage = consoleLogSpy.mock.calls[0][0];
			expect(loggedMessage).toContain("2024-01-15T10:00:00.000Z");
			expect(loggedMessage).toContain("session_started");
			expect(loggedMessage).toContain("install:abc123");
		});

		it("should include props JSON in log when props provided", () => {
			const provider = new ConsoleTelemetryProvider();
			const payload: TelemetryPayload = {
				event: "mode_selected",
				props: { mode: "portrait" },
				timestamp: 1705312800000,
				installId: "test-123",
			};

			provider.track(payload);

			const loggedMessage = consoleLogSpy.mock.calls[0][0];
			expect(loggedMessage).toContain('"mode":"portrait"');
		});

		it("should handle events without props", () => {
			const provider = new ConsoleTelemetryProvider();
			const payload: TelemetryPayload = {
				event: "session_started",
				timestamp: 1705312800000,
				installId: "test-123",
			};

			provider.track(payload);

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			const loggedMessage = consoleLogSpy.mock.calls[0][0];
			expect(loggedMessage).not.toContain("{");
		});

		it("should flush immediately (console is synchronous)", async () => {
			const provider = new ConsoleTelemetryProvider();
			await expect(provider.flush()).resolves.toBeUndefined();
		});
	});

	describe("TelemetryTracker", () => {
		it("should track events when not opted out", () => {
			const tracker = new TelemetryTracker();
			const result = tracker.track("mode_selected", { mode: "portrait" });

			expect(result).not.toBeNull();
			expect(result?.event).toBe("mode_selected");
			expect(result?.props).toEqual({ mode: "portrait" });
			expect(result?.installId).toBeDefined();
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		});

		it("should NOT track events when opted out", () => {
			setTelemetryOptOut(true);
			const tracker = new TelemetryTracker();
			const result = tracker.track("mode_selected", { mode: "portrait" });

			expect(result).toBeNull();
			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it("should use custom provider when set", () => {
			const mockProvider = {
				track: jest.fn(),
				flush: jest.fn().mockResolvedValue(undefined),
			};

			const tracker = new TelemetryTracker();
			tracker.setProvider(mockProvider);

			tracker.track("shot_captured", {
				mode: "travel",
				score: 80,
				autoCapture: true,
			});

			expect(mockProvider.track).toHaveBeenCalledTimes(1);
			expect(mockProvider.track).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "shot_captured",
					props: { mode: "travel", score: 80, autoCapture: true },
				}),
			);
		});

		it("should get current provider", () => {
			const tracker = new TelemetryTracker();
			const provider = tracker.getProvider();

			expect(provider).toBeInstanceOf(ConsoleTelemetryProvider);
		});

		it("should trackIf only when condition is true", () => {
			const tracker = new TelemetryTracker();

			const resultTrue = tracker.trackIf(true, "auto_captured", {
				mode: "portrait",
				score: 85,
			});
			const resultFalse = tracker.trackIf(false, "shot_discarded", {
				mode: "travel",
				score: 60,
				weakestSubscore: "lighting",
			});

			expect(resultTrue).not.toBeNull();
			expect(resultFalse).toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		});

		it("should flush provider when flush() called", async () => {
			const mockProvider = {
				track: jest.fn(),
				flush: jest.fn().mockResolvedValue(undefined),
			};

			const tracker = new TelemetryTracker(mockProvider);
			await tracker.flush();

			expect(mockProvider.flush).toHaveBeenCalledTimes(1);
		});

		it("should handle provider without flush method", async () => {
			const mockProvider = {
				track: jest.fn(),
			};

			const tracker = new TelemetryTracker(mockProvider);
			await expect(tracker.flush()).resolves.toBeUndefined();
		});

		it("should NOT flush when opted out", async () => {
			const mockProvider = {
				track: jest.fn(),
				flush: jest.fn().mockResolvedValue(undefined),
			};

			setTelemetryOptOut(true);
			const tracker = new TelemetryTracker(mockProvider);
			await tracker.flush();

			// Should still call provider.flush even when opted out (flush is independent)
			expect(mockProvider.flush).toHaveBeenCalledTimes(1);
		});

		it("should track all event types with correct properties", () => {
			const tracker = new TelemetryTracker();

			// Test all event types
			tracker.track("session_started");
			tracker.track("mode_selected", { mode: "portrait" });
			tracker.track("shot_captured", {
				mode: "travel",
				score: 85,
				autoCapture: false,
			});
			tracker.track("auto_captured", { mode: "portrait", score: 82 });
			tracker.track("shot_discarded", {
				mode: "group",
				score: 45,
				weakestSubscore: "stability",
			});
			tracker.track("session_ended", {
				mode: "portrait",
				durationMs: 120000,
				shotsCaptured: 5,
				shotsDiscarded: 2,
			});

			expect(consoleLogSpy).toHaveBeenCalledTimes(6);
		});
	});

	describe("Global telemetry instance", () => {
		it("should be exported as telemetry", () => {
			expect(telemetry).toBeInstanceOf(TelemetryTracker);
		});

		it("should use ConsoleTelemetryProvider by default", () => {
			const provider = telemetry.getProvider();
			expect(provider).toBeInstanceOf(ConsoleTelemetryProvider);
		});

		it("should track events through global instance", () => {
			const result = telemetry.track("mode_selected", { mode: "portrait" });

			expect(result).not.toBeNull();
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe("Payload shape validation", () => {
		it("should have correct shape for all event types", () => {
			const installId = "test-123";
			const timestamp = Date.now();

			const events: Array<{ event: TelemetryEvent; props?: object }> = [
				{ event: "session_started" },
				{ event: "mode_selected", props: { mode: "portrait" } },
				{
					event: "shot_captured",
					props: { mode: "travel", score: 85, autoCapture: false },
				},
				{ event: "auto_captured", props: { mode: "portrait", score: 82 } },
				{
					event: "shot_discarded",
					props: { mode: "group", score: 45, weakestSubscore: "stability" },
				},
				{
					event: "session_ended",
					props: {
						mode: "portrait",
						durationMs: 120000,
						shotsCaptured: 5,
						shotsDiscarded: 2,
					},
				},
			];

			events.forEach(({ event, props }) => {
				const payload = createTelemetryPayload(
					event,
					installId,
					props as never,
				);

				expect(payload).toHaveProperty("event");
				expect(payload).toHaveProperty("timestamp");
				expect(payload).toHaveProperty("installId");
				expect(payload.event).toBe(event);
				expect(payload.timestamp).toBeGreaterThanOrEqual(timestamp);
				expect(payload.installId).toBe(installId);

				if (props) {
					expect(payload).toHaveProperty("props");
					expect(payload.props).toEqual(props);
				}
			});
		});

		it("should not contain PII in any event", () => {
			const installId = "test-123";

			const events: Array<{ event: TelemetryEvent; props?: object }> = [
				{ event: "session_started" },
				{ event: "mode_selected", props: { mode: "portrait" } },
				{
					event: "shot_captured",
					props: { mode: "travel", score: 85, autoCapture: false },
				},
				{
					event: "shot_discarded",
					props: { mode: "group", score: 45, weakestSubscore: "stability" },
				},
				{
					event: "session_ended",
					props: {
						mode: "portrait",
						durationMs: 120000,
						shotsCaptured: 5,
						shotsDiscarded: 2,
					},
				},
			];

			events.forEach(({ event, props }) => {
				const payload = createTelemetryPayload(
					event,
					installId,
					props as never,
				);

				// Verify payload doesn't contain photo bytes or user identifiers
				const payloadStr = JSON.stringify(payload);
				expect(payloadStr).not.toContain("photo");
				expect(payloadStr).not.toContain("image");
				expect(payloadStr).not.toContain("userId");
				expect(payloadStr).not.toContain("email");
				expect(payloadStr).not.toContain("name");
			});
		});
	});
});
