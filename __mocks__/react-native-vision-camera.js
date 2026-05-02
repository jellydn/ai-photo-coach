// Mock for react-native-vision-camera v5 with Nitro modules

/**
 * @typedef {Object} PhotoFile
 * @property {string} filePath
 */

/**
 * @typedef {Object} FramePlane
 * @property {number} width
 * @property {number} height
 * @property {number} bytesPerRow
 * @property {boolean} isValid
 * @property {() => ArrayBuffer} getPixelBuffer
 */

/**
 * @typedef {Object} Frame
 * @property {number} width
 * @property {number} height
 * @property {string} pixelFormat
 * @property {number} timestamp
 * @property {string} orientation
 * @property {boolean} isValid
 * @property {number} bytesPerRow
 * @property {boolean} isPlanar
 * @property {boolean} isMirrored
 * @property {() => ArrayBuffer} getPixelBuffer
 * @property {() => FramePlane[]} getPlanes
 * @property {() => void} dispose
 */

/**
 * @typedef {Object} CameraDevice
 * @property {string} id
 * @property {string} position
 * @property {string} name
 */

/**
 * @typedef {Object} CameraOutput
 */

/**
 * @typedef {Object} CameraRef
 * @property {(point: { x: number, y: number }) => Promise<void>} focusTo
 */

/**
 * Create a mock frame for testing frame processors
 * @param {Partial<Frame>} [overrides]
 * @returns {Frame}
 */
export function createMockFrame(overrides = {}) {
	const width = overrides.width ?? 640;
	const height = overrides.height ?? 480;
	const pixelCount = width * height;

	// Create RGBA pixel data (4 bytes per pixel)
	const pixelData = new Uint8Array(pixelCount * 4);
	// Fill with neutral gray (128) as default
	for (let i = 0; i < pixelCount; i++) {
		pixelData[i * 4] = 128; // R
		pixelData[i * 4 + 1] = 128; // G
		pixelData[i * 4 + 2] = 128; // B
		pixelData[i * 4 + 3] = 255; // A
	}

	return {
		width,
		height,
		pixelFormat: "rgb",
		timestamp: Date.now(),
		orientation: "portrait",
		isValid: true,
		bytesPerRow: width * 4,
		isPlanar: false,
		isMirrored: false,
		getPixelBuffer: jest.fn(() => pixelData.buffer),
		getPlanes: jest.fn(() => []),
		dispose: jest.fn(),
		...overrides,
	};
}

/**
 * Mock Camera component
 * @type {React.FC<{
 *   device: CameraDevice,
 *   isActive: boolean,
 *   style?: unknown,
 *   ref?: React.Ref<CameraRef>,
 *   testID?: string,
 *   outputs?: CameraOutput[]
 * }>}
 */
export const Camera = jest.fn().mockImplementation(() => null);

/**
 * Mock useCameraDevice hook
 * @param {string} position
 * @returns {CameraDevice}
 */
export const useCameraDevice = jest.fn((position) => ({
	id: position === "back" ? "back" : "front",
	position: position,
	name: position === "back" ? "Back Camera" : "Front Camera",
}));

/**
 * Mock useCameraDevices hook
 * @returns {CameraDevice[]}
 */
export const useCameraDevices = jest.fn(() => []);

/**
 * Mock useCameraPermission hook
 * @returns {{ hasPermission: boolean, requestPermission: jest.Mock }}
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
 * Mock usePhotoOutput hook for VisionCamera v5
 * @returns {{
 *   capturePhotoToFile: jest.Mock<Promise<{ filePath: string }>>,
 *   supportsDepthDataDelivery: boolean,
 *   supportsCameraCalibrationDataDelivery: boolean
 * }}
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

/**
 * Mock useFrameOutput hook for VisionCamera v5
 * This replaces useFrameProcessor from v4
 * @param {Object} [_options]
 * @returns {Object}
 */
export const useFrameOutput = jest.fn((_options) => ({
	// Mock frame output object
	dispose: jest.fn(),
}));

export const useAsyncRunner = jest.fn(() => ({
	runAsync: jest.fn((callback) => {
		const result = callback();
		if (result && typeof result.then === "function") {
			// It's a Promise - suppress unused warning and return true for boolean checks
			// eslint-disable-next-line no-void
			void result;
			return true;
		}
		return result === undefined ? true : Boolean(result);
	}),
}));

// Default export
export default Camera;
