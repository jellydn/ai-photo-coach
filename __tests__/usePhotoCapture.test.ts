import { act, renderHook } from "@testing-library/react-native";
import { usePhotoCapture } from "../src/camera/usePhotoCapture";
import { photoStorage } from "../src/storage";

jest.mock("../src/storage", () => ({
	photoStorage: {
		save: jest.fn(),
	},
}));

const subScores = {
	stability: 90,
	level: 90,
	framing: 90,
	lighting: 90,
	aesthetic: 0,
	flatLay: 100,
	groupFraming: 100,
	centering: 100,
	documentSkew: 100,
	lowLightStability: 100,
};

describe("usePhotoCapture", () => {
	const capturePhotoToFile = jest.fn();
	const onCaptureComplete = jest.fn();
	const onCaptureFailed = jest.fn();
	const onPhotoCaptured = jest.fn();

	const options = {
		photoOutput: { capturePhotoToFile },
		mode: "portrait" as const,
		score: 90,
		subScores,
		weakestSubscore: "aesthetic" as const,
		isBurstMode: false,
		burstShotCount: 3,
		burstShotIndex: 0,
		captureState: "idle",
		triggerCapture: jest.fn(),
		onCaptureComplete,
		onCaptureFailed,
		onPhotoCaptured,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		capturePhotoToFile.mockResolvedValue({ filePath: "/tmp/photo.jpg" });
		(photoStorage.save as jest.Mock).mockResolvedValue({
			id: "photo-1",
			photoId: "asset-1",
			mode: "portrait",
			score: 90,
			timestamp: "2026-08-30T00:00:00.000Z",
		});
	});

	it("acknowledges capture only after camera and storage succeed", async () => {
		const { result } = renderHook(() => usePhotoCapture(options));

		await act(async () => result.current.capturePhoto());

		expect(photoStorage.save).toHaveBeenCalledTimes(1);
		expect(onCaptureComplete).toHaveBeenCalledTimes(1);
		expect(onCaptureFailed).not.toHaveBeenCalled();
		expect(onPhotoCaptured).toHaveBeenCalledTimes(1);
	});

	it("resets the sequencer when persistence fails", async () => {
		(photoStorage.save as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
		const consoleError = jest
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const { result } = renderHook(() => usePhotoCapture(options));

		await act(async () => result.current.capturePhoto());

		expect(onCaptureComplete).not.toHaveBeenCalled();
		expect(onCaptureFailed).toHaveBeenCalledTimes(1);
		expect(onPhotoCaptured).not.toHaveBeenCalled();
		consoleError.mockRestore();
	});

	it("does not overlap concurrent physical captures", async () => {
		let resolveCapture: ((value: { filePath: string }) => void) | undefined;
		capturePhotoToFile.mockReturnValueOnce(
			new Promise<{ filePath: string }>((resolve) => {
				resolveCapture = resolve;
			}),
		);
		const { result } = renderHook(() => usePhotoCapture(options));

		let firstCapture: Promise<void> | undefined;
		await act(async () => {
			firstCapture = result.current.capturePhoto();
			await result.current.capturePhoto(1);
		});
		expect(capturePhotoToFile).toHaveBeenCalledTimes(1);

		await act(async () => {
			resolveCapture?.({ filePath: "/tmp/photo.jpg" });
			await firstCapture;
		});
	});
});
