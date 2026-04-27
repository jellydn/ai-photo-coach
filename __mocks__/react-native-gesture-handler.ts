/**
 * Mock for react-native-gesture-handler
 */

// Create a proper chainable gesture builder
const createGestureMock = () => {
	const gesture = {
		onUpdate: jest.fn(() => gesture),
		onEnd: jest.fn(() => gesture),
		onBegin: jest.fn(() => gesture),
		onFinalize: jest.fn(() => gesture),
		onChange: jest.fn(() => gesture),
		onTouchesDown: jest.fn(() => gesture),
		onTouchesMove: jest.fn(() => gesture),
		onTouchesUp: jest.fn(() => gesture),
		onTouchesCancelled: jest.fn(() => gesture),
		enableTrackballTwoFingerPan: jest.fn(() => gesture),
		disabledButtons: jest.fn(() => gesture),
		enabled: jest.fn(() => gesture),
		shouldCancelWhenOutside: jest.fn(() => gesture),
		shouldActivateOnStart: jest.fn(() => gesture),
		shouldRecognizeSimultaneouslyWithExternalGesture: jest.fn(() => gesture),
		waitFor: jest.fn(() => gesture),
		withRef: jest.fn(() => gesture),
		simultaneousWithExternalGesture: jest.fn(() => gesture),
		requireExternalGestureToFail: jest.fn(() => gesture),
		withTestId: jest.fn(() => gesture),
		withCallback: jest.fn(() => gesture),
		runOnJS: jest.fn(() => gesture),
		withDependencies: jest.fn(() => gesture),
	};
	return gesture;
};

export const Gesture = {
	Pan: () => createGestureMock(),
	Tap: () => createGestureMock(),
	LongPress: () => createGestureMock(),
	Rotation: () => createGestureMock(),
	Pinch: () => createGestureMock(),
	Fling: () => createGestureMock(),
	ForceTouch: () => createGestureMock(),
	Native: () => createGestureMock(),
	Manual: () => createGestureMock(),
	Race: () => createGestureMock(),
	Simultaneous: () => createGestureMock(),
	Exclusive: () => createGestureMock(),
};

// Mock GestureDetector as a simple wrapper
export const GestureDetector = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	return children;
};

// Gesture states
export const State = {
	UNDETERMINED: 0,
	FAILED: 1,
	BEGAN: 2,
	CANCELLED: 3,
	ACTIVE: 4,
	END: 5,
};

// Directions
export const Directions = {
	RIGHT: 1,
	LEFT: 2,
	UP: 4,
	DOWN: 8,
};

// Touch event types
export const TouchEventType = {
	TOUCHES_DOWN: 0,
	TOUCHES_MOVE: 1,
	TOUCHES_UP: 2,
	TOUCHES_CANCELLED: 3,
};

// RNGestureHandlerModule mock
export const RNGestureHandlerModule = {
	State,
	Directions,
	TouchEventType,
	attachGestureHandler: jest.fn(),
	createGestureHandler: jest.fn(),
	destroyGestureHandler: jest.fn(),
	updateGestureHandler: jest.fn(),
	getConstants: jest.fn(() => ({
		State,
		Directions,
		TouchEventType,
	})),
	install: jest.fn(),
	flushOperations: jest.fn(),
};

// Reanimated integration (if needed)
export const GestureHandlerRootView = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	return children;
};

export default RNGestureHandlerModule;
