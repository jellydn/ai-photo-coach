/**
 * Mock for react-native-reanimated
 */

const React = require("react");
const { View } = require("react-native");

// Mock shared values
const useSharedValue = (initial) => ({
	value: initial,
});

// Mock animated styles
const useAnimatedStyle = () => ({
	transform: [{ translateX: 0 }],
	opacity: 1,
});

// Mock spring animation
const withSpring = (value) => value;
const withTiming = (value) => value;
const withDecay = (value) => value;
const withDelay = (delay, value) => value;
const withSequence = (...values) => values[values.length - 1];
const withRepeat = (value) => value;
const interpolate = (value, input, output) => value;
const interpolateColor = (value, input, output) => output[0];
const Extrapolate = { CLAMP: "clamp" };
const runOnJS = (fn) => fn;
const runOnUI = (fn) => fn;

// Mock Animated components
const createAnimatedComponent = (Component) => {
	return (props) => React.createElement(Component, props);
};

// Create Animated namespace
const Animated = {
	View: createAnimatedComponent(View),
	Text: createAnimatedComponent(View),
	Image: createAnimatedComponent(View),
	ScrollView: createAnimatedComponent(View),
	FlatList: createAnimatedComponent(View),
	createAnimatedComponent,
};

// Create the module exports object
const reanimated = {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	withDecay,
	withDelay,
	withSequence,
	withRepeat,
	interpolate,
	interpolateColor,
	Extrapolate,
	runOnJS,
	runOnUI,
	Animated,
};

// Default export (the Animated namespace)
reanimated.default = Animated;

module.exports = reanimated;
