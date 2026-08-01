/**
 * useCameraSettings Hook Tests
 *
 * Verifies the extracted camera settings hook: initial values from MMKV,
 * SettingsScreen subscription updates, and the combined auto-capture setter.
 */

import { act, renderHook } from "@testing-library/react-native";
import {
	getAutoCaptureEnabled,
	getHapticFeedbackEnabled,
	getScoreVisibilityEnabled,
	setAutoCaptureEnabled as persistAutoCaptureEnabled,
	subscribeToSettings,
} from "../src/storage/settings";
import { useCameraSettings } from "../src/camera/useCameraSettings";

jest.mock("../src/storage/settings", () => ({
	getAutoCaptureEnabled: jest.fn().mockReturnValue(true),
	getHapticFeedbackEnabled: jest.fn().mockReturnValue(true),
	getScoreVisibilityEnabled: jest.fn().mockReturnValue(true),
	setAutoCaptureEnabled: jest.fn(),
	subscribeToSettings: jest.fn().mockReturnValue(jest.fn()),
}));

const mockSubscribeToSettings = subscribeToSettings as jest.Mock;

describe("useCameraSettings", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(getAutoCaptureEnabled as jest.Mock).mockReturnValue(true);
		(getHapticFeedbackEnabled as jest.Mock).mockReturnValue(true);
		(getScoreVisibilityEnabled as jest.Mock).mockReturnValue(true);
		mockSubscribeToSettings.mockReturnValue(jest.fn());
	});

	it("reads persisted values on mount", () => {
		const { result } = renderHook(() => useCameraSettings());

		expect(result.current.autoCaptureEnabled).toBe(true);
		expect(result.current.hapticEnabled).toBe(true);
		expect(result.current.scoreVisible).toBe(true);
	});

	it("subscribes to haptic and score-visibility settings changes", () => {
		renderHook(() => useCameraSettings());

		expect(mockSubscribeToSettings).toHaveBeenCalledWith(
			"hapticFeedbackChanged",
			expect.any(Function),
		);
		expect(mockSubscribeToSettings).toHaveBeenCalledWith(
			"scoreVisibilityChanged",
			expect.any(Function),
		);
	});

	it("updates haptic state when settings change externally", () => {
		let hapticListener: (() => void) | null = null;
		mockSubscribeToSettings.mockImplementation((event: string, cb: () => void) => {
			if (event === "hapticFeedbackChanged") {
				hapticListener = cb;
			}
			return jest.fn();
		});

		const { result } = renderHook(() => useCameraSettings());
		expect(result.current.hapticEnabled).toBe(true); // initial snapshot from MMKV

		// SettingsScreen changes the persisted value; the subscription fires
		(getHapticFeedbackEnabled as jest.Mock).mockReturnValue(false);
		act(() => {
			hapticListener?.();
		});
		expect(result.current.hapticEnabled).toBe(false); // updated from MMKV
	});

	it("setAutoCaptureEnabled writes local state and persists to MMKV", () => {
		const { result } = renderHook(() => useCameraSettings());

		act(() => {
			result.current.setAutoCaptureEnabled(false);
		});

		expect(result.current.autoCaptureEnabled).toBe(false);
		expect(persistAutoCaptureEnabled).toHaveBeenCalledWith(false);
	});

	it("returns a stable setter reference", () => {
		const { result, rerender } = renderHook(() => useCameraSettings());
		const first = result.current.setAutoCaptureEnabled;
		rerender(undefined);
		expect(result.current.setAutoCaptureEnabled).toBe(first);
	});

	it("unsubscribes from settings on unmount", () => {
		const unsubscribeHaptic = jest.fn();
		const unsubscribeScore = jest.fn();
		mockSubscribeToSettings.mockImplementation((event: string) =>
			event === "hapticFeedbackChanged" ? unsubscribeHaptic : unsubscribeScore,
		);

		const { unmount } = renderHook(() => useCameraSettings());
		unmount();

		expect(unsubscribeHaptic).toHaveBeenCalledTimes(1);
		expect(unsubscribeScore).toHaveBeenCalledTimes(1);
	});

	it("respects a disabled persisted auto-capture value", () => {
		(getAutoCaptureEnabled as jest.Mock).mockReturnValue(false);

		const { result } = renderHook(() => useCameraSettings());

		expect(result.current.autoCaptureEnabled).toBe(false);
	});
});
