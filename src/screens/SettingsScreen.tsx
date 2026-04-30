/**
 * Settings screen with telemetry opt-out toggle
 *
 * Allows users to control privacy settings including analytics/telemetry.
 */

import type React from "react";
import { useCallback, useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	getAutoCaptureEnabled,
	getHapticFeedbackEnabled,
	setAutoCaptureEnabled,
	setHapticFeedbackEnabled,
} from "../storage/settings";
import { isTelemetryOptedOut, setTelemetryOptOut } from "../telemetry";

interface SettingsScreenProps {
	onBack: () => void;
}

/**
 * Settings screen component
 */
export function SettingsScreen({
	onBack,
}: SettingsScreenProps): React.JSX.Element {
	// Auto-capture setting
	const [autoCaptureEnabled, setAutoCaptureEnabledState] = useState(() =>
		getAutoCaptureEnabled(),
	);

	// Telemetry opt-out setting
	const [telemetryOptedOut, setTelemetryOptedOutState] = useState(() =>
		isTelemetryOptedOut(),
	);

	// Haptic feedback setting
	const [hapticEnabled, setHapticEnabledState] = useState(() =>
		getHapticFeedbackEnabled(),
	);

	// Toggle auto-capture
	const toggleAutoCapture = useCallback(() => {
		const newValue = !autoCaptureEnabled;
		setAutoCaptureEnabledState(newValue);
		setAutoCaptureEnabled(newValue);
	}, [autoCaptureEnabled]);

	// Toggle telemetry opt-out
	const toggleTelemetry = useCallback(() => {
		const newValue = !telemetryOptedOut;
		setTelemetryOptedOutState(newValue);
		setTelemetryOptOut(newValue);
	}, [telemetryOptedOut]);

	// Toggle haptic feedback
	const toggleHaptic = useCallback(() => {
		const newValue = !hapticEnabled;
		setHapticEnabledState(newValue);
		setHapticFeedbackEnabled(newValue);
	}, [hapticEnabled]);

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={onBack}>
					<Text style={styles.backButtonText}>← Back</Text>
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Settings</Text>
				<View style={styles.headerSpacer} />
			</View>

			{/* Settings list */}
			<ScrollView style={styles.scrollView}>
				{/* Camera Settings Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Camera</Text>
					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingTitle}>Auto-capture</Text>
							<Text style={styles.settingDescription}>
								Automatically capture when conditions are perfect
							</Text>
						</View>
						<Switch
							value={autoCaptureEnabled}
							onValueChange={toggleAutoCapture}
							trackColor={{ false: "#767577", true: "#34C759" }}
							thumbColor={autoCaptureEnabled ? "#FFF" : "#F4F3F4"}
							testID="auto-capture-switch"
							accessibilityLabel={`Auto-capture ${autoCaptureEnabled ? "enabled" : "disabled"}`}
						/>
					</View>
					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingTitle}>Haptic feedback</Text>
							<Text style={styles.settingDescription}>
								Vibrate when shot is ready and on capture
							</Text>
						</View>
						<Switch
							value={hapticEnabled}
							onValueChange={toggleHaptic}
							trackColor={{ false: "#767577", true: "#34C759" }}
							thumbColor={hapticEnabled ? "#FFF" : "#F4F3F4"}
							testID="haptic-feedback-switch"
							accessibilityLabel={`Haptic feedback ${hapticEnabled ? "enabled" : "disabled"}`}
						/>
					</View>
				</View>

				{/* Privacy Settings Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Privacy</Text>
					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingTitle}>Analytics</Text>
							<Text style={styles.settingDescription}>
								Help improve the app by sharing anonymous usage data
							</Text>
							<Text style={styles.privacyNote}>
								No photos, personal data, or identifiers are collected.
							</Text>
						</View>
						<Switch
							value={!telemetryOptedOut}
							onValueChange={toggleTelemetry}
							trackColor={{ false: "#767577", true: "#34C759" }}
							thumbColor={!telemetryOptedOut ? "#FFF" : "#F4F3F4"}
							testID="analytics-switch"
							accessibilityLabel={`Analytics ${!telemetryOptedOut ? "enabled" : "disabled"}`}
						/>
					</View>
				</View>

				{/* About Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>About</Text>
					<View style={styles.aboutCard}>
						<Text style={styles.aboutTitle}>AI Photo Coach</Text>
						<Text style={styles.aboutVersion}>Version 1.0.0</Text>
						<Text style={styles.aboutDescription}>
							Your intelligent photography assistant helping you take better
							photos with real-time coaching and composition guidance.
						</Text>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F2F2F7",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "#FFF",
		borderBottomWidth: 1,
		borderBottomColor: "#E5E5EA",
	},
	backButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	backButtonText: {
		fontSize: 17,
		fontWeight: "400",
		color: "#007AFF",
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "600",
		color: "#000",
	},
	headerSpacer: {
		width: 60,
	},
	scrollView: {
		flex: 1,
	},
	section: {
		marginTop: 20,
		backgroundColor: "#FFF",
		paddingVertical: 8,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "600",
		color: "#8E8E93",
		textTransform: "uppercase",
		marginHorizontal: 16,
		marginBottom: 8,
		marginTop: 8,
	},
	settingRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#F2F2F7",
	},
	settingInfo: {
		flex: 1,
		marginRight: 16,
	},
	settingTitle: {
		fontSize: 17,
		fontWeight: "400",
		color: "#000",
		marginBottom: 4,
	},
	settingDescription: {
		fontSize: 13,
		color: "#8E8E93",
		lineHeight: 18,
	},
	privacyNote: {
		fontSize: 12,
		color: "#34C759",
		marginTop: 4,
		fontStyle: "italic",
	},
	aboutCard: {
		paddingHorizontal: 16,
		paddingVertical: 20,
	},
	aboutTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: "#000",
		marginBottom: 4,
	},
	aboutVersion: {
		fontSize: 15,
		color: "#8E8E93",
		marginBottom: 12,
	},
	aboutDescription: {
		fontSize: 15,
		color: "#3C3C43",
		lineHeight: 22,
	},
});
