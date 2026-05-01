/**
 * Settings storage module
 *
 * Manages user preferences using MMKV for fast, synchronous storage.
 * All settings are persisted across app launches.
 * Supports subscription to settings changes.
 *
 * @security Note on Encryption:
 * This module uses standard MMKV (unencrypted) for performance.
 * For encrypted settings storage, use the `*Encrypted()` variants below
 * which store data with AES-128 encryption.
 *
 * Migration: To migrate to encrypted storage:
 * 1. Read current settings with get*() functions
 * 2. Write to encrypted storage with set*Encrypted() functions
 * 3. Update app code to use encrypted variants
 */

import { createMMKV } from "react-native-mmkv";
import { getEncryptedStorage } from "./encryptedStorage";

// Standard unencrypted storage (fast, synchronous)
const storage = createMMKV({
	id: "user-settings",
});

// Encrypted storage instance (lazy-loaded)
let encryptedStorage: ReturnType<typeof createMMKV> | null = null;

async function getEncryptedSettingsStorage(): Promise<ReturnType<typeof createMMKV>> {
	if (!encryptedStorage) {
		encryptedStorage = await getEncryptedStorage("user-settings-encrypted");
	}
	return encryptedStorage;
}

/** Settings change event types */
export type SettingsEvent =
	| "autoCaptureChanged"
	| "hapticFeedbackChanged"
	| "scoreVisibilityChanged"
	| "telemetryOptOutChanged";

// Simple event emitter for React Native (no Node.js 'events' module)
type Listener = () => void;
const listeners: Record<SettingsEvent, Set<Listener>> = {
	autoCaptureChanged: new Set(),
	hapticFeedbackChanged: new Set(),
	scoreVisibilityChanged: new Set(),
	telemetryOptOutChanged: new Set(),
};

function emit(event: SettingsEvent): void {
	listeners[event].forEach((listener) => listener());
}

/**
 * Subscribe to settings changes
 * @param event - Event type to subscribe to
 * @param callback - Function to call when setting changes
 * @returns Unsubscribe function
 */
export function subscribeToSettings(
	event: SettingsEvent,
	callback: () => void,
): () => void {
	listeners[event].add(callback);
	return () => listeners[event].delete(callback);
}

// Storage keys
const AUTO_CAPTURE_ENABLED_KEY = "@auto_capture_enabled";
const TELEMETRY_OPT_OUT_KEY = "@telemetry_opt_out";
const HAPTIC_FEEDBACK_ENABLED_KEY = "@haptic_feedback_enabled";
const SCORE_VISIBILITY_ENABLED_KEY = "@score_visibility_enabled";

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
	emit("autoCaptureChanged");
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
 * Get score visibility enabled state
 * @returns true if score ring is visible (default: true)
 */
export function getScoreVisibilityEnabled(): boolean {
	const value = storage.getString(SCORE_VISIBILITY_ENABLED_KEY);
	return value === null ? true : value === "true";
}

/**
 * Set score visibility enabled state
 * @param enabled - Whether score ring should be visible
 */
export function setScoreVisibilityEnabled(enabled: boolean): void {
	storage.set(SCORE_VISIBILITY_ENABLED_KEY, String(enabled));
	emit("scoreVisibilityChanged");
}

/**
 * Toggle score visibility enabled state
 * @returns New enabled state after toggle
 */
export function toggleScoreVisibilityEnabled(): boolean {
	const newValue = !getScoreVisibilityEnabled();
	setScoreVisibilityEnabled(newValue);
	return newValue;
}

/**
 * Clear all settings (useful for testing)
 */
export function clearAllSettings(): void {
	storage.remove(AUTO_CAPTURE_ENABLED_KEY);
	storage.remove(TELEMETRY_OPT_OUT_KEY);
	storage.remove(HAPTIC_FEEDBACK_ENABLED_KEY);
	storage.remove(SCORE_VISIBILITY_ENABLED_KEY);
}

/**
 * Get haptic feedback enabled state
 * @returns true if haptic feedback is enabled (default: true)
 */
export function getHapticFeedbackEnabled(): boolean {
	const value = storage.getString(HAPTIC_FEEDBACK_ENABLED_KEY);
	return value === null ? true : value === "true";
}

/**
 * Set haptic feedback enabled state
 * @param enabled - Whether haptic feedback should be enabled
 */
export function setHapticFeedbackEnabled(enabled: boolean): void {
	storage.set(HAPTIC_FEEDBACK_ENABLED_KEY, String(enabled));
	emit("hapticFeedbackChanged");
}

/**
 * Toggle haptic feedback enabled state
 * @returns New enabled state after toggle
 */
