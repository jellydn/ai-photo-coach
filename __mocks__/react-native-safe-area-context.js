// Mock for react-native-safe-area-context
import { View } from "react-native";

export const SafeAreaProvider = ({ children }) => children;
export const SafeAreaView = View;
export const useSafeAreaInsets = jest.fn(() => ({
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
}));
export const useSafeAreaFrame = jest.fn(() => ({
	x: 0,
	y: 0,
	width: 390,
	height: 844,
}));
