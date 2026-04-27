/**
 * Settings storage module
 *
 * Manages user preferences using MMKV for fast, synchronous storage.
 * All settings are persisted across app launches.
 */

import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({
	id: "user-settings",
});

// Storage keys
const AUTO_CAPTURE_ENABLED_KEY = "@auto_capture_enabled";
const TELEMETRY_OPT_OUT_KEY = "@telemetry_opt_out";

/**
 * Get auto-capture enabled state
 * @returns true if auto-capture is enabled (default: true)
 */
export function getAutoCaptureEnabled(): boolean {
	const value = storage.getString(AUTO_CAPTURE_ENABLED_KEY);
	return value === null ? true : value === "true";
}

/**
 * Set auto-capture enabled state
 * @param enabled - Whether auto-capture should be enabled
 */
export function setAutoCaptureEnabled(enabled: boolean): void {
	storage.set(AUTO_CAPTURE_ENABLED_KEY, String(enabled));
}

/**
 * Toggle auto-capture enabled state
 * @returns New enabled state after toggle
 */
export function toggleAutoCaptureEnabled(): boolean {
	const newValue = !getAutoCaptureEnabled();
	setAutoCaptureEnabled(newValue);
	return newValue;
}

/**
 * Clear all settings (useful for testing)
 */
export function clearAllSettings(): void {
	storage.remove(AUTO_CAPTURE_ENABLED_KEY);
	storage.remove(TELEMETRY_OPT_OUT_KEY);
}

// Telemetry opt-out settings
// Note: Actual telemetry functions are in src/telemetry/, exposed here for UI integration

/**
 * Get telemetry opt-out state
 * @returns true if user has opted out of telemetry
 */
export function getTelemetryOptOut(): boolean {
	const value = storage.getString(TELEMETRY_OPT_OUT_KEY);
	return value === "true";
}

/**
 * Set telemetry opt-out state
 * @param optedOut - Whether user opts out of telemetry
 */
export function setTelemetryOptOut(optedOut: boolean): void {
	storage.set(TELEMETRY_OPT_OUT_KEY, String(optedOut));
}

/**
 * Toggle telemetry opt-out state
 * @returns New opt-out state after toggle
 */
export function toggleTelemetryOptOut(): boolean {
	const newValue = !getTelemetryOptOut();
	setTelemetryOptOut(newValue);
	return newValue;
}
