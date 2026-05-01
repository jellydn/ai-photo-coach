import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import { createMMKV } from "react-native-mmkv";
import type { PhotoData, PhotoMetadata, PhotoStorage } from "./PhotoStorage";

// Re-export PhotoData for consumers
export type { PhotoData } from "./PhotoStorage";

const storage = createMMKV({
	id: "photo-metadata",
});

const METADATA_KEY = "@photo_metadata";

/**
 * Generates a unique ID for a photo
 */
function generateId(): string {
	return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Local implementation of PhotoStorage that:
 * - Saves photos to device camera roll
 * - Stores metadata in MMKV
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

		// Store metadata in MMKV
		const existingMetadata = this.getStoredMetadata();
		const updatedMetadata = [fullMetadata, ...existingMetadata];
		this.setStoredMetadata(updatedMetadata);

		return fullMetadata;
	}

	/**
	 * List all saved photos with their metadata
	 */
	async list(): Promise<PhotoMetadata[]> {
		return this.getStoredMetadata();
	}

	/**
	 * Delete a photo and its metadata by ID
	 */
	async delete(id: string): Promise<boolean> {
		const existingMetadata = this.getStoredMetadata();
		const photoToDelete = existingMetadata.find((p) => p.id === id);

		if (!photoToDelete) {
			return false;
		}

		// Delete from camera roll if photoId exists
		if (photoToDelete.photoId) {
			try {
				await CameraRoll.deletePhotos([photoToDelete.photoId]);
			} catch (error) {
				// Log but don't fail - photo may already be deleted
				console.warn("Failed to delete photo from camera roll:", error);
			}
		}

		// Remove from metadata store
		const updatedMetadata = existingMetadata.filter((p) => p.id !== id);
		this.setStoredMetadata(updatedMetadata);

		return true;
	}

	/**
	 * Get metadata array from MMKV
	 */
	private getStoredMetadata(): PhotoMetadata[] {
		const json = storage.getString(METADATA_KEY);
		if (!json) {
			return [];
		}
		try {
			return JSON.parse(json) as PhotoMetadata[];
		} catch {
			console.error("Failed to parse photo metadata from storage");
			return [];
		}
	}

	/**
	 * Store metadata array in MMKV
	 */
	private setStoredMetadata(metadata: PhotoMetadata[]): void {
		storage.set(METADATA_KEY, JSON.stringify(metadata));
	}

	/**
	 * Clear all metadata (useful for testing)
	 */
	clearAllMetadata(): void {
		storage.remove(METADATA_KEY);
	}

	/**
	 * Get a single photo by ID
	 */
	getById(id: string): PhotoMetadata | null {
		const metadata = this.getStoredMetadata();
		return metadata.find((p) => p.id === id) ?? null;
	}
}

/**
 * Singleton instance for app-wide use
 */
export const photoStorage = new LocalPhotoStorage();
