/**
 * Encrypted Storage Module
 *
 * Provides encrypted MMKV storage instances for sensitive data.
 * Uses AES-128 encryption for all stored values.
 *
 * Security: Encryption keys are generated once per app install and stored
 * in platform secure storage (Keychain on iOS, Keystore on Android).
 * Keys are never exposed to JavaScript in plaintext for long.
 *
 * Use for:
 * - Settings and user preferences
 * - Photo metadata and scores
 * - Telemetry install ID
 * - Any data that could be considered sensitive
 *
 * Note: MMKV encryption has performance overhead. Only use for data
 * that requires protection. Large photo data should not be stored here.
 *
 * @security This module requires react-native-keychain for secure key storage.
 * Run: cd ios && pod install  (after adding react-native-keychain)
 */

import { createMMKV } from "react-native-mmkv";
import * as Keychain from "react-native-keychain";
// Polyfill for crypto.getRandomValues (required for React Native)
import "react-native-get-random-values";

// Storage instance cache to avoid recreating
const storageCache: Map<string, ReturnType<typeof createMMKV>> = new Map();

// In-flight promise cache to prevent race conditions during concurrent initialization
const pendingStoragePromises: Map<string, Promise<ReturnType<typeof createMMKV>>> = new Map();

/**
 * Get unique service name for a storage instance
 * Each storage ID gets its own keychain entry to prevent key overwrites
 */
function getServiceName(storageId: string): string {
	return `com.aiphotocoach.encrypted_storage.${storageId}`;
}

/**
 * Get or generate encryption key for a storage instance
 * Keys are stored in platform secure storage (Keychain/Keystore)
 *
 * @param storageId - Unique identifier for this storage
 * @returns 16-byte encryption key for AES-128 (hex string)
 */
async function getOrCreateEncryptionKey(storageId: string): Promise<string> {
	const keyUsername = `mmkv_key_${storageId}`;
	const serviceName = getServiceName(storageId);

	// Try to get existing key
	const existingCredentials = await Keychain.getGenericPassword({
		service: serviceName,
	});

	// Check if we have credentials and they match our storage ID
	if (
		existingCredentials &&
		typeof existingCredentials === "object" &&
		existingCredentials.username === keyUsername
	) {
		return existingCredentials.password;
	}

	// Generate new 16-byte key (32 hex chars for AES-128) using cryptographically secure RNG
	// crypto.getRandomValues is available in React Native via polyfill
	interface CryptoProvider {
		crypto: { getRandomValues: (arr: Uint8Array) => Uint8Array };
	}
	const cryptoObj = (globalThis as unknown as CryptoProvider).crypto;
	if (!cryptoObj?.getRandomValues) {
		throw new Error(
			"crypto.getRandomValues not available. Ensure React Native crypto polyfill is installed."
		);
	}
	const randomBytes = cryptoObj.getRandomValues(new Uint8Array(16));
	const newKey = Array.from(randomBytes, (b) =>
		b.toString(16).padStart(2, "0"),
	).join("");

	// Store securely in keychain
	await Keychain.setGenericPassword(keyUsername, newKey, {
		service: serviceName,
		accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
	});

	return newKey;
}

/**
 * Create or get an encrypted MMKV storage instance
 *
 * @param id - Storage identifier (e.g., "user-settings", "photo-metadata")
 * @returns Encrypted MMKV storage instance
 * @throws Error if encryption key cannot be retrieved/created
 */
export async function getEncryptedStorage(
	id: string,
): Promise<ReturnType<typeof createMMKV>> {
	// Check cache first (fast path for already-initialized storage)
	if (storageCache.has(id)) {
		return storageCache.get(id)!;
	}

	// Check if there's already an in-flight promise for this storage ID
	// This prevents race conditions when multiple concurrent calls are made
	if (pendingStoragePromises.has(id)) {
		return pendingStoragePromises.get(id)!;
	}

	// Create the initialization promise
	const initPromise = (async (): Promise<ReturnType<typeof createMMKV>> => {
		try {
			// Get or create encryption key
			const encryptionKey = await getOrCreateEncryptionKey(id);

			// Create encrypted storage
			const storage = createMMKV({
				id,
				encryptionKey,
			});

			// Cache for reuse
			storageCache.set(id, storage);
			return storage;
		} finally {
			// Clean up the pending promise
			pendingStoragePromises.delete(id);
		}
	})();

	// Store the pending promise so concurrent calls can await the same result
	pendingStoragePromises.set(id, initPromise);
	return initPromise;
}

/**
 * Clear cached storage instances (does NOT delete keys or data)
 * Useful for testing or when encryption key changes
 */
export function clearStorageCache(): void {
	storageCache.clear();
}

/**
 * Known encrypted storage IDs used by the app
 * These are the storage instances that will be wiped by deleteAllEncryptionKeys()
 */
const KNOWN_ENCRYPTED_STORAGE_IDS = [
	"telemetry-storage-encrypted",
	"user-settings-encrypted",
	"photo-metadata-encrypted",
] as const;

/**
 * Delete all encrypted storage keys from keychain
 * WARNING: This will make existing encrypted data unreadable!
 * Only use for complete data wipe scenarios.
 */
export async function deleteAllEncryptionKeys(): Promise<void> {
	// Clear all known storage instances from cache and delete their keys
	await Promise.all(
		KNOWN_ENCRYPTED_STORAGE_IDS.map(async (storageId) => {
			try {
				await deleteEncryptionKey(storageId);
			} catch (error) {
				console.error(`Failed to delete encryption key for ${storageId}:`, error);
				// Continue with other storages even if one fails
			}
		}),
	);
}

/**
 * Delete encryption key for a specific storage instance
 * WARNING: This will make data in that storage unreadable!
 */
export async function deleteEncryptionKey(storageId: string): Promise<void> {
	// Evict from cache so next getEncryptedStorage creates fresh instance
	storageCache.delete(storageId);
	// Also evict pending promise to prevent stale init from completing
	pendingStoragePromises.delete(storageId);
	await Keychain.resetGenericPassword({
		service: getServiceName(storageId),
	});
}

/**
 * Check if keychain/keystore is available on this device
 * Should be true for all modern iOS/Android devices
 */
export async function isEncryptionAvailable(): Promise<boolean> {
	try {
		// Try to set and get a test value using a test service
		const testService = "com.aiphotocoach.encryption_test";
		const testUsername = "_encryption_test_";
		await Keychain.setGenericPassword(testUsername, "test", {
			service: testService,
		});
		const credentials = await Keychain.getGenericPassword({
			service: testService,
		});
		await Keychain.resetGenericPassword({
			service: testService,
		});
		return (
			credentials !== false &&
			typeof credentials === "object" &&
			credentials.password === "test"
		);
	} catch {
		return false;
	}
}
