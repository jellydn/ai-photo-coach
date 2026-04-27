import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Linking,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { check, PERMISSIONS, RESULTS, request } from "react-native-permissions";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, useCameraDevice } from "react-native-vision-camera";

type PermissionStatus = "checking" | "granted" | "denied" | "blocked" | "error";

export function CameraScreen(): React.JSX.Element {
	const [permissionStatus, setPermissionStatus] =
		useState<PermissionStatus>("checking");
	const device = useCameraDevice("back");

	const checkPermission = useCallback(async () => {
		try {
			const status = await check(
				PERMISSIONS.IOS.CAMERA || PERMISSIONS.ANDROID.CAMERA,
			);
			setPermissionStatus(
				status === RESULTS.GRANTED
					? "granted"
					: status === RESULTS.BLOCKED
						? "blocked"
						: "denied",
			);
		} catch {
			setPermissionStatus("error");
		}
	}, []);

	const requestPermission = useCallback(async () => {
		try {
			const result = await request(
				PERMISSIONS.IOS.CAMERA || PERMISSIONS.ANDROID.CAMERA,
			);
			setPermissionStatus(
				result === RESULTS.GRANTED
					? "granted"
					: result === RESULTS.BLOCKED
						? "blocked"
						: "denied",
			);
		} catch {
			setPermissionStatus("error");
		}
	}, []);

	const openSettings = useCallback(() => {
		Linking.openSettings();
	}, []);

	useEffect(() => {
		checkPermission();
	}, [checkPermission]);

	const renderPermissionContent = () => {
		switch (permissionStatus) {
			case "checking":
				return (
					<View style={styles.centerContainer}>
						<ActivityIndicator size="large" color="#007AFF" />
						<Text style={styles.statusText}>Checking camera access...</Text>
					</View>
				);

			case "denied":
				return (
					<View style={styles.centerContainer}>
						<Text style={styles.title}>Camera Access Needed</Text>
						<Text style={styles.description}>
							AI Photo Coach needs camera access to provide real-time
							composition guidance and help you take better photos.
						</Text>
						<TouchableOpacity
							style={styles.button}
							onPress={requestPermission}
							testID="grant-permission-button"
						>
							<Text style={styles.buttonText}>Grant Camera Access</Text>
						</TouchableOpacity>
					</View>
				);

			case "blocked":
				return (
					<View style={styles.centerContainer}>
						<Text style={styles.title}>Camera Access Blocked</Text>
						<Text style={styles.description}>
							Camera access was denied. Please enable it in your device settings
							to use AI Photo Coach.
						</Text>
						<TouchableOpacity
							style={styles.button}
							onPress={openSettings}
							testID="open-settings-button"
						>
							<Text style={styles.buttonText}>Open Settings</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.button, styles.secondaryButton]}
							onPress={checkPermission}
							testID="retry-button"
						>
							<Text style={styles.secondaryButtonText}>Try Again</Text>
						</TouchableOpacity>
					</View>
				);

			case "error":
				return (
					<View style={styles.centerContainer}>
						<Text style={styles.title}>Something Went Wrong</Text>
						<Text style={styles.description}>
							We couldn't check camera permissions. Please restart the app and
							try again.
						</Text>
						<TouchableOpacity
							style={styles.button}
							onPress={checkPermission}
							testID="retry-error-button"
						>
							<Text style={styles.buttonText}>Retry</Text>
						</TouchableOpacity>
					</View>
				);

			case "granted":
				if (!device) {
					return (
						<View style={styles.centerContainer}>
							<Text style={styles.title}>No Camera Found</Text>
							<Text style={styles.description}>
								Could not access your device's camera. Please check your device
								settings.
							</Text>
						</View>
					);
				}
				return (
					<View style={styles.cameraContainer}>
						<Camera style={styles.camera} device={device} isActive={true} />
						<View style={styles.overlay}>
							<Text style={styles.welcomeText}>
								AI Photo Coach Camera Preview
							</Text>
							<Text style={styles.hintText}>
								Camera is working! Future stories will add composition guides
								and coaching prompts here.
							</Text>
						</View>
					</View>
				);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			{renderPermissionContent()}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	centerContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 32,
		backgroundColor: "#F2F2F7",
	},
	cameraContainer: {
		flex: 1,
		position: "relative",
	},
	camera: {
		flex: 1,
	},
	overlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		padding: 20,
		backgroundColor: "rgba(0,0,0,0.4)",
	},
	title: {
		fontSize: 24,
		fontWeight: "600",
		color: "#000",
		marginBottom: 16,
		textAlign: "center",
	},
	description: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		marginBottom: 32,
		lineHeight: 24,
	},
	statusText: {
		fontSize: 16,
		color: "#666",
		marginTop: 16,
	},
	button: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 32,
		paddingVertical: 16,
		borderRadius: 12,
		marginBottom: 12,
		minWidth: 240,
		alignItems: "center",
	},
	secondaryButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
		borderColor: "#007AFF",
	},
	buttonText: {
		color: "#FFF",
		fontSize: 17,
		fontWeight: "600",
	},
	secondaryButtonText: {
		color: "#007AFF",
		fontSize: 17,
		fontWeight: "600",
	},
	welcomeText: {
		color: "#FFF",
		fontSize: 20,
		fontWeight: "600",
		textAlign: "center",
	},
	hintText: {
		color: "#FFF",
		fontSize: 14,
		textAlign: "center",
		marginTop: 8,
		opacity: 0.8,
	},
});
