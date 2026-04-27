// Mock for react-native-permissions
export const PERMISSIONS = {
	IOS: {
		CAMERA: "ios.permission.CAMERA",
	},
	ANDROID: {
		CAMERA: "android.permission.CAMERA",
	},
};

export const RESULTS = {
	UNAVAILABLE: "unavailable",
	DENIED: "denied",
	GRANTED: "granted",
	LIMITED: "limited",
	BLOCKED: "blocked",
};

export const check = jest.fn(() => Promise.resolve(RESULTS.GRANTED));
export const request = jest.fn(() => Promise.resolve(RESULTS.GRANTED));
export const requestMultiple = jest.fn(() => Promise.resolve({}));
export const checkMultiple = jest.fn(() => Promise.resolve({}));
