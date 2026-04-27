// Mock for react-native-sensors
export const accelerometer = {
	subscribe: jest.fn(() => ({
		remove: jest.fn(),
	})),
};

export const gyroscope = {
	subscribe: jest.fn(() => ({
		remove: jest.fn(),
	})),
};

export const magnetometer = {
	subscribe: jest.fn(() => ({
		remove: jest.fn(),
	})),
};

export const setUpdateIntervalForType = jest.fn();
export const SensorTypes = {
	Accelerometer: "accelerometer",
	Gyroscope: "gyroscope",
	Magnetometer: "magnetometer",
	Barometer: "barometer",
	Orientation: "orientation",
	Gravity: "gravity",
};
