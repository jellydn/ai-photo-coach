/**
 * Mock for react-native-worklets-core
 */

// Mock global worklets environment
if (typeof globalThis.runOnJS === "undefined") {
	globalThis.runOnJS = <T>(fn: () => T): T => fn();
}

// Mock worklet decorator
export function Worklet() {
	return (
		_target: unknown,
		_propertyKey: string,
		descriptor: PropertyDescriptor,
	) => descriptor;
}

// Mock createWorkletRuntime
export function createWorkletRuntime(_name: string, _initializer?: () => void) {
	return {
		name: "mock-runtime",
	};
}

// Mock runOnUI
export function runOnUI<T>(fn: () => T): () => T {
	return () => fn();
}

// Mock runOnJS
export function runOnJS<T>(fn: () => T): () => T {
	return () => fn();
}

// Mock makeShareableCloneRecursive
export function makeShareableCloneRecursive<T>(value: T): T {
	return value;
}

// Default export
export default {
	Worklet,
	createWorkletRuntime,
	runOnUI,
	runOnJS,
	makeShareableCloneRecursive,
};
