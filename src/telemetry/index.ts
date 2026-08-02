/**
 * Telemetry module
 *
 * Main telemetry tracker with pluggable providers.
 * Respects opt-out setting - no events tracked when user opts out.
 * No PII collected - only event names, timestamps, and anonymized properties.
 *
 * Responsibilities are split across focused modules:
 * - installId.ts owns the anonymous install identifier.
 * - src/storage/settings.ts owns the opt-out setting (single owner).
 * - This file is only the tracker: provider management and event dispatch.
 *
 * Smoke test: touching this recorded seam should pass the adr-check guard.
 */

import {
	getTelemetryOptOut,
	setTelemetryOptOut as setTelemetryOptOutSetting,
	toggleTelemetryOptOut as toggleTelemetryOptOutSetting,
} from "../storage/settings";
import { ConsoleTelemetryProvider } from "./ConsoleTelemetryProvider";
import { getInstallId } from "./installId";
import { NullTelemetryProvider } from "./NullTelemetryProvider";
import type {
	TelemetryEvent,
	TelemetryEventProps,
	TelemetryPayload,
	TelemetryProvider,
} from "./types";
import { createTelemetryPayload } from "./types";

// Re-export providers
export { ConsoleTelemetryProvider } from "./ConsoleTelemetryProvider";
export { NullTelemetryProvider } from "./NullTelemetryProvider";
// Re-export types and functions from types.ts
export type {
	AutoCapturedProps,
	ModeSelectedProps,
	SessionEndedProps,
	SessionStartedProps,
	ShotCapturedProps,
	ShotDiscardedProps,
	TelemetryEvent,
	TelemetryEventProps,
	TelemetryPayload,
	TelemetryProvider,
} from "./types";
export { createTelemetryPayload, eventRequiresProps } from "./types";
// Re-export install ID ownership (single owner of the anonymous ID)
export { clearInstallId, getInstallId } from "./installId";

// Opt-out state is owned by src/storage/settings.ts - telemetry delegates
// to it instead of maintaining a duplicate copy of the setting.
export const isTelemetryOptedOut = getTelemetryOptOut;
export const setTelemetryOptOut = setTelemetryOptOutSetting;
export const toggleTelemetryOptOut = toggleTelemetryOptOutSetting;

/**
 * Get the default telemetry provider based on build environment
 * @returns Console provider in dev, null provider in production
 */
function getDefaultProvider(): TelemetryProvider {
	// Use console provider in development for debugging
	// Use null provider in production for privacy/safety
	if (typeof __DEV__ !== "undefined" && __DEV__) {
		return new ConsoleTelemetryProvider();
	}
	return new NullTelemetryProvider();
}

/**
 * Telemetry tracker class
 *
 * Manages the active provider and handles opt-out logic.
 * Use the global `telemetry` instance for most cases.
 */
export class TelemetryTracker {
	private provider: TelemetryProvider;

	/**
	 * Create a new telemetry tracker
	 * @param provider - The telemetry provider to use (default: environment-appropriate provider)
	 */
	constructor(provider?: TelemetryProvider) {
		this.provider = provider ?? getDefaultProvider();
	}

	/**
	 * Set a new telemetry provider
	 * @param provider - The new provider to use
	 */
	setProvider(provider: TelemetryProvider): void {
		this.provider = provider;
	}

	/**
	 * Get the current telemetry provider
	 * @returns The active provider
	 */
	getProvider(): TelemetryProvider {
		return this.provider;
	}

	/**
	 * Track an event (respects opt-out setting)
	 * @param event - The event name
	 * @param props - Optional event properties
	 * @returns The telemetry payload that was tracked (or null if opted out)
	 */
	track(
		event: TelemetryEvent,
		props?: TelemetryEventProps,
	): TelemetryPayload | null {
		// Respect opt-out - don't track if user opted out
		if (isTelemetryOptedOut()) {
			return null;
		}

		const payload = createTelemetryPayload(event, getInstallId(), props);
		this.provider.track(payload);
		return payload;
	}

	/**
	 * Track an event only if a condition is met
	 * @param condition - Whether to track the event
	 * @param event - The event name
	 * @param props - Optional event properties
	 * @returns The telemetry payload or null
	 */
	trackIf(
		condition: boolean,
		event: TelemetryEvent,
		props?: TelemetryEventProps,
	): TelemetryPayload | null {
		if (!condition) {
			return null;
		}
		return this.track(event, props);
	}

	/**
	 * Flush any buffered events
	 */
	async flush(): Promise<void> {
		if (this.provider.flush) {
			await this.provider.flush();
		}
	}
}

// Global telemetry instance (MVP uses console provider by default)
export const telemetry = new TelemetryTracker();
