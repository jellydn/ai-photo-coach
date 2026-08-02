/**
 * Photo storage wiring point
 *
 * Adapter selection happens here, once. Consumers of the PhotoStorage seam
 * (screens, capture hooks) import `photoStorage` and see only the
 * interface — never a concrete adapter. To switch persistence (e.g. to the
 * encrypted adapter), change the selection below; no call site changes.
 */

import { EncryptedLocalPhotoStorage } from "./EncryptedLocalPhotoStorage";
import { LocalPhotoStorage } from "./LocalPhotoStorage";
import type { PhotoStorage } from "./PhotoStorage";

/** Whether photo metadata should be persisted via the encrypted adapter. */
const USE_ENCRYPTED_PHOTO_STORAGE = false;

/** App-wide photo storage adapter (see the PhotoStorage interface). */
export const photoStorage: PhotoStorage = USE_ENCRYPTED_PHOTO_STORAGE
	? new EncryptedLocalPhotoStorage()
	: new LocalPhotoStorage();
