// Mock for react-native-vision-camera
export const Camera = jest.fn(() => null);
export const useCameraDevice = jest.fn(() => ({
	id: "back",
	position: "back",
	name: "Back Camera",
}));
export const useCameraDevices = jest.fn(() => []);
export const useCameraPermission = jest.fn(() => ({
	hasPermission: true,
	requestPermission: jest.fn(),
}));
export const useCodeScanner = jest.fn();
export const useFrameProcessor = jest.fn();
