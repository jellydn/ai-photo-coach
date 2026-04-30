/**
 * Telemetry types and interfaces
 *
 * Defines the contract for anonymous event tracking to measure success metrics.
 * No PII is collected - only event names, timestamps, and anonymized properties.
 */

/** Available telemetry events */
export type TelemetryEvent =
	| "mode_selected"
	| "shot_captured"
	| "auto_captured"
	| "shot_discarded"
	| "session_started"
	| "session_ended";

/** Properties for mode_selected event */
export interface ModeSelectedProps {
	mode: string;
}

/** Properties for shot_captured event */
export interface ShotCapturedProps {
	mode: string;
	score: number;
	autoCapture: boolean;
	/** Whether this was a burst capture (Pet/Kids mode) */
	isBurst?: boolean;
	/** Number of photos in the burst */
	burstCount?: number;
}

/** Properties for auto_captured event */
export interface AutoCapturedProps {
	mode: string;
	score: number;
	/** Whether this was a burst capture (Pet/Kids mode) */
	isBurst?: boolean;
}

/** Properties for shot_discarded event */
export interface ShotDiscardedProps {
	mode: string;
	score: number;
	weakestSubscore: string;
}

/** Properties for session_started event */
export interface SessionStartedProps {
	mode: string;
}

/** Properties for session_ended event */
export interface SessionEndedProps {
	mode: string;
	durationMs: number;
	shotsCaptured: number;
	shotsDiscarded: number;
}

/** Event-specific property types */
export type TelemetryEventProps =
	| ModeSelectedProps
	| ShotCapturedProps
	| AutoCapturedProps
	| ShotDiscardedProps
	| SessionStartedProps
	| SessionEndedProps;

/** Telemetry event payload with metadata */
export interface TelemetryPayload {
	/** Event name */
	event: TelemetryEvent;
	/** Event properties (event-specific) */
	props?: TelemetryEventProps;
	/** Unix timestamp (ms) */
	timestamp: number;
	/** Unique install identifier (anonymous) */
	installId: string;
}

/**
 * Telemetry provider interface
 *
 * Implement this interface to send events to different backends
 * (console, analytics service, custom endpoint, etc.)
 */
export interface TelemetryProvider {
	/**
	 * Track an event
	 * @param payload - The telemetry payload to track
	 */
	track(payload: TelemetryPayload): void;

	/**
	 * Flush any buffered events (optional for sync providers)
	 */
	flush?(): Promise<void>;
}

/**
 * Create a telemetry payload with the given event and properties
 * @param event - The event name
 * @param installId - Anonymous install identifier
 * @param props - Optional event properties
 * @returns Complete telemetry payload
 */
export function createTelemetryPayload(
	event: TelemetryEvent,
	installId: string,
	props?: TelemetryEventProps,
): TelemetryPayload {
	return {
		event,
		props,
		timestamp: Date.now(),
		installId,
	};
}

/**
 * Check if the given event requires specific properties
 * @param event - The event name
 * @returns true if the event requires properties
 */
export function eventRequiresProps(event: TelemetryEvent): boolean {
	return event !== "session_started" && event !== "session_ended";
}
