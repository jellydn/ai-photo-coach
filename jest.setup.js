// Jest setup file for additional configuration
/* global jest, beforeEach */
import { CameraRoll } from "@react-native-camera-roll/camera-roll";

// Global test timeout
jest.setTimeout(10000);

// Reset CameraRoll mocks before each test
beforeEach(() => {
	if (CameraRoll.__resetMocks) {
		CameraRoll.__resetMocks();
	}
});
