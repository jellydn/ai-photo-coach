/**
 * EncryptedLocalPhotoStorage Tests
 *
 * Verifies the second adapter behind the PhotoStorage seam: encrypted
 * metadata persistence with the same save/list/delete contract as
 * LocalPhotoStorage.
 */

import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import { createMMKV } from "react-native-mmkv";
import { getEncryptedStorage } from "../src/storage/encryptedStorage";
import { EncryptedLocalPhotoStorage } from "../src/storage/EncryptedLocalPhotoStorage";
import type { PhotoData } from "../src/storage/PhotoStorage";

// Mock encrypted storage key retrieval: return a fresh in-memory MMKV per id
jest.mock("../src/storage/encryptedStorage", () => ({
	getEncryptedStorage: jest.fn(),
}));

const mockGetEncryptedStorage = getEncryptedStorage as jest.Mock;
const instances = new Map<string, ReturnType<typeof createMMKV>>();

beforeEach(() => {
	instances.clear();
	mockGetEncryptedStorage.mockImplementation((id: string) => {
		if (!instances.has(id)) {
			instances.set(id, createMMKV({ id }));
		}
		return Promise.resolve(instances.get(id));
	});
});

describe("EncryptedLocalPhotoStorage", () => {
	let storage: EncryptedLocalPhotoStorage;

	beforeEach(() => {
		storage = new EncryptedLocalPhotoStorage();
	});

	const mockPhoto: PhotoData = {
		path: "/tmp/test-photo.jpg",
		width: 1920,
		height: 1080,
	};

	describe("save", () => {
		it("saves to camera roll and persists encrypted metadata", async () => {
			const metadata = await storage.save(mockPhoto, {
				mode: "portrait",
				score: 85,
			});

			expect(metadata.id).toMatch(/^\d+_[a-z0-9]+$/);
			expect(metadata.photoId).toBe("photo_1");
			expect(metadata.mode).toBe("portrait");
			expect(metadata.score).toBe(85);
			expect(CameraRoll.saveAsset).toHaveBeenCalledWith(mockPhoto.path, {
				type: "photo",
			});
		});
	});

	describe("list", () => {
		it("returns empty list when nothing saved", async () => {
			const photos = await storage.list();
			expect(photos).toEqual([]);
		});

		it("returns saved photos", async () => {
			await storage.save(mockPhoto, { mode: "portrait", score: 80 });
			await storage.save(mockPhoto, { mode: "travel", score: 70 });

			const photos = await storage.list();
			expect(photos).toHaveLength(2);
		});
	});

	describe("delete", () => {
		it("deletes photo and removes from list", async () => {
			const saved = await storage.save(mockPhoto, { mode: "portrait", score: 90 });

			const deleted = await storage.delete(saved.id);
			expect(deleted).toBe(true);

			const photos = await storage.list();
			expect(photos).toEqual([]);
		});

		it("returns false for unknown id", async () => {
			const deleted = await storage.delete("does-not-exist");
			expect(deleted).toBe(false);
		});
	});

	describe("construction", () => {
		it("constructs an encrypted adapter instance", () => {
			expect(new EncryptedLocalPhotoStorage()).toBeInstanceOf(
				EncryptedLocalPhotoStorage,
			);
		});
	});
});
