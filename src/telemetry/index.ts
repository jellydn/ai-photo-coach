/**
 * Telemetry module
 *
 * Main telemetry tracker with pluggable providers.
 * Respects opt-out setting - no events tracked when user opts out.
 * No PII collected - only event names, timestamps, and anonymized properties.
 *
 * @security Note on Encryption:
 * This module provides both standard and encrypted storage variants.
 * The encrypted variants use AES-128 encryption with keys stored in
 * platform secure storage (Keychain/Keystore).
 *
 * For enhanced privacy, use the *Encrypted() variants:
 *   - getInstallIdEncrypted() / setInstallIdEncrypted()
 *   - isTelemetryOptedOutEncrypted() / setTelemetryOptedOutEncrypted()
 *
 * Standard functions (unencrypted) are kept for backward compatibility
 * and performance (synchronous).
 */

import { createMMKV } from "react-native-mmkv";
import { getEncryptedStorage } from "../storage/encryptedStorage";
import { ConsoleTelemetryProvider } from "./ConsoleTelemetryProvider";
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

// Standard MMKV storage for install ID persistence (separate from settings)
const storage = createMMKV({
	id: "telemetry-storage",
});

// Settings storage for opt-out (shared with src/storage/settings.ts)
const settingsStorage = createMMKV({
	id: "user-settings",
});

// Encrypted storage instances (lazy-loaded)
let encryptedStorage: ReturnType<typeof createMMKV> | null = null;
let encryptedSettingsStorage: ReturnType<typeof createMMKV> | null = null;

async function getTelemetryEncryptedStorage(): Promise<ReturnType<typeof createMMKV>> {
	if (!encryptedStorage) {
		encryptedStorage = await getEncryptedStorage("telemetry-storage-encrypted");
	}
	return encryptedStorage;
}

async function getTelemetryEncryptedSettingsStorage(): Promise<ReturnType<typeof createMMKV>> {
	if (!encryptedSettingsStorage) {
		encryptedSettingsStorage = await getEncryptedStorage("user-settings-encrypted");
	}
	return encryptedSettingsStorage;
}

// Storage keys
const INSTALL_ID_KEY = "@telemetry_install_id";
const TELEMETRY_OPT_OUT_KEY = "@telemetry_opt_out";

// Install ID (anonymous, persists across sessions)
let installId: string | null = null;

// Encrypted variant module-level cache (separate from unencrypted)
let installIdEncrypted: string | null = null;

/**
 * Get or create the anonymous install ID
 * @returns The install ID (creates one if it doesn't exist)
 */
export function getInstallId(): string {
	if (installId) {
		return installId;
	}

	const stored = storage.getString(INSTALL_ID_KEY);
	if (stored) {
		installId = stored;
		return installId;
	}

	// Generate new anonymous install ID (UUID-like format)
	const newId = generateInstallId();
	storage.set(INSTALL_ID_KEY, newId);
	installId = newId;
	return installId;
}

/**
 * Generate a random anonymous install ID
 * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * @returns Random install ID string
 */
function generateInstallId(): string {
	const hex = () => Math.floor(Math.random() * 16).toString(16);
	const segment = (length: number) => Array.from({ length }, hex).join("");

	return `${segment(8)}-${segment(4)}-${segment(4)}-${segment(4)}-${segment(12)}`;
}

/**
 * Check if telemetry opt-out is enabled
 * Uses settings storage for unified opt-out state
 * @returns true if user has opted out of telemetry
 */
export function isTelemetryOptedOut(): boolean {
	const value = settingsStorage.getString(TELEMETRY_OPT_OUT_KEY);
	return value === "true";
}

/**
 * Set telemetry opt-out state
 * Uses settings storage for unified opt-out state
 * @param optedOut - Whether user opts out of telemetry
 */
export function setTelemetryOptOut(optedOut: boolean): void {
	settingsStorage.set(TELEMETRY_OPT_OUT_KEY, String(optedOut));
}

/**
 * Toggle telemetry opt-out state
 * Uses settings storage for unified opt-out state
 * @returns New opt-out state after toggle
 */
export function toggleTelemetryOptOut(): boolean {
	const newValue = !isTelemetryOptedOut();
	setTelemetryOptOut(newValue);
	return newValue;
}

