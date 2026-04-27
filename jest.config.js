module.exports = {
	preset: "@react-native/jest-preset",
	setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
	moduleNameMapper: {
		"^react-native-permissions$":
			"<rootDir>/__mocks__/react-native-permissions.js",
		"^react-native-vision-camera$":
			"<rootDir>/__mocks__/react-native-vision-camera.js",
		"^react-native-safe-area-context$":
			"<rootDir>/__mocks__/react-native-safe-area-context.js",
		"^@react-native-async-storage/async-storage$":
			"<rootDir>/__mocks__/@react-native-async-storage/async-storage.js",
		"^react-native-sensors$": "<rootDir>/__mocks__/react-native-sensors.js",
		"^react-native-mmkv$": "<rootDir>/__mocks__/react-native-mmkv.ts",
		"^@react-native-camera-roll/camera-roll$":
			"<rootDir>/__mocks__/@react-native-camera-roll/camera-roll.ts",
		"^react-native-vision-camera-face-detector$":
			"<rootDir>/__mocks__/react-native-vision-camera-face-detector.ts",
		"^react-native-gesture-handler$":
			"<rootDir>/__mocks__/react-native-gesture-handler.ts",
		"^react-native-reanimated$":
			"<rootDir>/__mocks__/react-native-reanimated.js",
	},
	transformIgnorePatterns: [
		"node_modules/(?!(react-native|@react-native|react-native-.*|@react-native-.*)/)",
	],
};
