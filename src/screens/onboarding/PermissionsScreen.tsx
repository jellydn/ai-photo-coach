import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Linking,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { check, PERMISSIONS, RESULTS, request } from "react-native-permissions";
import { SafeAreaView } from "react-native-safe-area-context";

interface PermissionsScreenProps {
	onComplete: () => void;
	onSkip: () => void;
	onBack: () => void;
}

type PermissionState =
	| "checking"
	| "pending"
	| "granted"
	| "denied"
	| "blocked";

interface PermissionStatuses {
	camera: PermissionState;
	photoLibrary: PermissionState;
	motion: PermissionState;
}

const PERMISSION_CONFIG = {
	camera: {
		ios: PERMISSIONS.IOS.CAMERA,
		android: PERMISSIONS.ANDROID.CAMERA,
		title: "Camera",
		description: "To capture photos and provide live guidance",
		icon: "📷",
	},
	photoLibrary: {
		ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
		android: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
		title: "Photo Library",
		description: "To save your captured photos",
		icon: "🖼️",
	},
	motion: {
		ios: PERMISSIONS.IOS.MOTION,
		android: null, // Android doesn't need explicit motion permission for sensors
		title: "Motion & Fitness",
		description: "To detect phone tilt and stability",
		icon: "📱",
		isIosOnly: true,
	},
};

