import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import { createMMKV } from "react-native-mmkv";
import type { PhotoData, PhotoMetadata, PhotoStorage } from "./PhotoStorage";

// Re-export PhotoData for consumers
export type { PhotoData } from "./PhotoStorage";

const storage = createMMKV({
	id: "photo-metadata",
});

// Storage keys
const INDEX_KEY = "@photo_index";
const PAGE_SIZE = 50; // Number of photos per page for pagination

/**
 * Get the storage key for a specific photo metadata record
 */
function getPhotoKey(id: string): string {
	return `@photo:${id}`;
}

/**
 * Generates a unique ID for a photo
 */
function generateId(): string {
	return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Local implementation of PhotoStorage that:
 * - Saves photos to device camera roll
 * - Stores metadata in MMKV (indexed by ID for scalability)
 * - Supports pagination for large photo histories
 */
export class LocalPhotoStorage implements PhotoStorage {
	/**
	 * Save a photo to the camera roll and store its metadata
	 */
	async save(
		photo: PhotoData,
		metadata: Omit<PhotoMetadata, "id" | "timestamp" | "photoId">,
	): Promise<PhotoMetadata> {
		// Save photo to camera roll
		const savedAsset = await CameraRoll.saveAsset(photo.path, {
			type: "photo",
		});

		if (!savedAsset?.node?.id) {
			throw new Error("Failed to save photo to camera roll");
		}

		// Create full metadata record
		const fullMetadata: PhotoMetadata = {
			...metadata,
			id: generateId(),
			photoId: savedAsset.node.id,
			timestamp: new Date().toISOString(),
		};

		// Store metadata by ID (O(1) operation)
		storage.set(getPhotoKey(fullMetadata.id), JSON.stringify(fullMetadata));

		// Update index (prepend for chronological order)
		const index = this.getIndex();
		index.unshift(fullMetadata.id);
		this.saveIndex(index);

		return fullMetadata;
	}

	/**
	 * List all saved photos with their metadata
	 * Note: For large histories, use listPaginated() instead
	 */
	async list(): Promise<PhotoMetadata[]> {
		const index = this.getIndex();
		return this.getPhotosByIds(index);
	}

	/**
	 * List photos with pagination support
	 * @param page - Page number (0-indexed)
	 * @param pageSize - Number of photos per page
	 * @returns Paginated photo metadata
	 */
	async listPaginated(
		page: number = 0,
		pageSize: number = PAGE_SIZE,
	): Promise<{ photos: PhotoMetadata[]; hasMore: boolean }> {
		const index = this.getIndex();
		const start = page * pageSize;
		const end = start + pageSize;
		const pageIds = index.slice(start, end);

		return {
			photos: this.getPhotosByIds(pageIds),
			hasMore: end < index.length,
		};
	}

	/**
	 * Delete a photo and its metadata by ID
	 */
	async delete(id: string): Promise<boolean> {
		// Check if photo exists (O(1) lookup)
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

		// Delete from camera roll if photoId exists
		if (photoToDelete?.photoId) {
			try {
				await CameraRoll.deletePhotos([photoToDelete.photoId]);
			} catch (error) {
				// Log but don't fail - photo may already be deleted
				console.warn("Failed to delete photo from camera roll:", error);
			}
		}

		// Remove metadata (O(1) operation)
		storage.remove(getPhotoKey(id));

		// Update index (O(n) but n is small for typical photo counts)
		const index = this.getIndex();
		const updatedIndex = index.filter((photoId) => photoId !== id);
		this.saveIndex(updatedIndex);

		return true;
	}

	/**
	 * Get a single photo by ID (O(1) lookup)
	 */
	getById(id: string): PhotoMetadata | null {
		const json = storage.getString(getPhotoKey(id));
		if (!json) {
			return null;
		}
		try {
			return JSON.parse(json) as PhotoMetadata;
		} catch {
			console.error(`Failed to parse photo metadata for ${id}`);
			return null;
		}
	}

	/**
	 * Get total photo count (fast index-based count)
	 */
	getCount(): number {
		return this.getIndex().length;
	}

	/**
	 * Clear all metadata (useful for testing)
	 */
	clearAllMetadata(): void {
		const index = this.getIndex();
		// Delete all individual photo records
		for (const id of index) {
			storage.remove(getPhotoKey(id));
		}
		// Clear index
		storage.remove(INDEX_KEY);
	}

	/**
	 * Get the index of photo IDs
	 */
	private getIndex(): string[] {
		const json = storage.getString(INDEX_KEY);
		if (!json) {
			return [];
		}
		try {
			return JSON.parse(json) as string[];
		} catch {
			console.error("Failed to parse photo index from storage");
			return [];
		}
	}

	/**
	 * Save the index of photo IDs
	 */
	private saveIndex(index: string[]): void {
		storage.set(INDEX_KEY, JSON.stringify(index));
	}

	/**
	 * Get photos by their IDs
	 */
	private getPhotosByIds(ids: string[]): PhotoMetadata[] {
		const photos: PhotoMetadata[] = [];
		for (const id of ids) {
			const photo = this.getById(id);
			if (photo) {
				photos.push(photo);
			}
		}
		return photos;
	}
}

/**
 * Singleton instance for app-wide use
 */
export const photoStorage = new LocalPhotoStorage();
