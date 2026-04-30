/**
 * AI Photo Coach - Visual Guide Camera App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	StatusBar,
	StyleSheet,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Mode } from "./src/config/modes";
import type { SubScores } from "./src/scoring/types";
import { CameraScreen } from "./src/screens/CameraScreen";
import { ModeSelectorScreen } from "./src/screens/ModeSelectorScreen";
import { OnboardingNavigator } from "./src/screens/onboarding/OnboardingNavigator";
import { PostCaptureScreen } from "./src/screens/PostCaptureScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { isOnboardingComplete } from "./src/storage/onboarding";
import { telemetry } from "./src/telemetry";

type AppScreen =
	| "onboarding"
	| "modeSelector"
	| "camera"
	| "postCapture"
	| "settings";

/**
 * Single captured burst photo
 */
interface BurstPhoto {
	id: string;
	uri: string;
}

/**
 * Captured photo data for post-capture screen
 * Supports both single capture and burst mode (Pet/Kids)
 */
interface CapturedPhotoData {
	id: string;
	uri: string;
	subScores: SubScores;
	weakestSubscore: keyof SubScores;
	/** Burst mode data - multiple photos from burst capture */
	burstPhotos?: BurstPhoto[];
	/** Burst ID for grouping related photos */
	burstId?: string;
	/** Index of currently selected burst photo */
	selectedBurstIndex?: number;
}

function App(): React.JSX.Element {
	const isDarkMode = useColorScheme() === "dark";
	const [isLoading, setIsLoading] = useState(true);
	const [currentScreen, setCurrentScreen] = useState<AppScreen>("onboarding");
	const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
	const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhotoData | null>(
		null,
	);
	// Track session start time for duration calculation
	const sessionStartTimeRef = useRef<number | null>(null);

	useEffect(() => {
		const checkOnboarding = async () => {
			const completed = await isOnboardingComplete();
			setCurrentScreen(completed ? "modeSelector" : "onboarding");
			setIsLoading(false);
		};

		checkOnboarding();
	}, []);

	const handleOnboardingComplete = useCallback(() => {
		setCurrentScreen("modeSelector");
	}, []);

	const handleModeSelected = useCallback((mode: Mode) => {
		// Track mode selection
		telemetry.track("mode_selected", { mode });
		setSelectedMode(mode);
		setCurrentScreen("camera");
	}, []);

	const handleBackToModeSelector = useCallback(() => {
		// Track session end when leaving camera
		if (sessionStartTimeRef.current && selectedMode) {
			const durationMs = Date.now() - sessionStartTimeRef.current;
			telemetry.track("session_ended", {
				mode: selectedMode,
				durationMs,
			});
			sessionStartTimeRef.current = null;
		}
		setCurrentScreen("modeSelector");
		setSelectedMode(null);
	}, [selectedMode]);

	// Handle photo capture - navigate to post-capture screen
	// Supports both single capture and burst mode (Pet/Kids)
	const handlePhotoCaptured = useCallback(
		(
			photoId: string,
			uri: string,
			subScores: SubScores,
			weakestSubscore: keyof SubScores,
			isAutoCapture: boolean,
			burstId?: string,
			burstPhotos?: Array<{ id: string; uri: string }>,
		) => {
			// Track shot captured (auto or manual)
			// In burst mode, track the burst as one event
			telemetry.trackIf(!isAutoCapture, "shot_captured", {
				mode: selectedMode ?? "unknown",
				score: subScores.aesthetic,
				isBurst: !!burstId,
				burstCount: burstPhotos?.length ?? 1,
			});
			telemetry.trackIf(isAutoCapture, "auto_captured", {
				mode: selectedMode ?? "unknown",
				score: subScores.aesthetic,
				isBurst: !!burstId,
				burstCount: burstPhotos?.length ?? 1,
			});
			setCapturedPhoto({
				id: photoId,
				uri,
				subScores,
				weakestSubscore,
				burstPhotos,
				burstId,
				selectedBurstIndex: 0,
			});
			setCurrentScreen("postCapture");
		},
		[selectedMode],
	);

	// Handle save - return to camera for next shot
	const handlePhotoSaved = useCallback(() => {
		setCapturedPhoto(null);
		setCurrentScreen("camera");
	}, []);

	// Handle discard - return to camera
	const handlePhotoDiscarded = useCallback(() => {
		// Track shot discarded
		if (capturedPhoto) {
			telemetry.track("shot_discarded", {
				mode: selectedMode ?? "unknown",
				score: capturedPhoto.subScores.aesthetic,
			});
		}
		setCapturedPhoto(null);
		setCurrentScreen("camera");
	}, [capturedPhoto, selectedMode]);

	// Handle settings navigation
	const handleSettings = useCallback(() => {
		// Track session end when leaving camera for settings
		if (sessionStartTimeRef.current && selectedMode) {
			const durationMs = Date.now() - sessionStartTimeRef.current;
			telemetry.track("session_ended", {
				mode: selectedMode,
				durationMs,
			});
			sessionStartTimeRef.current = null;
		}
		setCurrentScreen("settings");
	}, [selectedMode]);

	// Handle back from settings to camera
	const handleBackFromSettings = useCallback(() => {
		// Track session start when returning to camera
		if (selectedMode) {
			sessionStartTimeRef.current = Date.now();
			telemetry.track("session_started", { mode: selectedMode });
		}
		setCurrentScreen("camera");
	}, [selectedMode]);

	// Track session start when entering camera screen
	useEffect(() => {
		if (currentScreen === "camera" && selectedMode) {
			sessionStartTimeRef.current = Date.now();
			telemetry.track("session_started", { mode: selectedMode });
		}
	}, [currentScreen, selectedMode]);

	if (isLoading) {
		return (
			<SafeAreaProvider>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007AFF" />
				</View>
			</SafeAreaProvider>
		);
	}

	return (
		<SafeAreaProvider>
			<StatusBar
				barStyle={isDarkMode ? "light-content" : "dark-content"}
				backgroundColor="#000"
			/>
			{currentScreen === "onboarding" && (
				<OnboardingNavigator onOnboardingComplete={handleOnboardingComplete} />
			)}
			{currentScreen === "modeSelector" && (
				<ModeSelectorScreen onModeSelected={handleModeSelected} />
			)}
			{currentScreen === "camera" && selectedMode && (
				<CameraScreen
					mode={selectedMode}
					onBack={handleBackToModeSelector}
					onPhotoCaptured={handlePhotoCaptured}
					onSettings={handleSettings}
				/>
			)}
			{currentScreen === "postCapture" && capturedPhoto && (
				<PostCaptureScreen
					photoId={capturedPhoto.id}
					photoUri={capturedPhoto.uri}
					subScores={capturedPhoto.subScores}
					weakestSubscore={capturedPhoto.weakestSubscore}
					onSave={handlePhotoSaved}
					onDiscard={handlePhotoDiscarded}
					burstPhotos={capturedPhoto.burstPhotos}
					_burstId={capturedPhoto.burstId}
					selectedBurstIndex={capturedPhoto.selectedBurstIndex}
				/>
			)}
			{currentScreen === "settings" && (
				<SettingsScreen onBack={handleBackFromSettings} />
			)}
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
	},
});

export default App;
