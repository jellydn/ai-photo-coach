/**
 * useCameraSettings Hook
 *
 * Owns the persisted camera screen settings (auto-capture, haptic
 * feedback, score visibility) and their subscriptions to SettingsScreen
 * changes. Extracted from CameraScreen so the orchestrator only wires
 * camera concerns - settings plumbing lives here, behind one interface.
 */

import { useCallback, useEffect, useState } from "react";
import {
	getAutoCaptureEnabled,
	getHapticFeedbackEnabled,
	getScoreVisibilityEnabled,
	setAutoCaptureEnabled as persistAutoCaptureEnabled,
	subscribeToSettings,
} from "../storage/settings";

export interface UseCameraSettingsResult {
	/** Auto-capture enabled state (persisted in MMKV) */
	autoCaptureEnabled: boolean;
	/** Persist a new auto-capture state */
	setAutoCaptureEnabled: (enabled: boolean) => void;
	/** Haptic feedback enabled state (persisted in MMKV) */
	hapticEnabled: boolean;
	/** Score visibility enabled state (persisted in MMKV) */
	scoreVisible: boolean;
}

/**
 * React hook for persisted camera screen settings.
 * Keeps local state in sync with SettingsScreen edits via subscriptions.
 */
export function useCameraSettings(): UseCameraSettingsResult {
	// Auto-capture enabled state (persisted in MMKV)
	const [autoCaptureEnabled, setAutoCaptureEnabledState] = useState(() =>
		getAutoCaptureEnabled(),
	);

	// Haptic feedback enabled state (persisted in MMKV, default true)
	const [hapticEnabled, setHapticEnabled] = useState(() =>
		getHapticFeedbackEnabled(),
	);

	// Score visibility enabled state (persisted in MMKV, default true)
	const [scoreVisible, setScoreVisible] = useState(() =>
		getScoreVisibilityEnabled(),
	);

	// Subscribe to settings changes to update state when SettingsScreen modifies them
	useEffect(() => {
		const unsubscribeHaptic = subscribeToSettings("hapticFeedbackChanged", () =>
			setHapticEnabled(getHapticFeedbackEnabled()),
		);
		const unsubscribeScoreVisible = subscribeToSettings(
			"scoreVisibilityChanged",
			() => setScoreVisible(getScoreVisibilityEnabled()),
		);

		return () => {
			unsubscribeHaptic();
			unsubscribeScoreVisible();
		};
	}, []);

	/** Persist auto-capture state locally and to MMKV */
	const setAutoCaptureEnabled = useCallback((enabled: boolean) => {
		setAutoCaptureEnabledState(enabled);
		persistAutoCaptureEnabled(enabled);
	}, []);

	return {
		autoCaptureEnabled,
		setAutoCaptureEnabled,
		hapticEnabled,
		scoreVisible,
	};
}
