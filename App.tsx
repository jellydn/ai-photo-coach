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
import { CameraScreen } from "./src/screens/CameraScreen";
import { ModeSelectorScreen } from "./src/screens/ModeSelectorScreen";
import { OnboardingNavigator } from "./src/screens/onboarding/OnboardingNavigator";
import { isOnboardingComplete } from "./src/storage/onboarding";

type AppScreen = "onboarding" | "modeSelector" | "camera";

function App(): React.JSX.Element {
	const isDarkMode = useColorScheme() === "dark";
	const [isLoading, setIsLoading] = useState(true);
	const [currentScreen, setCurrentScreen] = useState<AppScreen>("onboarding");
	const [selectedMode, setSelectedMode] = useState<Mode | null>(null);

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
				<CameraScreen mode={selectedMode} onBack={handleBackToModeSelector} />
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
