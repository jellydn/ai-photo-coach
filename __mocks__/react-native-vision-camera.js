// Mock for react-native-vision-camera

/**
 * Mock PhotoFile type matching VisionCamera v5 structure
 */
export interface PhotoFile {
	filePath: string;
}

/**
 * Mock CameraProps type for VisionCamera v5
 */
export interface CameraProps {
	device: CameraDevice;
	isActive: boolean;
	style?: unknown;
	ref?: React.Ref<CameraRef>;
	testID?: string;
	outputs?: CameraOutput[];
}

/**
 * Mock CameraOutput type
 */
export interface CameraOutput {
	capturePhotoToFile: (
		settings: { flashMode?: string },
		callbacks: unknown,
	) => Promise<PhotoFile>;
}

/**
 * Mock Camera ref type for VisionCamera v5
 */
export interface CameraRef {
	focusTo: (point: { x: number; y: number }) => Promise<void>;
}

/**
 * Mock Camera component
 */
export const Camera: React.FC<CameraProps> = jest.fn().mockImplementation(() => null);

/**
 * Mock useCameraDevice hook
 */
export const useCameraDevice = jest.fn((position: string) => ({
	id: position === "back" ? "back" : "front",
	position: position,
	name: position === "back" ? "Back Camera" : "Front Camera",
}));

/**
 * Mock useCameraDevices hook
 */
export const useCameraDevices = jest.fn(() => []);

/**
 * Mock useCameraPermission hook
 */
export const useCameraPermission = jest.fn(() => ({
	hasPermission: true,
	requestPermission: jest.fn(),
}));

/**
 * Mock useCodeScanner hook
 */
export const useCodeScanner = jest.fn();

/**
 * Mock useFrameProcessor hook
 */
export const useFrameProcessor = jest.fn();

/**
 * Mock usePhotoOutput hook for VisionCamera v5
 */
export const usePhotoOutput = jest.fn(() => ({
	capturePhotoToFile: jest.fn(() =>
		Promise.resolve({
			filePath: "/mock/path/photo.jpg",
		}),
	),
	supportsDepthDataDelivery: false,
	supportsCameraCalibrationDataDelivery: false,
}));

// Type exports for TypeScript
type CameraDevice = {
	id: string;
	position: "back" | "front";
	name: string;
};

export type { CameraDevice };
export type { CameraRef };

// Default export
export default Camera;
