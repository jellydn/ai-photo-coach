/**
 * Encrypted Local Photo Storage
 *
 * Second adapter behind the PhotoStorage interface, mirroring
 * LocalPhotoStorage but persisting metadata in AES-128 encrypted MMKV
 * (keys in Keychain/Keystore).
 *
 * Why this module exists: encryption was previously exposed as a set of
 * `*Encrypted()` twin methods bolted onto LocalPhotoStorage, leaking the
 * encryption concern across the seam and forcing callers to reach into
 * one class for both plain and encrypted behavior. Moving it behind the
 * interface keeps the seam honest: pick the adapter, not the method.
 *
 * Note: encrypted access is async (Promise-based) because key retrieval
 * from platform secure storage is asynchronous.
 */

import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import { getEncryptedStorage } from "./encryptedStorage";
import {
	IndexMutex,
	INDEX_KEY,
	PAGE_SIZE,
	generateId,
	getPhotoKey,
} from "./photoIndex";
import type { PhotoData, PhotoMetadata, PhotoStorage } from "./PhotoStorage";

// Storage keys and index serialization live in ./photoIndex
const indexMutex = new IndexMutex();

/**
 * Encrypted implementation of PhotoStorage.
 *
 * Saves photos to the device camera roll (already encrypted by the OS)
 * and stores metadata in encrypted MMKV. Every operation is async due to
 * key retrieval from Keychain/Keystore.
 */
export class EncryptedLocalPhotoStorage implements PhotoStorage {
	private async getStorage() {
		return getEncryptedStorage("photo-metadata-encrypted");
	}

	async save(
		photo: PhotoData,
		metadata: Omit<PhotoMetadata, "id" | "timestamp" | "photoId">,
	): Promise<PhotoMetadata> {
		const savedAsset = await CameraRoll.saveAsset(photo.path, {
			type: "photo",
		});

		if (!savedAsset?.node?.id) {
			throw new Error("Failed to save photo to camera roll");
		}

		const fullMetadata: PhotoMetadata = {
			...metadata,
			id: generateId(),
			photoId: savedAsset.node.id,
			timestamp: new Date().toISOString(),
		};

		const storage = await this.getStorage();
		storage.set(getPhotoKey(fullMetadata.id), JSON.stringify(fullMetadata));

		await indexMutex.enqueue(async () => {
			const index = await this.getIndex();
			index.unshift(fullMetadata.id);
			await this.saveIndex(index);
		});

		return fullMetadata;
	}

	async list(): Promise<PhotoMetadata[]> {
		const index = await this.getIndex();
		return this.getPhotosByIds(index);
	}

	async listPaginated(
		page: number = 0,
		pageSize: number = PAGE_SIZE,
	): Promise<{ photos: PhotoMetadata[]; hasMore: boolean }> {
		const index = await this.getIndex();
		const start = page * pageSize;
		const end = start + pageSize;
		const pageIds = index.slice(start, end);

		return {
			photos: await this.getPhotosByIds(pageIds),
			hasMore: end < index.length,
		};
	}

	async delete(id: string): Promise<boolean> {
		const storage = await this.getStorage();
		const photoJson = storage.getString(getPhotoKey(id));
		if (!photoJson) {
			return false;
		}

		let photoToDelete: PhotoMetadata | null = null;
		try {
			photoToDelete = JSON.parse(photoJson) as PhotoMetadata;
		} catch {
			// Invalid JSON, still try to clean up
		}

		if (photoToDelete?.photoId) {
			try {
				await CameraRoll.deletePhotos([photoToDelete.photoId]);
			} catch (error) {
				console.warn("Failed to delete photo from camera roll:", error);
			}
		}

		storage.remove(getPhotoKey(id));

		await indexMutex.enqueue(async () => {
			const index = await this.getIndex();
			const updatedIndex = index.filter((photoId) => photoId !== id);
			await this.saveIndex(updatedIndex);
		});

		return true;
	}

	async getById(id: string): Promise<PhotoMetadata | null> {
		const storage = await this.getStorage();
		const json = storage.getString(getPhotoKey(id));
		if (!json) {
			return null;
		}
		try {
			return JSON.parse(json) as PhotoMetadata;
		} catch {
			console.error(`Failed to parse encrypted photo metadata for ${id}`);
			return null;
		}
	}

	async getCount(): Promise<number> {
		const index = await this.getIndex();
		return index.length;
	}

	async clearAllMetadata(): Promise<void> {
		const storage = await this.getStorage();
		const index = await this.getIndex();
		for (const id of index) {
			storage.remove(getPhotoKey(id));
		}
		storage.remove(INDEX_KEY);
	}

	private async getIndex(): Promise<string[]> {
		const storage = await this.getStorage();
		const json = storage.getString(INDEX_KEY);
		if (!json) {
			return [];
		}
		try {
			return JSON.parse(json) as string[];
		} catch {
			console.error("Failed to parse encrypted photo index");
			return [];
		}
	}

	private async saveIndex(index: string[]): Promise<void> {
		const storage = await this.getStorage();
		storage.set(INDEX_KEY, JSON.stringify(index));
	}

	private async getPhotosByIds(ids: string[]): Promise<PhotoMetadata[]> {
		const photos: PhotoMetadata[] = [];
		for (const id of ids) {
			const photo = await this.getById(id);
			if (photo) {
				photos.push(photo);
			}
		}
		return photos;
	}
}
