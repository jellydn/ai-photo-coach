/**
 * Console telemetry provider
 *
 * MVP implementation that logs events to console.
 * Useful for development and as a fallback when no other provider is configured.
 */

import type { TelemetryPayload, TelemetryProvider } from "./types";

/**
 * Console-based telemetry provider
 *
 * Logs all events to console with a consistent format.
 * Respects opt-out setting - no events logged when opted out.
 */
export class ConsoleTelemetryProvider implements TelemetryProvider {
	private prefix: string;

	/**
	 * Create a new console telemetry provider
	 * @param prefix - Optional prefix for log messages (default: "[TELEMETRY]")
	 */
	constructor(prefix = "[TELEMETRY]") {
		this.prefix = prefix;
	}

	/**
	 * Track an event by logging to console
	 * @param payload - The telemetry payload to log
	 */
	track(payload: TelemetryPayload): void {
		const { event, props, timestamp, installId } = payload;
		const timeStr = new Date(timestamp).toISOString();

		// Format: [TELEMETRY] 2024-01-15T10:30:00.000Z mode_selected { mode: "portrait" } install:abc123
		const propsStr = props ? JSON.stringify(props) : "";
		console.log(
			`${this.prefix} ${timeStr} ${event}${propsStr ? " " + propsStr : ""} install:${installId}`,
		);
	}

	/**
	 * No-op for console provider (logs are synchronous)
	 */
	async flush(): Promise<void> {
		// Console logs are synchronous, nothing to flush
		return Promise.resolve();
	}
}
