// Mock for react-native-sensors
export const accelerometer = {
	subscribe: jest.fn(() => ({
		unsubscribe: jest.fn(),
	})),
};

export const gyroscope = {
	subscribe: jest.fn(() => ({
		unsubscribe: jest.fn(),
	})),
};

export const magnetometer = {
	subscribe: jest.fn(() => ({
		unsubscribe: jest.fn(),
	})),
};

export const setUpdateIntervalForType = jest.fn();
export const SensorTypes = {
	accelerometer: "accelerometer",
	gyroscope: "gyroscope",
	magnetometer: "magnetometer",
	barometer: "barometer",
	orientation: "orientation",
	gravity: "gravity",
};
