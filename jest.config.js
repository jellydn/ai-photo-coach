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
	},
	transformIgnorePatterns: [
		"node_modules/(?!(react-native|@react-native|react-native-.*|@react-native-.*)/)",
	],
};
