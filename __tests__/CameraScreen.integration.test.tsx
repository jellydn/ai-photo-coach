/**
 * CameraScreen Integration Tests
 *
 * Tests the main camera screen with mocked dependencies.
 * Verifies permission handling, capture flow, and UI composition.
 *
 * NOTE: This is a shell test - real frame processors are mocked.
 * See CONCERNS.md for details on frame processor stub status.
 */

import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { CameraScreen } from "../src/screens/CameraScreen";
import { Mode } from "../src/config/modes";

// Mock permissions module
jest.mock("react-native-permissions", () => ({
	check: jest.fn().mockResolvedValue("granted"),
	request: jest.fn().mockResolvedValue("granted"),
	PERMISSIONS: {
		IOS: { CAMERA: "ios.permission.CAMERA" },
		ANDROID: { CAMERA: "android.permission.CAMERA" },
	},
	RESULTS: {
		GRANTED: "granted",
		DENIED: "denied",
		BLOCKED: "blocked",
	},
}));

// Mock VisionCamera
jest.mock("react-native-vision-camera", () => ({
	Camera: jest.fn(() => null),
	useCameraDevice: jest.fn().mockReturnValue({
		id: "back",
		position: "back",
	}),
	usePhotoOutput: jest.fn().mockReturnValue({
		capturePhotoToFile: jest.fn().mockResolvedValue({ filePath: "test.jpg" }),
	}),
	useFrameOutput: jest.fn().mockReturnValue(null),
}));

// Mock photo storage
jest.mock("../src/storage", () => ({
	photoStorage: {
		save: jest.fn().mockResolvedValue({
			id: "test-photo-id",
			photoId: "camera-roll-id",
			timestamp: new Date().toISOString(),
		}),
		list: jest.fn().mockResolvedValue([]),
		delete: jest.fn().mockResolvedValue(true),
	},
}));

// Mock settings storage
jest.mock("../src/storage/settings", () => ({
	getAutoCaptureEnabled: jest.fn().mockReturnValue(true),
	getHapticFeedbackEnabled: jest.fn().mockReturnValue(true),
	getScoreVisibilityEnabled: jest.fn().mockReturnValue(true),
	setAutoCaptureEnabled: jest.fn(),
	subscribeToSettings: jest.fn().mockReturnValue(jest.fn()),
}));

// Mock sensors
jest.mock("../src/sensors", () => ({
	useHorizonLevel: jest.fn().mockReturnValue({
		roll: 0,
		isLevel: true,
		rawRoll: 0,
		isAvailable: true,
		error: null,
	}),
	useStability: jest.fn().mockReturnValue({
		isStable: true,
		sampleCount: 10,
		stabilityScore: 0.01,
		isAvailable: true,
		error: null,
	}),
	usePitchDetection: jest.fn().mockReturnValue({
		pitch: 0,
		isFlatLay: false,
	}),
}));

// Mock face detection
jest.mock("../src/faceDetection", () => ({
	useFaceDetection: jest.fn().mockReturnValue({
		faces: [],
		primaryFace: null,
		framingGuidance: null,
		frameOutput: null,
	}),
	FaceOverlay: jest.fn(() => null),
	GroupFaceOverlay: jest.fn(() => null),
	computeGroupFramingAnalysis: jest.fn().mockReturnValue({
		faceCount: 0,
		totalFaceAreaPercent: 0,
		edgeTouchingFaceCount: 0,
		framingScore: 100,
	}),
}));

// Mock haptics
jest.mock("../src/haptics/useHaptics", () => ({
	useHaptics: jest.fn().mockReturnValue({
		triggerCapture: jest.fn(),
	}),
}));

