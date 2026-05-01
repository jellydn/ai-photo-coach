import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	Camera,
	useCameraDevice,
	type useFrameOutput,
	usePhotoOutput,
} from "react-native-vision-camera";
import { CountdownOverlay, useAutoCapture } from "../autoCapture";
import { PromptPill, useCoaching } from "../coaching";
import { CompositionOverlay } from "../components/CompositionOverlay";
import { HorizonIndicator } from "../components/HorizonIndicator";
import { getModeMetadata } from "../config/modeMetadata";
import type { Mode } from "../config/modes";
import { getModeConfig } from "../config/modes";
import {
	type DocumentSkewResult,
	detectDocumentSkew,
} from "../documentDetection";
import {
	useEdgeDetection,
	useEdgeDetectionFrameOutput,
} from "../edgeDetection";
import {
	computeGroupFramingAnalysis,
	FaceOverlay,
	GroupFaceOverlay,
	useFaceDetection,
} from "../faceDetection";
import { useHaptics } from "../haptics/useHaptics";
import { useLighting, useLightingFrameOutput } from "../lighting";
import { ScoreRing, useScoring } from "../scoring";
import type { SubScores } from "../scoring/types";
import { useHorizonLevel, usePitchDetection, useStability } from "../sensors";
import { useCameraPermission } from "../camera/useCameraPermission";
import { usePhotoCapture } from "../camera/usePhotoCapture";
import { useProductCentering } from "../camera/useProductCentering";
import {
	getAutoCaptureEnabled,
	getHapticFeedbackEnabled,
	getScoreVisibilityEnabled,
	setAutoCaptureEnabled,
	subscribeToSettings,
} from "../storage/settings";

interface CameraScreenProps {
	mode: Mode;
	onBack: () => void;
	onPhotoCaptured?: (
		photoId: string,
		uri: string,
		subScores: SubScores,
		weakestSubscore: keyof SubScores,
		isAutoCapture: boolean,
		burstId?: string,
		burstPhotos?: Array<{ id: string; uri: string }>,
	) => void;
	onSettings?: () => void;
}

