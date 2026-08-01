/**
 * Install ID
 *
 * Owns the anonymous install identifier: generation, persistence in MMKV,
 * and module-level caching. A single deep module owns the ID so telemetry
 * and any future consumer read the same value.
 */

import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({
	id: "telemetry-storage",
});

const INSTALL_ID_KEY = "@telemetry_install_id";

let installId: string | null = null;

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
 * Clear install ID (useful for testing)
 */
export function clearInstallId(): void {
	storage.remove(INSTALL_ID_KEY);
	installId = null;
}
