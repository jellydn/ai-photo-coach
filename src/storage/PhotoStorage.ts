/**
 * Photo metadata stored locally alongside saved photos
 */
export interface PhotoMetadata {
	/** Unique identifier for the photo */
	id: string;
	/** Shooting mode (portrait, travel, etc.) */
	mode: string;
	/** Overall shot readiness score (0-100) */
	score: number;
	/** Individual subscores that contribute to the total score */
	subscores?: {
		level?: number;
		framing?: number;
		lighting?: number;
		stability?: number;
		aesthetic?: number;
	};
	/** ISO timestamp when the photo was captured */
	timestamp: string;
	/** Reference ID linking to the saved photo in camera roll */
	photoId?: string;
}

/**
 * Raw photo data from VisionCamera
 */
export interface PhotoData {
	/** Path to the photo file */
	path: string;
	/** Width in pixels */
	width: number;
	/** Height in pixels */
	height: number;
	/** Whether the photo is mirrored (front camera) */
	isMirrored?: boolean;
	/** Orientation of the photo */
	orientation?:
		| "portrait"
		| "landscape-left"
		| "landscape-right"
		| "portrait-upside-down";
}

/**
 * Interface for photo storage implementations
 * Abstracts the underlying storage mechanism (local camera roll, cloud, etc.)
 */
export interface PhotoStorage {
	/**
	 * Save a photo with associated metadata
	 * @param photo - The photo data from VisionCamera
	 * @param metadata - Metadata about the photo (mode, score, etc.)
	 * @returns The saved photo metadata with photoId populated
	 */
	save(
		photo: PhotoData,
		metadata: Omit<PhotoMetadata, "id" | "timestamp" | "photoId">,
	): Promise<PhotoMetadata>;

	/**
	 * List all saved photos with their metadata
	 * @returns Array of photo metadata, sorted by timestamp (newest first)
	 */
	list(): Promise<PhotoMetadata[]>;

	/**
	 * Delete a photo and its metadata by ID
	 * @param id - The metadata ID of the photo to delete
	 * @returns true if deleted, false if not found
	 */
	delete(id: string): Promise<boolean>;
}
