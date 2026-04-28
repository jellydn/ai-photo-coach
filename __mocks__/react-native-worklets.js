// Mock for react-native-worklets
// This package provides worklet support for frame processors

// Worklet context - no-op in tests
export const runOnJS = (fn) => fn;
export const runOnUI = (fn) => fn;

// Worklet decorators
export const Worklet = () => {};
export const createWorklet = (fn) => fn;

// Shared values (basic mock)
export const makeMutable = (value) => ({ value });
export const makeRemote = (value) => value;

// Worklet runtime
export const Worklets = {
	default: {
		run: (fn) => fn(),
		runAsync: (fn) => Promise.resolve(fn()),
	},
};

// Default export
const worklets = {
	runOnJS: (fn) => fn,
	runOnUI: (fn) => fn,
	makeMutable: (value) => ({ value }),
};

export default worklets;
