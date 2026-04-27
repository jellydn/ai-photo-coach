/**
 * AI Photo Coach - Visual Guide Camera App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import type React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CameraScreen } from "./src/screens/CameraScreen";

function App(): React.JSX.Element {
	const isDarkMode = useColorScheme() === "dark";

	return (
		<SafeAreaProvider>
			<StatusBar
				barStyle={isDarkMode ? "light-content" : "dark-content"}
				backgroundColor="#000"
			/>
			<CameraScreen />
		</SafeAreaProvider>
	);
}

export default App;
