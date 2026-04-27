import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import {
	LocalPhotoStorage,
	type PhotoData,
	photoStorage,
} from "../src/storage/LocalPhotoStorage";

describe("LocalPhotoStorage", () => {
	let storage: LocalPhotoStorage;

	beforeEach(() => {
		storage = new LocalPhotoStorage();
		// Clear metadata storage
		storage.clearAllMetadata();
	});

	describe("save", () => {
		const mockPhoto: PhotoData = {
			path: "/tmp/test-photo.jpg",
			width: 1920,
			height: 1080,
		};

		it("should save photo to camera roll and return metadata with id and timestamp", async () => {
			const metadata = await storage.save(mockPhoto, {
				mode: "portrait",
				score: 85,
				subscores: {
					level: 90,
					framing: 80,
					lighting: 85,
					stability: 95,
				},
			});

			// Verify metadata structure
			expect(metadata.id).toBeDefined();
			expect(metadata.id).toMatch(/^\d+_[a-z0-9]+$/); // format: timestamp_random
			expect(metadata.photoId).toBe("photo_1"); // From mock
			expect(metadata.timestamp).toBeDefined();
			expect(new Date(metadata.timestamp).getTime()).not.toBeNaN();

			// Verify passed values
			expect(metadata.mode).toBe("portrait");
			expect(metadata.score).toBe(85);
			expect(metadata.subscores).toEqual({
				level: 90,
				framing: 80,
				lighting: 85,
				stability: 95,
			});
		});

		it("should save photo without subscores", async () => {
			const metadata = await storage.save(mockPhoto, {
				mode: "travel",
				score: 70,
			});

			expect(metadata.mode).toBe("travel");
			expect(metadata.score).toBe(70);
			expect(metadata.subscores).toBeUndefined();
		});

		it("should call CameraRoll.saveAsset with correct arguments", async () => {
			await storage.save(mockPhoto, {
				mode: "portrait",
				score: 80,
			});

			expect(CameraRoll.saveAsset).toHaveBeenCalledWith(mockPhoto.path, {
				type: "photo",
			});
		});
	});

	describe("list", () => {
		const mockPhoto: PhotoData = {
			path: "/tmp/test-photo.jpg",
			width: 1920,
			height: 1080,
		};

		it("should return empty array when no photos saved", async () => {
			const photos = await storage.list();
			expect(photos).toEqual([]);
		});

		it("should return saved photos sorted by timestamp (newest first)", async () => {
			// Save first photo
			await storage.save(mockPhoto, { mode: "portrait", score: 70 });

			// Wait a tiny bit to ensure different timestamps
			await new Promise<void>((resolve) => setTimeout(resolve, 10));

			// Save second photo
			await storage.save(mockPhoto, { mode: "travel", score: 85 });

			const photos = await storage.list();

			expect(photos).toHaveLength(2);
			// Newest should be first
			expect(photos[0].mode).toBe("travel");
			expect(photos[1].mode).toBe("portrait");
		});

		it("should persist metadata across storage instances", async () => {
			await storage.save(mockPhoto, { mode: "portrait", score: 75 });

			// Create new storage instance (simulating app restart)
			const newStorage = new LocalPhotoStorage();
			const photos = await newStorage.list();

			expect(photos).toHaveLength(1);
			expect(photos[0].mode).toBe("portrait");
			expect(photos[0].score).toBe(75);
		});
	});

	describe("delete", () => {
		const mockPhoto: PhotoData = {
			path: "/tmp/test-photo.jpg",
			width: 1920,
			height: 1080,
		};

		it("should return false when photo not found", async () => {
			const result = await storage.delete("non-existent-id");
			expect(result).toBe(false);
		});

		it("should delete photo from camera roll and metadata", async () => {
			// Save a photo first
			const saved = await storage.save(mockPhoto, {
				mode: "portrait",
				score: 90,
			});

			expect(await storage.list()).toHaveLength(1);

			// Delete it
			const result = await storage.delete(saved.id);

			expect(result).toBe(true);
			expect(await storage.list()).toHaveLength(0);
			expect(CameraRoll.deletePhotos).toHaveBeenCalledWith([saved.photoId]);
		});

		it("should only delete the specified photo", async () => {
			// Save two photos
			const saved1 = await storage.save(mockPhoto, {
				mode: "portrait",
				score: 70,
			});
			const saved2 = await storage.save(mockPhoto, {
				mode: "travel",
				score: 80,
			});

			// Delete only the first
			await storage.delete(saved1.id);

			const remaining = await storage.list();
			expect(remaining).toHaveLength(1);
			expect(remaining[0].id).toBe(saved2.id);
		});
	});

	describe("getById", () => {
		const mockPhoto: PhotoData = {
			path: "/tmp/test-photo.jpg",
			width: 1920,
			height: 1080,
		};

		it("should return null for non-existent id", () => {
			const result = storage.getById("non-existent");
			expect(result).toBeNull();
		});

		it("should return photo metadata by id", async () => {
			const saved = await storage.save(mockPhoto, {
				mode: "portrait",
				score: 95,
				subscores: { level: 100, framing: 90 },
			});

			const result = storage.getById(saved.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(saved.id);
			expect(result?.mode).toBe("portrait");
			expect(result?.score).toBe(95);
		});
	});

	describe("singleton instance", () => {
		it("should export a singleton photoStorage instance", () => {
			expect(photoStorage).toBeDefined();
			expect(photoStorage).toBeInstanceOf(LocalPhotoStorage);
		});
	});

	describe("error handling", () => {
		it("should handle CameraRoll.saveAsset failure", async () => {
			(CameraRoll.saveAsset as jest.Mock).mockRejectedValueOnce(
				new Error("Permission denied"),
			);

			const mockPhoto: PhotoData = {
				path: "/tmp/test-photo.jpg",
				width: 1920,
				height: 1080,
			};

			await expect(
				storage.save(mockPhoto, { mode: "portrait", score: 80 }),
			).rejects.toThrow("Permission denied");
		});

		it("should handle missing photoId from CameraRoll", async () => {
			(CameraRoll.saveAsset as jest.Mock).mockResolvedValueOnce({
				node: {}, // Missing id
			});

			const mockPhoto: PhotoData = {
				path: "/tmp/test-photo.jpg",
				width: 1920,
				height: 1080,
			};

			await expect(
				storage.save(mockPhoto, { mode: "portrait", score: 80 }),
			).rejects.toThrow("Failed to save photo to camera roll");
		});
	});
});