/**
 * Clear install ID (useful for testing)
 */
export function clearInstallId(): void {
	storage.remove(INSTALL_ID_KEY);
	installId = null;
}

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
		// Respect opt-out - don't track if user opted out (unencrypted path for sync behavior)
		if (isTelemetryOptedOut()) {
			return null;
		}

		const payload = createTelemetryPayload(event, getInstallId(), props);
		this.provider.track(payload);
		return payload;
	}

	/**
	 * Track an event with encrypted storage (respects encrypted opt-out setting)
	 * @param event - The event name
	 * @param props - Optional event properties
	 * @returns Promise resolving to the telemetry payload (or null if opted out)
	 */
	async trackEncrypted(
		event: TelemetryEvent,
		props?: TelemetryEventProps,
	): Promise<TelemetryPayload | null> {
		// Respect encrypted opt-out - don't track if user opted out
		if (await isTelemetryOptedOutEncrypted()) {
			return null;
		}

		const encryptedInstallId = await getInstallIdEncrypted();
		const payload = createTelemetryPayload(event, encryptedInstallId, props);
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

// ============================================================================
// ENCRYPTED TELEMETRY STORAGE
// ============================================================================
// The following functions provide AES-128 encrypted alternatives for sensitive
// telemetry data (install ID and opt-out status).
//
// Note: Encrypted storage is async (Promise-based) due to key retrieval
// from platform secure storage (Keychain/Keystore).
//
// Use these for enhanced privacy protection of telemetry identifiers.
// ============================================================================

/**
 * Get or create the anonymous install ID (encrypted storage)
 *
 * Note: This maintains a separate module-level cache from the unencrypted variant.
 * Apps should use only ONE variant consistently (encrypted recommended) to avoid
 * different IDs between storage types.
 *
 * @returns Promise resolving to the install ID
 */
export async function getInstallIdEncrypted(): Promise<string> {
	// Return cached value if available (session-level caching)
	if (installIdEncrypted) {
		return installIdEncrypted;
	}

	const encStorage = await getTelemetryEncryptedStorage();
	const stored = encStorage.getString(INSTALL_ID_KEY);
	if (stored) {
		installIdEncrypted = stored;
		return installIdEncrypted;
	}

	// Generate new anonymous install ID
	const newId = generateInstallId();
	encStorage.set(INSTALL_ID_KEY, newId);
	installIdEncrypted = newId;
	return newId;
}

/**
 * Set the install ID explicitly (encrypted storage)
 * @param id - The install ID to set
 */
export async function setInstallIdEncrypted(id: string): Promise<void> {
	const encStorage = await getTelemetryEncryptedStorage();
	encStorage.set(INSTALL_ID_KEY, id);
}

/**
 * Check if telemetry opt-out is enabled (encrypted storage)
 * @returns Promise resolving to true if opted out
 */
export async function isTelemetryOptedOutEncrypted(): Promise<boolean> {
	const encStorage = await getTelemetryEncryptedSettingsStorage();
	const value = encStorage.getString(TELEMETRY_OPT_OUT_KEY);
	return value === "true";
}

/**
 * Set telemetry opt-out state (encrypted storage)
 * @param optedOut - Whether user opts out of telemetry
 */
export async function setTelemetryOptedOutEncrypted(optedOut: boolean): Promise<void> {
	const encStorage = await getTelemetryEncryptedSettingsStorage();
	encStorage.set(TELEMETRY_OPT_OUT_KEY, String(optedOut));
}

/**
 * Clear install ID from encrypted storage (useful for testing)
 */
export async function clearInstallIdEncrypted(): Promise<void> {
	const encStorage = await getTelemetryEncryptedStorage();
	encStorage.remove(INSTALL_ID_KEY);
	installIdEncrypted = null;
}

/**
 * Clear all telemetry data from encrypted storage
 * Removes both install ID and opt-out status
 */
export async function clearAllTelemetryEncrypted(): Promise<void> {
	const encStorage = await getTelemetryEncryptedStorage();
	const encSettingsStorage = await getTelemetryEncryptedSettingsStorage();
	encStorage.remove(INSTALL_ID_KEY);
	encSettingsStorage.remove(TELEMETRY_OPT_OUT_KEY);
	installIdEncrypted = null;
}
