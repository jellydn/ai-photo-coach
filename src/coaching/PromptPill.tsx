/**
 * Prompt Pill UI Component
 * Displays coaching prompts at top-center with fade animation
 */

import type React from "react";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { PROMPT_FADE_DURATION_MS } from "./types";

export interface PromptPillProps {
	/** The prompt text to display (null = hidden) */
	prompt: string | null;
	/** Whether all conditions are satisfied (for success styling) */
	isReady?: boolean;
	/** Custom background color */
	backgroundColor?: string;
	/** Custom text color */
	textColor?: string;
	/** Test ID for testing */
	testID?: string;
}

/**
 * Prompt pill component that displays coaching prompts
 * - Positioned at top-center of screen
 * - Fades in/out with 200ms animation
 * - Shows ready state with green styling when all conditions satisfied
 */
export function PromptPill({
	prompt,
	isReady = false,
	backgroundColor,
	textColor,
	testID = "prompt-pill",
}: PromptPillProps): React.JSX.Element {
	// Animation value for opacity
	const fadeAnim = useRef(new Animated.Value(0)).current;

	// Handle fade in/out based on prompt presence
	useEffect(() => {
		if (prompt) {
			// Fade in
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: PROMPT_FADE_DURATION_MS,
				useNativeDriver: true,
			}).start();
		} else {
			// Fade out
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: PROMPT_FADE_DURATION_MS,
				useNativeDriver: true,
			}).start();
		}
	}, [prompt, fadeAnim]);

	// Determine colors based on state
	const bgColor = backgroundColor ?? (isReady ? "#34C759" : "rgba(0,0,0,0.7)");
	const txtColor = textColor ?? "#FFFFFF";

	return (
		<Animated.View
			style={[
				styles.container,
				{ opacity: fadeAnim, backgroundColor: bgColor },
			]}
			testID={testID}
			accessibilityRole="alert"
			accessibilityLabel={prompt || "No prompt"}
			accessibilityLiveRegion="polite"
		>
			<Text style={[styles.text, { color: txtColor }]}>{prompt || ""}</Text>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 80, // Below header, above horizon indicator
		left: "10%",
		right: "10%",
		alignSelf: "center",
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 25, // Between horizon (15) and header (20)
	},
	text: {
		fontSize: 16,
		fontWeight: "600",
		textAlign: "center",
	},
});
