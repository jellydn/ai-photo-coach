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
import { PromptPill, useCoaching } from "../coaching";
import { CompositionOverlay } from "../components/CompositionOverlay";
import { HorizonIndicator } from "../components/HorizonIndicator";
import { getModeMetadata } from "../config/modeMetadata";
import type { Mode } from "../config/modes";
import { getModeConfig } from "../config/modes";
import { FaceOverlay, useFaceDetection } from "../faceDetection";
import { useLighting } from "../lighting";
import { ScoreRing, useScoring } from "../scoring";
import { useHorizonLevel, useStability } from "../sensors";

interface CameraScreenProps {
	mode: Mode;
	onBack: () => void;
}

type PermissionStatus = "checking" | "granted" | "denied" | "blocked" | "error";

export function CameraScreen({
	mode,
	onBack,
}: CameraScreenProps): React.JSX.Element {
	const [permissionStatus, setPermissionStatus] =
		useState<PermissionStatus>("checking");
	const device = useCameraDevice("back");
	const modeMetadata = getModeMetadata(mode);
	const modeConfig = getModeConfig(mode);

	// Subscribe to horizon level sensor
	const { roll, isLevel } = useHorizonLevel({
		toleranceDeg: modeConfig.horizonToleranceDeg,
	});

	// Subscribe to stability detection (accelerometer + gyroscope)
	const { isStable } = useStability({
		threshold: modeConfig.stabilityThreshold,
	});

	// Face detection for portrait mode
	const { primaryFace, framingGuidance } = useFaceDetection({
		enabled: modeConfig.faceFraming,
		modeConfig,
	});

	// Lighting quality analysis
	const { prompt: lightingPrompt, lightingClass } = useLighting({
		enabled: modeConfig.lightingAnalysis,
		faceBounds: primaryFace?.bounds,
		thresholds: {
			tooDarkThreshold: modeConfig.lightingTooDarkThreshold,
			tooBrightThreshold: modeConfig.lightingTooBrightThreshold,
			shadowClipThreshold: 30,
			highlightClipThreshold: 25,
			backlitRatioThreshold: modeConfig.lightingBacklitThreshold,
			minFaceBrightnessDiff: 30,
		},
	});

	// Coaching prompt engine - integrates all signals with priority ordering
	const { prompt: coachingPrompt, isReady } = useCoaching({
		isStable,
		isLevel,
		framingGuidance,
		lightingClass,
		lightingPrompt,
		context: {
			faceFramingEnabled: modeConfig.faceFraming,
			lightingAnalysisEnabled: modeConfig.lightingAnalysis,
			compositionEnabled: modeConfig.showOverlays,
		},
	});

	// Shot-readiness scoring - live score at 10 Hz
	const {
		score,
		subScores,
		weakestSubscore,
		weakestSubscoreLabel,
		meetsThreshold,
		isBreakdownVisible,
		toggleBreakdown,
	} = useScoring({
		stability: 0.01, // Use actual stability value from useStability
		isStable,
		rollDeviation: Math.abs(roll),
		isLevel,
		framingGuidance,
		faceAreaPercent: primaryFace
			? calculateFaceAreaPercent(primaryFace.bounds)
			: 0,
		lightingClass,
		faceFramingEnabled: modeConfig.faceFraming,
		lightingAnalysisEnabled: modeConfig.lightingAnalysis,
		autoCaptureThreshold: modeConfig.autoCaptureScore,
	});

	// Helper to calculate face area percentage
	function calculateFaceAreaPercent(bounds: {
		width: number;
		height: number;
	}): number {
		return Math.round(bounds.width * bounds.height * 100);
	}

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
						<CompositionOverlay
							visible={modeConfig.showOverlays}
							testID="camera-composition-overlay"
						/>
						<FaceOverlay
							face={primaryFace}
							framingGuidance={framingGuidance}
							visible={modeConfig.faceFraming}
							testID="camera-face-overlay"
						/>
						<HorizonIndicator
							roll={roll}
							isLevel={isLevel}
							visible={modeConfig.showHorizon}
							testID="camera-horizon-indicator"
						/>
						<PromptPill
							prompt={coachingPrompt}
							isReady={isReady}
							testID="camera-prompt-pill"
						/>
						<ScoreRing
							score={score}
							subScores={subScores}
							weakestSubscore={weakestSubscore}
							weakestSubscoreLabel={weakestSubscoreLabel}
							meetsThreshold={meetsThreshold}
							isBreakdownVisible={isBreakdownVisible}
							onToggleBreakdown={toggleBreakdown}
							testID="camera-score-ring"
						/>
						<View style={styles.overlay}>
							<View style={styles.headerRow}>
								<TouchableOpacity
									style={styles.backButton}
									onPress={onBack}
									testID="back-button"
									accessibilityLabel="Go back to mode selection"
								>
									<Text style={styles.backButtonText}>← Back</Text>
								</TouchableOpacity>
								<View style={styles.modeBadge}>
									<Text style={styles.modeIcon}>{modeMetadata.icon}</Text>
									<Text style={styles.modeName}>{modeMetadata.title}</Text>
								</View>
							</View>
						</View>
						<View style={styles.bottomOverlay}>
							<View style={styles.scoreContainer}>
								<Text style={styles.scoreLabel}>Score: {score}/100</Text>
								{meetsThreshold && (
									<Text style={styles.readyBadge}>Ready ✓</Text>
								)}
							</View>
							<Text style={styles.hintText}>
								{isReady
									? "Perfect! Tap score ring for breakdown"
									: coachingPrompt || "Analyzing scene..."}
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
		padding: 16,
		backgroundColor: "rgba(0,0,0,0.4)",
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	backButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "rgba(0,0,0,0.5)",
		borderRadius: 8,
	},
	backButtonText: {
		color: "#FFF",
		fontSize: 16,
		fontWeight: "600",
	},
	modeBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.5)",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
	},
	modeIcon: {
		fontSize: 16,
		marginRight: 6,
	},
	modeName: {
		color: "#FFF",
		fontSize: 14,
		fontWeight: "600",
	},
	bottomOverlay: {
		position: "absolute",
		bottom: 0,
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
	hintText: {
		color: "#FFF",
		fontSize: 14,
		textAlign: "center",
		marginTop: 8,
		opacity: 0.8,
	},
	scoreContainer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 8,
	},
	scoreLabel: {
		color: "#FFF",
		fontSize: 16,
		fontWeight: "600",
		marginRight: 8,
	},
	readyBadge: {
		color: "#34C759",
		fontSize: 14,
		fontWeight: "700",
	},
});
