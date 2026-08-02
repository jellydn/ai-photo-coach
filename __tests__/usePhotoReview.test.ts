/**
 * usePhotoReview Hook Tests
 *
 * Verifies the deep photo-review module: save/discard lifecycle, burst
 * keep-best/keep-all deletion semantics, and storage interactions.
 */

import { act, renderHook } from "@testing-library/react-native";
import { photoStorage } from "../src/storage";
import { usePhotoReview } from "../src/screens/usePhotoReview";

// Mock the storage module
jest.mock("../src/storage", () => ({
	photoStorage: {
		delete: jest.fn(),
	},
}));

describe("usePhotoReview", () => {
	const mockOnSave = jest.fn();
	const mockOnDiscard = jest.fn();

	const burstPhotos = [
		{ id: "burst-1", uri: "file://burst/1.jpg" },
		{ id: "burst-2", uri: "file://burst/2.jpg" },
		{ id: "burst-3", uri: "file://burst/3.jpg" },
	];

	const defaultOptions = {
		photoId: "photo-1",
		onSave: mockOnSave,
		onDiscard: mockOnDiscard,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(photoStorage.delete as jest.Mock).mockResolvedValue(true);
	});

	describe("single mode", () => {
		it("is not burst mode without multiple burst photos", () => {
			const { result } = renderHook(() => usePhotoReview(defaultOptions));
			expect(result.current.isBurstMode).toBe(false);
		});

		it("handleSave notifies the parent without deleting", async () => {
			const { result } = renderHook(() => usePhotoReview(defaultOptions));
			await act(async () => {
				await result.current.handleSave();
			});
			expect(photoStorage.delete).not.toHaveBeenCalled();
			expect(mockOnSave).toHaveBeenCalledTimes(1);
		});

		it("handleDiscard deletes the single photo and notifies the parent", async () => {
			const { result } = renderHook(() => usePhotoReview(defaultOptions));
			await act(async () => {
				await result.current.handleDiscard();
			});
			expect(photoStorage.delete).toHaveBeenCalledWith("photo-1");
			expect(mockOnDiscard).toHaveBeenCalledTimes(1);
		});

		it("still calls onDiscard when delete fails", async () => {
			(photoStorage.delete as jest.Mock).mockRejectedValue(
				new Error("Delete failed"),
			);
			const { result } = renderHook(() => usePhotoReview(defaultOptions));
			await act(async () => {
				await result.current.handleDiscard();
			});
			expect(mockOnDiscard).toHaveBeenCalledTimes(1);
		});
	});

	describe("burst mode", () => {
		const burstOptions = { ...defaultOptions, burstPhotos };

		it("is burst mode with multiple burst photos", () => {
			const { result } = renderHook(() => usePhotoReview(burstOptions));
			expect(result.current.isBurstMode).toBe(true);
		});

		it("keep-all save does not delete any burst photo", async () => {
			const { result } = renderHook(() => usePhotoReview(burstOptions));
			await act(async () => {
				await result.current.handleSave();
			});
			expect(photoStorage.delete).not.toHaveBeenCalled();
			expect(mockOnSave).toHaveBeenCalledTimes(1);
		});

		it("keep-best save deletes all but the selected burst photo", async () => {
			const { result } = renderHook(() => usePhotoReview(burstOptions));
			await act(async () => {
				result.current.setKeepAllBurst(false);
			});
			await act(async () => {
				await result.current.handleSave();
			});
			expect(photoStorage.delete).toHaveBeenCalledTimes(2);
			expect(photoStorage.delete).toHaveBeenCalledWith("burst-2");
			expect(photoStorage.delete).toHaveBeenCalledWith("burst-3");
			expect(photoStorage.delete).not.toHaveBeenCalledWith("burst-1");
			expect(mockOnSave).toHaveBeenCalledTimes(1);
		});

		it("keep-best save deletes around the navigated index", async () => {
			const { result } = renderHook(() => usePhotoReview(burstOptions));
			await act(async () => {
				result.current.setCurrentBurstIndex(2);
				result.current.setKeepAllBurst(false);
			});
			await act(async () => {
				await result.current.handleSave();
			});
			expect(photoStorage.delete).toHaveBeenCalledWith("burst-1");
			expect(photoStorage.delete).toHaveBeenCalledWith("burst-2");
			expect(photoStorage.delete).not.toHaveBeenCalledWith("burst-3");
			expect(mockOnSave).toHaveBeenCalledTimes(1);
		});

		it("discard deletes every burst photo", async () => {
			const { result } = renderHook(() => usePhotoReview(burstOptions));
			await act(async () => {
				await result.current.handleDiscard();
			});
			expect(photoStorage.delete).toHaveBeenCalledTimes(3);
			expect(mockOnDiscard).toHaveBeenCalledTimes(1);
		});
	});
});
