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
import { CameraScreen } from "./src/screens/CameraScreen";
import { OnboardingNavigator } from "./src/screens/onboarding/OnboardingNavigator";
import { isOnboardingComplete } from "./src/storage/onboarding";

function App(): React.JSX.Element {
	const isDarkMode = useColorScheme() === "dark";
	const [isLoading, setIsLoading] = useState(true);
	const [showOnboarding, setShowOnboarding] = useState(false);

	useEffect(() => {
		const checkOnboarding = async () => {
			const completed = await isOnboardingComplete();
			setShowOnboarding(!completed);
			setIsLoading(false);
		};

		checkOnboarding();
	}, []);

	const handleOnboardingComplete = useCallback(() => {
		setShowOnboarding(false);
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
			{showOnboarding ? (
				<OnboardingNavigator onOnboardingComplete={handleOnboardingComplete} />
			) : (
				<CameraScreen />
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