describe("CameraScreen Integration", () => {
	const defaultProps = {
		mode: "portrait" as Mode,
		onBack: jest.fn(),
		onPhotoCaptured: jest.fn(),
		onSettings: jest.fn(),
	};

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("Permission States", () => {
		it("should render camera view when permission is granted", async () => {
			const { getByTestId } = render(<CameraScreen {...defaultProps} />);

			await waitFor(() => {
				expect(getByTestId("camera-screen")).toBeTruthy();
			});
		});

		it("should show permission denied UI when permission is denied", async () => {
			const { check } = require("react-native-permissions");
			(check as jest.Mock).mockResolvedValueOnce("denied");

			const { getByTestId } = render(<CameraScreen {...defaultProps} />);

			await waitFor(() => {
				expect(getByTestId("grant-permission-button")).toBeTruthy();
			});
		});

		it("should request permission when grant button is pressed", async () => {
			const { check, request } = require("react-native-permissions");
			(check as jest.Mock).mockResolvedValueOnce("denied");
			(request as jest.Mock).mockResolvedValueOnce("granted");

			const { getByTestId } = render(<CameraScreen {...defaultProps} />);

			await waitFor(() => {
				expect(getByTestId("grant-permission-button")).toBeTruthy();
			});

			fireEvent.press(getByTestId("grant-permission-button"));

			await waitFor(() => {
				expect(request).toHaveBeenCalled();
			});
		});
	});

	describe("Mode Configuration", () => {
		it("should render with portrait mode configuration", async () => {
			const { getByTestId } = render(
				<CameraScreen {...defaultProps} mode="portrait" />,
			);

			await waitFor(() => {
				expect(getByTestId("camera-screen")).toBeTruthy();
			});
		});

		it("should render with travel mode configuration", async () => {
			const { getByTestId } = render(
				<CameraScreen {...defaultProps} mode="travel" />,
			);

			await waitFor(() => {
				expect(getByTestId("camera-screen")).toBeTruthy();
			});
		});
	});

	describe("Capture Flow", () => {
		it("should have shutter button", async () => {
			const { getByTestId } = render(<CameraScreen {...defaultProps} />);

			await waitFor(() => {
				expect(getByTestId("shutter-button")).toBeTruthy();
			});
		});

		it("should have shutter button that can be pressed", async () => {
			const { getByTestId } = render(<CameraScreen {...defaultProps} />);

			await waitFor(() => {
				expect(getByTestId("shutter-button")).toBeTruthy();
			});

			// Verify button is pressable
			fireEvent.press(getByTestId("shutter-button"));
			expect(getByTestId("shutter-button")).toBeTruthy();
		});
	});

	describe("Auto-capture Toggle", () => {
		it("should have auto-capture toggle button", async () => {
			const { getByTestId } = render(<CameraScreen {...defaultProps} />);

			await waitFor(() => {
				expect(getByTestId("auto-capture-toggle")).toBeTruthy();
			});
		});

		it("should toggle auto-capture when pressed", async () => {
			const { setAutoCaptureEnabled } = require("../src/storage/settings");
			const { getByTestId } = render(<CameraScreen {...defaultProps} />);

			await waitFor(() => {
				expect(getByTestId("auto-capture-toggle")).toBeTruthy();
			});

			fireEvent.press(getByTestId("auto-capture-toggle"));

			// Verify settings function was called
			await waitFor(() => {
				expect(setAutoCaptureEnabled).toHaveBeenCalled();
			});
		});
	});

	describe("Settings Navigation", () => {
		it("should have settings button", async () => {
			const { getByTestId } = render(<CameraScreen {...defaultProps} />);

			await waitFor(() => {
				expect(getByTestId("settings-button")).toBeTruthy();
			});
		});

		it("should call onSettings when settings button pressed", async () => {
			const onSettings = jest.fn();
			const { getByTestId } = render(
				<CameraScreen {...defaultProps} onSettings={onSettings} />,
			);

			await waitFor(() => {
				expect(getByTestId("settings-button")).toBeTruthy();
			});

			fireEvent.press(getByTestId("settings-button"));

			expect(onSettings).toHaveBeenCalled();
		});
	});

	describe("Back Navigation", () => {
		it("should call onBack when back button pressed", async () => {
			const onBack = jest.fn();
			const { getByTestId } = render(
				<CameraScreen {...defaultProps} onBack={onBack} />,
			);

			await waitFor(() => {
				expect(getByTestId("back-button")).toBeTruthy();
			});

			fireEvent.press(getByTestId("back-button"));

			expect(onBack).toHaveBeenCalled();
		});
	});
});