export function toggleHapticFeedbackEnabled(): boolean {
	const newValue = !getHapticFeedbackEnabled();
	setHapticFeedbackEnabled(newValue);
	return newValue;
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
	emit("telemetryOptOutChanged");
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

// ============================================================================
// ENCRYPTED SETTINGS STORAGE
// ============================================================================
// The following functions provide AES-128 encrypted alternatives to the
// standard settings functions above. Use these for enhanced security.
//
// Note: Encrypted storage is async (Promise-based) due to key retrieval
// from platform secure storage (Keychain/Keystore).
//
// Migration Example:
//   // Before (unencrypted):
//   const enabled = getAutoCaptureEnabled();
//   setAutoCaptureEnabled(true);
//
//   // After (encrypted):
//   const enabled = await getAutoCaptureEnabledEncrypted();
//   await setAutoCaptureEnabledEncrypted(true);
// ============================================================================

/**
 * Get auto-capture enabled state (encrypted storage)
 * @returns Promise resolving to true if auto-capture is enabled (default: true)
 */
export async function getAutoCaptureEnabledEncrypted(): Promise<boolean> {
	const encStorage = await getEncryptedSettingsStorage();
	const value = encStorage.getString(AUTO_CAPTURE_ENABLED_KEY);
	return value === null ? true : value === "true";
}

/**
 * Set auto-capture enabled state (encrypted storage)
 * @param enabled - Whether auto-capture should be enabled
 */
export async function setAutoCaptureEnabledEncrypted(enabled: boolean): Promise<void> {
	const encStorage = await getEncryptedSettingsStorage();
	encStorage.set(AUTO_CAPTURE_ENABLED_KEY, String(enabled));
	emit("autoCaptureChanged");
}

/**
 * Get haptic feedback enabled state (encrypted storage)
 * @returns Promise resolving to true if enabled (default: true)
 */
export async function getHapticFeedbackEnabledEncrypted(): Promise<boolean> {
	const encStorage = await getEncryptedSettingsStorage();
	const value = encStorage.getString(HAPTIC_FEEDBACK_ENABLED_KEY);
	return value === null ? true : value === "true";
}

/**
 * Set haptic feedback enabled state (encrypted storage)
 * @param enabled - Whether haptic feedback should be enabled
 */
export async function setHapticFeedbackEnabledEncrypted(enabled: boolean): Promise<void> {
	const encStorage = await getEncryptedSettingsStorage();
	encStorage.set(HAPTIC_FEEDBACK_ENABLED_KEY, String(enabled));
	emit("hapticFeedbackChanged");
}

/**
 * Get score visibility enabled state (encrypted storage)
 * @returns Promise resolving to true if visible (default: true)
 */
export async function getScoreVisibilityEnabledEncrypted(): Promise<boolean> {
	const encStorage = await getEncryptedSettingsStorage();
	const value = encStorage.getString(SCORE_VISIBILITY_ENABLED_KEY);
	return value === null ? true : value === "true";
}

/**
 * Set score visibility enabled state (encrypted storage)
 * @param enabled - Whether score ring should be visible
 */
export async function setScoreVisibilityEnabledEncrypted(enabled: boolean): Promise<void> {
	const encStorage = await getEncryptedSettingsStorage();
	encStorage.set(SCORE_VISIBILITY_ENABLED_KEY, String(enabled));
	emit("scoreVisibilityChanged");
}

/**
 * Get telemetry opt-out state (encrypted storage)
 * @returns Promise resolving to true if opted out
 */
export async function getTelemetryOptOutEncrypted(): Promise<boolean> {
	const encStorage = await getEncryptedSettingsStorage();
	const value = encStorage.getString(TELEMETRY_OPT_OUT_KEY);
	return value === "true";
}

/**
 * Set telemetry opt-out state (encrypted storage)
 * @param optedOut - Whether user opts out of telemetry
 */
export async function setTelemetryOptOutEncrypted(optedOut: boolean): Promise<void> {
	const encStorage = await getEncryptedSettingsStorage();
	encStorage.set(TELEMETRY_OPT_OUT_KEY, String(optedOut));
	emit("telemetryOptOutChanged");
}

/**
 * Clear all settings from encrypted storage (useful for testing/reset)
 */
export async function clearAllSettingsEncrypted(): Promise<void> {
	const encStorage = await getEncryptedSettingsStorage();
	encStorage.remove(AUTO_CAPTURE_ENABLED_KEY);
	encStorage.remove(TELEMETRY_OPT_OUT_KEY);
	encStorage.remove(HAPTIC_FEEDBACK_ENABLED_KEY);
	encStorage.remove(SCORE_VISIBILITY_ENABLED_KEY);
}