export function PermissionsScreen({
	onComplete,
	onSkip,
	onBack,
}: PermissionsScreenProps): React.JSX.Element {
	const [statuses, setStatuses] = useState<PermissionStatuses>({
		camera: "checking",
		photoLibrary: "checking",
		motion: Platform.OS === "ios" ? "checking" : "granted", // Android doesn't need motion permission
	});
	const [isRequesting, setIsRequesting] = useState(false);

	const checkAllPermissions = useCallback(async () => {
		const newStatuses: Partial<PermissionStatuses> = {};

		// Check camera
		const cameraStatus = await check(
			Platform.OS === "ios"
				? PERMISSION_CONFIG.camera.ios
				: PERMISSION_CONFIG.camera.android,
		);
		newStatuses.camera =
			cameraStatus === RESULTS.GRANTED
				? "granted"
				: cameraStatus === RESULTS.BLOCKED
					? "blocked"
					: "denied";

		// Check photo library
		const photoStatus = await check(
			Platform.OS === "ios"
				? PERMISSION_CONFIG.photoLibrary.ios
				: PERMISSION_CONFIG.photoLibrary.android,
		);
		newStatuses.photoLibrary =
			photoStatus === RESULTS.GRANTED
				? "granted"
				: photoStatus === RESULTS.BLOCKED
					? "blocked"
					: "denied";

		// Check motion (iOS only)
		if (Platform.OS === "ios") {
			const motionStatus = await check(PERMISSION_CONFIG.motion.ios);
			newStatuses.motion =
				motionStatus === RESULTS.GRANTED
					? "granted"
					: motionStatus === RESULTS.BLOCKED
						? "blocked"
						: "denied";
		}

		setStatuses((prev) => ({ ...prev, ...newStatuses }));
	}, []);

	useEffect(() => {
		checkAllPermissions();
	}, [checkAllPermissions]);

	const requestPermission = useCallback(
		async (type: keyof PermissionStatuses) => {
			setIsRequesting(true);

			const config = PERMISSION_CONFIG[type];
			const permission = Platform.OS === "ios" ? config.ios : config.android;

			if (!permission) {
				// Android motion doesn't need permission
				setStatuses((prev) => ({ ...prev, [type]: "granted" }));
				setIsRequesting(false);
				return;
			}

			try {
				const result = await request(permission);
				setStatuses((prev) => ({
					...prev,
					[type]:
						result === RESULTS.GRANTED
							? "granted"
							: result === RESULTS.BLOCKED
								? "blocked"
								: "denied",
				}));
			} finally {
				setIsRequesting(false);
			}
		},
		[],
	);

	const openSettings = useCallback(() => {
		Linking.openSettings();
	}, []);

	const allGranted =
		statuses.camera === "granted" &&
		statuses.photoLibrary === "granted" &&
		statuses.motion === "granted";

	const renderPermissionItem = (key: keyof PermissionStatuses) => {
		const config = PERMISSION_CONFIG[key];
		const status = statuses[key];

		if (key === "motion" && Platform.OS !== "ios") {
			return null;
		}

		return (
			<View key={key} style={styles.permissionItem}>
				<View style={styles.permissionIconContainer}>
					<Text style={styles.permissionIcon}>{config.icon}</Text>
				</View>
				<View style={styles.permissionInfo}>
					<Text style={styles.permissionTitle}>{config.title}</Text>
					<Text style={styles.permissionDescription}>{config.description}</Text>
				</View>
				{status === "checking" ? (
					<ActivityIndicator size="small" color="#007AFF" />
				) : status === "granted" ? (
					<Text style={styles.grantedIcon}>✓</Text>
				) : status === "blocked" ? (
					<TouchableOpacity
						style={styles.settingsButton}
						onPress={openSettings}
					>
						<Text style={styles.settingsButtonText}>Settings</Text>
					</TouchableOpacity>
				) : (
					<TouchableOpacity
						style={[
							styles.grantButton,
							isRequesting && styles.grantButtonDisabled,
						]}
						onPress={() => requestPermission(key)}
						disabled={isRequesting}
					>
						<Text style={styles.grantButtonText}>Grant</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.stepIndicator}>Step 3 of 3</Text>

				<Text style={styles.title}>Enable Permissions</Text>

				<Text style={styles.description}>
					AI Photo Coach needs a few permissions to provide real-time coaching
					and save your photos.
				</Text>

				<View style={styles.permissionsList}>
					{renderPermissionItem("camera")}
					{renderPermissionItem("photoLibrary")}
					{renderPermissionItem("motion")}
				</View>

				{allGranted && (
					<View style={styles.readyBanner}>
						<Text style={styles.readyText}>
							✓ All permissions granted! Ready to go.
						</Text>
					</View>
				)}
			</View>

			<View style={styles.footer}>
				<TouchableOpacity style={styles.skipButton} onPress={onSkip}>
					<Text style={styles.skipText}>Skip</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.backButton} onPress={onBack}>
					<Text style={styles.backText}>Back</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.nextButton, !allGranted && styles.nextButtonDisabled]}
					onPress={onComplete}
					disabled={!allGranted}
					testID="complete-onboarding-button"
				>
					<Text style={styles.nextText}>
						{allGranted ? "Get Started" : "Grant Permissions"}
					</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	content: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 20,
	},
	stepIndicator: {
		fontSize: 14,
		color: "#666",
		marginBottom: 16,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	title: {
		fontSize: 28,
		fontWeight: "700",
		color: "#FFF",
		marginBottom: 12,
	},
	description: {
		fontSize: 16,
		color: "#999",
		lineHeight: 24,
		marginBottom: 32,
	},
	permissionsList: {
		gap: 12,
	},
	permissionItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#1C1C1E",
		padding: 16,
		borderRadius: 12,
	},
	permissionIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 12,
		backgroundColor: "#2C2C2E",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	permissionIcon: {
		fontSize: 24,
	},
	permissionInfo: {
		flex: 1,
	},
	permissionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#FFF",
		marginBottom: 4,
	},
	permissionDescription: {
		fontSize: 13,
		color: "#999",
	},
	grantButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
	},
	grantButtonDisabled: {
		opacity: 0.5,
	},
	grantButtonText: {
		color: "#FFF",
		fontSize: 14,
		fontWeight: "600",
	},
	settingsButton: {
		backgroundColor: "#333",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
	},
	settingsButtonText: {
		color: "#FFF",
		fontSize: 14,
		fontWeight: "600",
	},
	grantedIcon: {
		fontSize: 20,
		color: "#34C759",
		fontWeight: "700",
	},
	readyBanner: {
		marginTop: 24,
		backgroundColor: "#1C3A1C",
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#34C759",
	},
	readyText: {
		color: "#34C759",
		fontSize: 14,
		fontWeight: "600",
		textAlign: "center",
	},
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 24,
		paddingBottom: 32,
		paddingTop: 16,
	},
	skipButton: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	skipText: {
		color: "#999",
		fontSize: 16,
		fontWeight: "500",
	},
	backButton: {
		paddingHorizontal: 20,
		paddingVertical: 12,
	},
	backText: {
		color: "#999",
		fontSize: 16,
		fontWeight: "500",
	},
	nextButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 12,
	},
	nextButtonDisabled: {
		backgroundColor: "#333",
	},
	nextText: {
		color: "#FFF",
		fontSize: 17,
		fontWeight: "600",
	},
});
