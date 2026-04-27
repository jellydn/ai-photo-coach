/**
 * Countdown overlay component
 *
 * Displays animated 3-2-1 countdown with large numbers
 * and progress ring animation.
 */

import type React from "react";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { CountdownState } from "./types";

interface CountdownOverlayProps {
	/** Current countdown value (3, 2, 1) or null when not active */
	countdownValue: number | null;
	/** Current countdown state */
	state: CountdownState;
	/** Progress from 0 to 1 for ring animation */
	progress?: number;
	/** Test ID for testing */
	testID?: string;
}

/**
 * Animated countdown overlay with large numbers
 */
export function CountdownOverlay({
	countdownValue,
	state,
	progress = 1,
	testID,
}: CountdownOverlayProps): React.JSX.Element | null {
	// Animation values
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const opacityAnim = useRef(new Animated.Value(1)).current;

	// Animate on value change
	useEffect(() => {
		if (countdownValue !== null && state === "counting") {
			// Reset animations
			scaleAnim.setValue(0.5);
			opacityAnim.setValue(0);

			// Entrance animation
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					friction: 8,
					tension: 40,
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [countdownValue, state, scaleAnim, opacityAnim]);

	// Don't render when idle or completed
	if (state === "idle" || state === "completed" || countdownValue === null) {
		return null;
	}

	// Flash effect when capturing
	const isCapturing = state === "capturing";

	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="none" testID={testID}>
			{/* Dark overlay background */}
			<Animated.View
				style={[
					styles.overlay,
					{
						opacity: opacityAnim,
						backgroundColor: isCapturing
							? "rgba(255,255,255,0.3)"
							: "rgba(0,0,0,0.4)",
					},
				]}
			/>

			{/* Progress ring */}
			<View style={styles.centerContainer}>
				{/* Outer ring */}
				<View style={styles.ringContainer}>
					<Animated.View
						style={[
							styles.progressRing,
							{
								transform: [{ scale: scaleAnim }],
								opacity: opacityAnim,
							},
						]}
					>
						<View
							style={[
								styles.progressRingFill,
								{
									width: `${progress * 100}%`,
								},
							]}
						/>
					</Animated.View>

					{/* Countdown number */}
					<Animated.View
						style={[
							styles.numberContainer,
							{
								transform: [{ scale: scaleAnim }],
								opacity: opacityAnim,
							},
						]}
					>
						<Text style={styles.countdownNumber}>
							{isCapturing ? "✓" : countdownValue}
						</Text>
					</Animated.View>
				</View>

				{/* Label */}
				<Animated.Text
					style={[
						styles.label,
						{
							transform: [{ scale: scaleAnim }],
							opacity: opacityAnim,
						},
					]}
				>
					{isCapturing ? "Capturing..." : "Auto-capture in..."}
				</Animated.Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFill,
	},
	centerContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	ringContainer: {
		position: "relative",
		width: 160,
		height: 160,
		justifyContent: "center",
		alignItems: "center",
	},
	progressRing: {
		position: "absolute",
		width: 160,
		height: 160,
		borderRadius: 80,
		borderWidth: 6,
		borderColor: "rgba(255,255,255,0.3)",
		overflow: "hidden",
	},
	progressRingFill: {
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		backgroundColor: "#34C759",
	},
	numberContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: "#FFF",
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	countdownNumber: {
		fontSize: 64,
		fontWeight: "700",
		color: "#007AFF",
	},
	label: {
		marginTop: 24,
		fontSize: 18,
		fontWeight: "600",
		color: "#FFF",
		textShadowColor: "rgba(0,0,0,0.5)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 4,
	},
});
