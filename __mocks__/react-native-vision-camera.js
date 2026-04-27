// Mock for react-native-vision-camera

/**
 * Mock PhotoFile type matching VisionCamera's actual structure
 */
export interface PhotoFile {
	path: string;
	width: number;
	height: number;
	isRawPhoto: boolean;
	metadata?: Record<string, unknown>;
}

/**
 * Mock CameraProps type
 */
export interface CameraProps {
	device: CameraDevice;
	isActive: boolean;
	photo?: boolean;
	style?: unknown;
	ref?: React.Ref<CameraRef>;
	testID?: string;
}

/**
 * Mock Camera ref type with takePhoto method
 */
export interface CameraRef {
	takePhoto: (options?: { flash?: string }) => Promise<PhotoFile>;
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
