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

// Storage instance cache to avoid recreating
const storageCache: Map<string, ReturnType<typeof createMMKV>> = new Map();

// Key storage service name
const KEYCHAIN_SERVICE = "com.aiphotocoach.encrypted_storage";

/**
 * Get or generate encryption key for a storage instance
 * Keys are stored in platform secure storage (Keychain/Keystore)
 *
 * @param storageId - Unique identifier for this storage
 * @returns 16-byte encryption key for AES-128 (hex string)
 */
async function getOrCreateEncryptionKey(storageId: string): Promise<string> {
	const keyUsername = `mmkv_key_${storageId}`;

	// Try to get existing key
	const existingCredentials = await Keychain.getGenericPassword({
		service: KEYCHAIN_SERVICE,
	});

	// Check if we have credentials and they match our storage ID
	if (
		existingCredentials &&
		typeof existingCredentials === "object" &&
		existingCredentials.username === keyUsername
	) {
		return existingCredentials.password;
	}

	// Generate new 16-byte key (32 hex chars for AES-128)
	const newKey = Array.from({ length: 16 }, () =>
		Math.floor(Math.random() * 256)
			.toString(16)
			.padStart(2, "0"),
	).join("");

	// Store securely in keychain
	await Keychain.setGenericPassword(keyUsername, newKey, {
		service: KEYCHAIN_SERVICE,
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
	// Check cache first
	if (storageCache.has(id)) {
		return storageCache.get(id)!;
	}

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
}

/**
 * Clear cached storage instances (does NOT delete keys or data)
 * Useful for testing or when encryption key changes
 */
export function clearStorageCache(): void {
	storageCache.clear();
}

/**
 * Delete all encrypted storage keys from keychain
 * WARNING: This will make existing encrypted data unreadable!
 * Only use for complete data wipe scenarios.
 */
export async function deleteAllEncryptionKeys(): Promise<void> {
	// Reset the keychain for our service
	await Keychain.resetGenericPassword({
		service: KEYCHAIN_SERVICE,
	});
}

/**
 * Check if keychain/keystore is available on this device
 * Should be true for all modern iOS/Android devices
 */
export async function isEncryptionAvailable(): Promise<boolean> {
	try {
		// Try to set and get a test value
		const testUsername = "_encryption_test_";
		await Keychain.setGenericPassword(testUsername, "test", {
			service: KEYCHAIN_SERVICE,
		});
		const credentials = await Keychain.getGenericPassword({
			service: KEYCHAIN_SERVICE,
		});
		await Keychain.resetGenericPassword({
			service: KEYCHAIN_SERVICE,
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