export function CameraScreen({
	mode,
	onBack,
	onPhotoCaptured,
	onSettings,
}: CameraScreenProps): React.JSX.Element {
	const {
		status: permissionStatus,
		check: checkPermission,
		request: requestPermission,
		openSettings,
	} = useCameraPermission();
	const device = useCameraDevice("back");
	const modeMetadata = getModeMetadata(mode);
	const modeConfig = getModeConfig(mode);

	// VisionCamera v5 photo output for capturing photos
	const photoOutput = usePhotoOutput();

	// Auto-capture enabled state (persisted in MMKV)
	const [autoCaptureEnabled, setAutoCaptureEnabledState] = useState(() =>
		getAutoCaptureEnabled(),
	);

	// Haptic feedback enabled state (persisted in MMKV, default true)
	// Subscribe to changes from SettingsScreen
	const [_hapticEnabled, setHapticEnabled] = useState(() =>
		getHapticFeedbackEnabled(),
	);

	// Score visibility enabled state (persisted in MMKV, default true)
	// Subscribe to changes from SettingsScreen
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

	// Subscribe to horizon level sensor
	const { roll, isLevel } = useHorizonLevel({
		toleranceDeg: modeConfig.horizonToleranceDeg,
	});

	// Subscribe to stability detection (accelerometer + gyroscope)
	// Uses mode-specific stability window (1500ms for night mode, 500ms default)
	const { isStable, stabilityScore } = useStability({
		threshold: modeConfig.stabilityThreshold,
		windowMs: modeConfig.stabilityWindowMs,
	});

	// Mode detection - must be declared before hooks that depend on them
	const isFoodMode = mode === "food";
	const isGroupMode = mode === "group";
	const isProductMode = mode === "product";
	const isDocumentMode = mode === "document";
	const isPetKidsMode = mode === "pet_kids";
	const isNightMode = mode === "night";

	// Pitch detection for food mode flat-lay guidance
	const { pitch, isFlatLay } = usePitchDetection({
		enabled: isFoodMode,
		toleranceDeg: 15, // Prompt when deviating > 15° from -90°
	});

	// Pitch detection for document mode phone level guidance
	const { pitch: documentPitch } = usePitchDetection({
		enabled: isDocumentMode,
		toleranceDeg: 10, // Strict tolerance for document mode
	});

	// Generate phone level prompt for document mode
	// Target is straight down (90°), prompt when deviating > 10°
	const PHONE_LEVEL_TARGET = 90;
	const phoneLevelPrompt = isDocumentMode
		? Math.abs(documentPitch - PHONE_LEVEL_TARGET) > 10
			? "Hold phone level"
			: null
		: null;

	// Generate flat-lay prompt for food mode
	const flatLayPrompt = isFoodMode && !isFlatLay ? "Shoot from above" : null;

	// Generate centering prompt for food mode (placeholder for now)
	// TODO: Implement centering detection based on frame analysis
	const centeringPrompt = isFoodMode && isFlatLay ? "Center the dish" : null;

	// Face detection for portrait/group mode
	const {
		faces,
		primaryFace,
		framingGuidance,
		frameOutput: faceFrameOutput,
	} = useFaceDetection({
		enabled: modeConfig.faceFraming,
		modeConfig,
	});

	// Compute group framing analysis for group mode
	const groupAnalysis = isGroupMode
		? computeGroupFramingAnalysis(faces)
		: undefined;

	// Generate group framing prompt for group mode
	const groupFramingPrompt = isGroupMode
		? (groupAnalysis?.prompt ?? null)
		: null;

	// Lighting quality analysis - receives real frame data from frame processor
	const {
		prompt: lightingPrompt,
		lightingClass,
		meanLuminance,
		handleFrameStats,
	} = useLighting({
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

	// Frame output for lighting analysis - captures real camera frame data
	const { frameOutput: lightingFrameOutput } = useLightingFrameOutput({
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
		onLightingStats: handleFrameStats,
	});

	// Product mode centering guidance
	const {
		centroidX: productCentroidX,
		centroidY: productCentroidY,
		backgroundVariance: productBackgroundVariance,
		centeringPrompt: productCenteringPrompt,
		backgroundPrompt: productBackgroundPrompt,
	} = useProductCentering({
		enabled: isProductMode,
		isStable,
		lightingClass,
	});

	// Edge detection for Travel mode scenery framing - receives real frame data from frame processor
	const {
		prompt: edgeDetectionPrompt,
		frameStats,
		handleFrameStats: handleEdgeFrameStats,
	} = useEdgeDetection({
		enabled: modeConfig.edgeDetection,
	});

	// Document skew detection for document mode (reuses edge detection frame stats)
	const documentSkewResult: DocumentSkewResult | null = useMemo(() => {
		if (!isDocumentMode || !frameStats) {
			return null;
		}
		return detectDocumentSkew(frameStats);
	}, [isDocumentMode, frameStats]);

	// Document skew prompt
	const documentSkewPrompt = documentSkewResult?.prompt ?? null;

	// Frame output for edge detection - captures real camera frame data
	const { frameOutput: edgeDetectionFrameOutput } = useEdgeDetectionFrameOutput(
		{
			enabled: modeConfig.edgeDetection,
			onFrameStats: handleEdgeFrameStats,
		},
	);

	// Build camera outputs array (memoized to prevent re-renders)
	const cameraOutputs = useMemo(() => {
		const outputs: (
			| ReturnType<typeof usePhotoOutput>
			| ReturnType<typeof useFrameOutput>
		)[] = [photoOutput];
		if (faceFrameOutput) {
			outputs.push(faceFrameOutput);
		}
		if (lightingFrameOutput) {
			outputs.push(lightingFrameOutput);
		}
		if (edgeDetectionFrameOutput) {
			outputs.push(edgeDetectionFrameOutput);
		}
		return outputs;
	}, [
		photoOutput,
		faceFrameOutput,
		lightingFrameOutput,
		edgeDetectionFrameOutput,
	]);

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
		stability: stabilityScore,
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
		flatLayEnabled: isFoodMode,
		pitch,
		groupFramingEnabled: isGroupMode,
		faceCount: faces.length,
		totalFaceAreaPercent: groupAnalysis?.totalFaceAreaPercent ?? 0,
		edgeTouchingFaceCount: groupAnalysis?.edgeTouchingFaces.length ?? 0,
		centeringEnabled: isProductMode,
		subjectCentroidX: productCentroidX,
		subjectCentroidY: productCentroidY,
		backgroundVariance: productBackgroundVariance,
		documentSkewEnabled: isDocumentMode,
		documentSkewAngle: documentSkewResult?.skewAngle ?? 0,
		isDocumentFlat: documentSkewResult?.isFlat ?? true,
		petKidsModeEnabled: isPetKidsMode,
		nightModeEnabled: isNightMode,
		meanLuminance,
	});

	// Pet/Kids mode prompts (must be after useScoring to access score)
	const petKidsModePrompt = useMemo(() => {
		if (!isPetKidsMode) return null;
		// Suggest bracing when stability is borderline
		if (!isStable) {
			return "Brace your phone";
		}
		// Encourage waiting for good moment when conditions are good but not stable enough
		if (isStable && score >= 60 && score < modeConfig.autoCaptureScore) {
			return "Wait for it…";
		}
		return null;
	}, [isPetKidsMode, isStable, score, modeConfig.autoCaptureScore]);

	// Night Shot mode prompts (low-light specific)
	const nightModePrompt = useMemo(() => {
		if (!isNightMode) return null;
		// "Find brighter spot" when scene is too dark
		if (lightingClass === "too_dark") {
			return "Find brighter spot";
		}
		// "Hold very steady" when scene is dark but not extremely
		// Low-light stability is critical for night shots
		if (!isStable && lightingClass !== "good") {
			return "Hold very steady";
		}
		// "Brace your phone" when stability is borderline in low light
		if (isStable && score >= 50 && score < modeConfig.autoCaptureScore) {
			return "Brace your phone";
		}
		return null;
	}, [
		isNightMode,
		lightingClass,
		isStable,
		score,
		modeConfig.autoCaptureScore,
	]);

	// Coaching prompt engine - integrates all signals with priority ordering
	const { prompt: coachingPrompt, isReady } = useCoaching({
		isStable,
		isLevel,
		framingGuidance,
		lightingClass,
		lightingPrompt,
		edgeDetectionPrompt,
		flatLayPrompt,
		centeringPrompt: centeringPrompt ?? productCenteringPrompt,
		groupFramingPrompt,
		backgroundPrompt: productBackgroundPrompt,
		documentSkewPrompt,
		phoneLevelPrompt,
		petKidsModePrompt,
		nightModePrompt,
		context: {
			faceFramingEnabled: modeConfig.faceFraming,
			lightingAnalysisEnabled: modeConfig.lightingAnalysis,
			compositionEnabled: modeConfig.showOverlays,
			edgeDetectionEnabled: modeConfig.edgeDetection,
			flatLayEnabled: isFoodMode,
			centeringEnabled: isFoodMode || isProductMode,
			groupFramingEnabled: isGroupMode,
			documentSkewEnabled: isDocumentMode,
			petKidsModeEnabled: isPetKidsMode,
			nightModeEnabled: isNightMode,
		},
	});

	// Haptic feedback with reactive triggers
	const { triggerCapture } = useHaptics({
		enabled: _hapticEnabled,
		score,
		isStable,
		autoCaptureThreshold: modeConfig.autoCaptureScore,
	});

	// Auto-capture with countdown (burst mode for Pet/Kids)
	const {
		state: captureState,
		countdownValue,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		isCountingDown: _isCountingDown,
		triggerCapture: autoCaptureTrigger,
		cancelCountdown,
		isBurstMode,
		burstShotIndex,
		burstShotCount,
	} = useAutoCapture({
		enabled: autoCaptureEnabled,
		score,
		isStable,
		autoCaptureThreshold: modeConfig.autoCaptureScore,
		countdownDuration: modeConfig.countdownDuration, // Mode-specific countdown (5s for night mode)
		burstMode: isPetKidsMode, // Enable burst for Pet/Kids mode
		burstShotCount: 3, // 3-shot burst
		burstIntervalMs: 200, // 200ms between shots
	});

	// Photo capture hook - manages single and burst capture
	const {
		isCapturing,
		resetBurst,
		capturePhoto,
		isAutoCaptureRef,
	} = usePhotoCapture({
		photoOutput,
		mode,
		score,
		subScores,
		weakestSubscore,
		isBurstMode,
		burstShotCount,
		burstShotIndex,
		captureState,
		triggerCapture,
		onPhotoCaptured,
	});

	// Helper to calculate face area percentage
	function calculateFaceAreaPercent(bounds: {
		width: number;
		height: number;
	}): number {
		return Math.round(bounds.width * bounds.height * 100);
	}

	// Toggle auto-capture
	const toggleAutoCapture = useCallback(() => {
		const newValue = !autoCaptureEnabled;
		setAutoCaptureEnabledState(newValue);
		setAutoCaptureEnabled(newValue);
		if (!newValue) {
			cancelCountdown();
		}
	}, [autoCaptureEnabled, cancelCountdown]);

	// Manual shutter button handler
	const handleManualCapture = useCallback(() => {
		// Cancel any ongoing countdown
		cancelCountdown();
		// Mark as manual capture (not auto)
		isAutoCaptureRef.current = false;
		// Reset burst state if starting manual burst
		if (isBurstMode) {
			resetBurst();
			// Use auto-capture trigger to properly sequence burst shots
			autoCaptureTrigger();
		} else {
			// Single shot capture
			void capturePhoto(0);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cancelCountdown, capturePhoto, isBurstMode, autoCaptureTrigger, resetBurst]);

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
						<Camera
							style={styles.camera}
							device={device}
							isActive={true}
							outputs={cameraOutputs}
						/>
						<CompositionOverlay
							visible={modeConfig.showOverlays}
							testID="camera-composition-overlay"
						/>
						{isGroupMode ? (
							<GroupFaceOverlay
								faces={faces}
								groupAnalysis={groupAnalysis}
								visible={modeConfig.faceFraming}
								testID="camera-group-face-overlay"
							/>
						) : (
							<FaceOverlay
								face={primaryFace}
								framingGuidance={framingGuidance}
								visible={modeConfig.faceFraming}
								testID="camera-face-overlay"
							/>
						)}
						<HorizonIndicator
							roll={roll}
							isLevel={isLevel}
							visible={modeConfig.showHorizon}
							testID="camera-horizon-indicator"
						/>
						<CountdownOverlay
							countdownValue={countdownValue}
							state={captureState}
							progress={
								countdownValue
									? 1 - countdownValue / modeConfig.countdownDuration
									: 0
							}
							testID="camera-countdown-overlay"
						/>
						<PromptPill
							prompt={coachingPrompt}
							isReady={isReady}
							testID="camera-prompt-pill"
						/>
						{scoreVisible && (
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
						)}
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
								<View style={styles.headerControls}>
									<TouchableOpacity
										style={[
											styles.autoCaptureToggle,
											autoCaptureEnabled && styles.autoCaptureToggleActive,
										]}
										onPress={toggleAutoCapture}
										testID="auto-capture-toggle"
										accessibilityLabel={`Auto-capture ${autoCaptureEnabled ? "enabled" : "disabled"}`}
									>
										<Text style={styles.autoCaptureToggleText}>
											{autoCaptureEnabled ? "AUTO ON" : "AUTO OFF"}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.settingsButton}
										onPress={onSettings}
										testID="settings-button"
										accessibilityLabel="Open settings"
									>
										<Text style={styles.settingsButtonText}>⚙️</Text>
									</TouchableOpacity>
									<View style={styles.modeBadge}>
										<Text style={styles.modeIcon}>{modeMetadata.icon}</Text>
										<Text style={styles.modeName}>{modeMetadata.title}</Text>
									</View>
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
							{/* Manual shutter button */}
							<TouchableOpacity
								style={[
									styles.shutterButton,
									isCapturing && styles.shutterButtonCapturing,
								]}
								onPress={handleManualCapture}
								disabled={isCapturing}
								testID="shutter-button"
								accessibilityLabel="Capture photo"
							>
								<View
									style={[
										styles.shutterButtonInner,
										isCapturing && styles.shutterButtonInnerCapturing,
									]}
								/>
							</TouchableOpacity>
						</View>
					</View>
				);
		}
	};

	return (
		<SafeAreaView style={styles.container} testID="camera-screen">
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
	headerControls: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
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
	autoCaptureToggle: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: "rgba(0,0,0,0.5)",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.3)",
	},
	autoCaptureToggleActive: {
		backgroundColor: "rgba(52,199,89,0.3)",
		borderColor: "#34C759",
	},
	autoCaptureToggleText: {
		color: "#FFF",
		fontSize: 12,
		fontWeight: "600",
	},
	settingsButton: {
		paddingHorizontal: 8,
		paddingVertical: 6,
		backgroundColor: "rgba(0,0,0,0.5)",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.3)",
	},
	settingsButtonText: {
		fontSize: 14,
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
		paddingBottom: 40,
		backgroundColor: "rgba(0,0,0,0.4)",
		alignItems: "center",
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
		marginBottom: 20,
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
	shutterButton: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: "rgba(255,255,255,0.3)",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 4,
		borderColor: "#FFF",
	},
	shutterButtonCapturing: {
		opacity: 0.5,
	},
	shutterButtonInner: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "#FFF",
	},
	shutterButtonInnerCapturing: {
		backgroundColor: "#FF9500",
	},
});
