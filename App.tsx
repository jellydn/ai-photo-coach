/**
 * AI Photo Coach - Visual Guide Camera App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import type React from "react";
import { useCallback, useEffect, useState } from "react";
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
import { isOnboardingComplete } from "./src/storage/onboarding";

type AppScreen = "onboarding" | "modeSelector" | "camera" | "postCapture";

/**
 * Captured photo data for post-capture screen
 */
interface CapturedPhotoData {
	id: string;
	uri: string;
	subScores: SubScores;
	weakestSubscore: keyof SubScores;
}

function App(): React.JSX.Element {
	const isDarkMode = useColorScheme() === "dark";
	const [isLoading, setIsLoading] = useState(true);
	const [currentScreen, setCurrentScreen] = useState<AppScreen>("onboarding");
	const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
	const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhotoData | null>(
		null,
	);

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
		setSelectedMode(mode);
		setCurrentScreen("camera");
	}, []);

	const handleBackToModeSelector = useCallback(() => {
		setCurrentScreen("modeSelector");
		setSelectedMode(null);
	}, []);

	// Handle photo capture - navigate to post-capture screen
	const handlePhotoCaptured = useCallback(
		(
			photoId: string,
			uri: string,
			subScores: SubScores,
			weakestSubscore: keyof SubScores,
		) => {
			setCapturedPhoto({
				id: photoId,
				uri,
				subScores,
				weakestSubscore,
			});
			setCurrentScreen("postCapture");
		},
		[],
	);

	// Handle save - return to camera for next shot
	const handlePhotoSaved = useCallback(() => {
		setCapturedPhoto(null);
		setCurrentScreen("camera");
	}, []);

	// Handle discard - return to camera
	const handlePhotoDiscarded = useCallback(() => {
		setCapturedPhoto(null);
		setCurrentScreen("camera");
	}, []);

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
				/>
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
