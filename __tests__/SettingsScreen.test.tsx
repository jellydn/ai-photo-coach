/**
 * SettingsScreen unit tests
 */

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { SettingsScreen } from "../src/screens/SettingsScreen";
import * as settings from "../src/storage/settings";
import * as telemetry from "../src/telemetry";

// Mock storage functions
jest.mock("../src/storage/settings", () => ({
	getAutoCaptureEnabled: jest.fn(),
	setAutoCaptureEnabled: jest.fn(),
	getHapticFeedbackEnabled: jest.fn(),
	setHapticFeedbackEnabled: jest.fn(),
	getScoreVisibilityEnabled: jest.fn(),
	setScoreVisibilityEnabled: jest.fn(),
}));

jest.mock("../src/telemetry", () => ({
	isTelemetryOptedOut: jest.fn(),
	setTelemetryOptOut: jest.fn(),
}));

describe("SettingsScreen", () => {
	const mockOnBack = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		(settings.getAutoCaptureEnabled as jest.Mock).mockReturnValue(true);
		(settings.getHapticFeedbackEnabled as jest.Mock).mockReturnValue(true);
		(settings.getScoreVisibilityEnabled as jest.Mock).mockReturnValue(true);
		(telemetry.isTelemetryOptedOut as jest.Mock).mockReturnValue(false);
	});

	it("renders correctly", () => {
		const { getByText, getByTestId } = render(
			<SettingsScreen onBack={mockOnBack} />,
		);

		// Header
		expect(getByText("Settings")).toBeTruthy();
		expect(getByText("← Back")).toBeTruthy();

		// Sections
		expect(getByText("Camera")).toBeTruthy();
		expect(getByText("Privacy")).toBeTruthy();
		expect(getByText("About")).toBeTruthy();

		// Settings
		expect(getByText("Auto-capture")).toBeTruthy();
		expect(getByText("Haptic feedback")).toBeTruthy();
		expect(getByText("Analytics")).toBeTruthy();

		// Switches
		expect(getByTestId("auto-capture-switch")).toBeTruthy();
		expect(getByTestId("haptic-feedback-switch")).toBeTruthy();
		expect(getByTestId("analytics-switch")).toBeTruthy();
	});

	it("displays correct initial auto-capture state when enabled", () => {
		(settings.getAutoCaptureEnabled as jest.Mock).mockReturnValue(true);

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("auto-capture-switch");
		expect(switchEl.props.value).toBe(true);
		expect(switchEl.props.accessibilityLabel).toBe("Auto-capture enabled");
	});

	it("displays correct initial auto-capture state when disabled", () => {
		(settings.getAutoCaptureEnabled as jest.Mock).mockReturnValue(false);

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("auto-capture-switch");
		expect(switchEl.props.value).toBe(false);
		expect(switchEl.props.accessibilityLabel).toBe("Auto-capture disabled");
	});

	it("displays correct initial analytics state when opted in", () => {
		(telemetry.isTelemetryOptedOut as jest.Mock).mockReturnValue(false);

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("analytics-switch");
		expect(switchEl.props.value).toBe(true); // Switch shows enabled when NOT opted out
		expect(switchEl.props.accessibilityLabel).toBe("Analytics enabled");
	});

	it("displays correct initial analytics state when opted out", () => {
		(telemetry.isTelemetryOptedOut as jest.Mock).mockReturnValue(true);

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("analytics-switch");
		expect(switchEl.props.value).toBe(false); // Switch shows disabled when opted out
		expect(switchEl.props.accessibilityLabel).toBe("Analytics disabled");
	});

	it("toggles auto-capture when switch is pressed", () => {
		(settings.getAutoCaptureEnabled as jest.Mock).mockReturnValue(true);

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("auto-capture-switch");
		fireEvent(switchEl, "valueChange", false);

		expect(settings.setAutoCaptureEnabled).toHaveBeenCalledWith(false);
	});

	it("toggles analytics when switch is pressed (enabling)", () => {
		(telemetry.isTelemetryOptedOut as jest.Mock).mockReturnValue(true); // Start opted out

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("analytics-switch");
		fireEvent(switchEl, "valueChange", true);

		// When analytics switch is ON, telemetry should NOT be opted out
		expect(telemetry.setTelemetryOptOut).toHaveBeenCalledWith(false);
	});

	it("toggles analytics when switch is pressed (disabling)", () => {
		(telemetry.isTelemetryOptedOut as jest.Mock).mockReturnValue(false); // Start opted in

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("analytics-switch");
		fireEvent(switchEl, "valueChange", false);

		// When analytics switch is OFF, telemetry should be opted out
		expect(telemetry.setTelemetryOptOut).toHaveBeenCalledWith(true);
	});

	it("calls onBack when back button is pressed", () => {
		const { getByText } = render(<SettingsScreen onBack={mockOnBack} />);

		fireEvent.press(getByText("← Back"));
		expect(mockOnBack).toHaveBeenCalled();
	});

	it("displays privacy note about anonymous data", () => {
		const { getByText } = render(<SettingsScreen onBack={mockOnBack} />);

		expect(
			getByText("No photos, personal data, or identifiers are collected."),
		).toBeTruthy();
	});

	it("displays about section with app info", () => {
		const { getByText } = render(<SettingsScreen onBack={mockOnBack} />);

		expect(getByText("AI Photo Coach")).toBeTruthy();
		expect(getByText("Version 1.0.0")).toBeTruthy();
		expect(
			getByText(
				/Your intelligent photography assistant helping you take better photos/,
			),
		).toBeTruthy();
	});

	it("displays setting descriptions", () => {
		const { getByText } = render(<SettingsScreen onBack={mockOnBack} />);

		expect(
			getByText("Automatically capture when conditions are perfect"),
		).toBeTruthy();
		expect(getByText("Vibrate when shot is ready and on capture")).toBeTruthy();
		expect(
			getByText("Help improve the app by sharing anonymous usage data"),
		).toBeTruthy();
	});

	it("displays correct initial haptic feedback state when enabled", () => {
		(settings.getHapticFeedbackEnabled as jest.Mock).mockReturnValue(true);

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("haptic-feedback-switch");
		expect(switchEl.props.value).toBe(true);
		expect(switchEl.props.accessibilityLabel).toBe("Haptic feedback enabled");
	});

	it("displays correct initial haptic feedback state when disabled", () => {
		(settings.getHapticFeedbackEnabled as jest.Mock).mockReturnValue(false);

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("haptic-feedback-switch");
		expect(switchEl.props.value).toBe(false);
		expect(switchEl.props.accessibilityLabel).toBe("Haptic feedback disabled");
	});

	it("toggles haptic feedback when switch is pressed (disabling)", () => {
		(settings.getHapticFeedbackEnabled as jest.Mock).mockReturnValue(true); // Start enabled

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("haptic-feedback-switch");
		fireEvent(switchEl, "valueChange", false);

		expect(settings.setHapticFeedbackEnabled).toHaveBeenCalledWith(false);
	});

	it("toggles haptic feedback when switch is pressed (enabling)", () => {
		(settings.getHapticFeedbackEnabled as jest.Mock).mockReturnValue(false); // Start disabled

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("haptic-feedback-switch");
		fireEvent(switchEl, "valueChange", true);

		expect(settings.setHapticFeedbackEnabled).toHaveBeenCalledWith(true);
	});

	it("displays score visibility setting", () => {
		const { getByText, getByTestId } = render(
			<SettingsScreen onBack={mockOnBack} />,
		);

		expect(getByText("Show readiness score")).toBeTruthy();
		expect(
			getByText("Display live shot-readiness score ring on camera screen"),
		).toBeTruthy();
		expect(getByTestId("score-visibility-switch")).toBeTruthy();
	});

	it("displays correct initial score visibility state when enabled", () => {
		(settings.getScoreVisibilityEnabled as jest.Mock).mockReturnValue(true);

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("score-visibility-switch");
		expect(switchEl.props.value).toBe(true);
		expect(switchEl.props.accessibilityLabel).toBe(
			"Show readiness score enabled",
		);
	});

	it("displays correct initial score visibility state when disabled", () => {
		(settings.getScoreVisibilityEnabled as jest.Mock).mockReturnValue(false);

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("score-visibility-switch");
		expect(switchEl.props.value).toBe(false);
		expect(switchEl.props.accessibilityLabel).toBe(
			"Show readiness score disabled",
		);
	});

	it("toggles score visibility when switch is pressed (disabling)", () => {
		(settings.getScoreVisibilityEnabled as jest.Mock).mockReturnValue(true); // Start enabled

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("score-visibility-switch");
		fireEvent(switchEl, "valueChange", false);

		expect(settings.setScoreVisibilityEnabled).toHaveBeenCalledWith(false);
	});

	it("toggles score visibility when switch is pressed (enabling)", () => {
		(settings.getScoreVisibilityEnabled as jest.Mock).mockReturnValue(false); // Start disabled

		const { getByTestId } = render(<SettingsScreen onBack={mockOnBack} />);

		const switchEl = getByTestId("score-visibility-switch");
		fireEvent(switchEl, "valueChange", true);

		expect(settings.setScoreVisibilityEnabled).toHaveBeenCalledWith(true);
	});
});
