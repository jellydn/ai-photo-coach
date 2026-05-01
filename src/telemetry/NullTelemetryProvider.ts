/**
 * Null Telemetry Provider
 *
 * A no-op telemetry provider for production builds or when telemetry is disabled.
 * Implements the TelemetryProvider interface but does nothing.
 * 
 * Use this provider in production to ensure no telemetry data is logged
 * when the console provider would be inappropriate.
 */

import type { TelemetryPayload, TelemetryProvider } from "./types";

/**
 * No-op telemetry provider
 * 
 * Tracks events by doing nothing - useful for:
 * - Production builds where console logging is inappropriate
 * - Testing scenarios where telemetry should be suppressed
 * - Fallback when primary provider fails to initialize
 */
export class NullTelemetryProvider implements TelemetryProvider {
	/**
	 * No-op track method
	 * @param _payload - The telemetry payload (ignored)
	 */
	track(_payload: TelemetryPayload): void {
		// Intentionally empty - no-op for production safety
	}

	/**
	 * No-op flush method
	 */
	async flush(): Promise<void> {
		// Intentionally empty - nothing to flush
	}
}
