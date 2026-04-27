/**
 * Score Ring UI Component
 * Visual ring meter showing shot-readiness score
 * - Positioned at top-right
 * - Color coding: red < 50, yellow 50-79, green >= 80
 * - Tap to show breakdown of weakest subscore
 */

import type React from "react";
import { useEffect, useRef } from "react";
import {
	Animated,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import type { ScoreResult } from "./types";
import { getScoreColor, SCORE_THRESHOLDS } from "./types";

export interface ScoreRingProps {
	/** Current score (0-100) */
	score: number;
	/** Individual subscores for breakdown */
	subScores: ScoreResult["subScores"];
	/** Which subscore is weakest */
	weakestSubscore: keyof ScoreResult["subScores"];
	/** Label for weakest subscore (shown in hint text) */
	weakestSubscoreLabel: string;
	/** Whether score meets auto-capture threshold */
	meetsThreshold: boolean;
	/** Whether breakdown view is visible */
	isBreakdownVisible: boolean;
	/** Callback when ring is tapped */
	onToggleBreakdown: () => void;
	/** Size of the ring in pixels (default 60) */
	size?: number;
	/** Test ID for testing */
	testID?: string;
}

/**
 * Score ring component with circular progress indicator
 * Shows shot-readiness score with color-coded ring
 */
export function ScoreRing({
	score,
	subScores,
	weakestSubscore,
	weakestSubscoreLabel: _weakestSubscoreLabel, // Used by parent for hint text
	meetsThreshold,
	isBreakdownVisible,
	onToggleBreakdown,
	size = 60,
	testID = "score-ring",
}: ScoreRingProps): React.JSX.Element {
	// Animation value for smooth score transitions
	const animatedScore = useRef(new Animated.Value(score)).current;

	// Animate score changes
	useEffect(() => {
		Animated.spring(animatedScore, {
			toValue: score,
			useNativeDriver: true,
			friction: 8,
			tension: 40,
		}).start();
	}, [score, animatedScore]);

	// Get color based on score thresholds
	const ringColor = getScoreColor(score);
	const bgColor = meetsThreshold
		? "rgba(52, 199, 89, 0.2)"
		: score < SCORE_THRESHOLDS.POOR
			? "rgba(255, 59, 48, 0.2)"
			: "rgba(255, 204, 0, 0.2)";

	// Calculate progress percentage
	const progress = score / 100;

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={onToggleBreakdown}
			testID={testID}
			accessibilityLabel={`Score ${score} out of 100. Tap for breakdown.`}
			accessibilityRole="button"
			accessibilityState={{ expanded: isBreakdownVisible }}
		>
			<View
				style={[
					styles.ringContainer,
					{
						width: size,
						height: size,
						backgroundColor: bgColor,
						borderRadius: size / 2,
						borderWidth: 4,
						borderColor: ringColor,
					},
				]}
			>
				{/* Progress arc - simulated with a partial border or overlay */}
				<View
					style={[
						styles.progressOverlay,
						{
							width: size - 8,
							height: size - 8,
							borderRadius: (size - 8) / 2,
							borderWidth: 3,
							borderColor: ringColor,
							opacity: progress,
						},
					]}
				/>

				{/* Score text */}
				<View style={styles.scoreTextContainer}>
					<Animated.Text
						style={[
							styles.scoreText,
							{ color: ringColor, fontSize: size * 0.35 },
						]}
					>
						{score}
					</Animated.Text>
				</View>
			</View>

			{/* Breakdown view */}
			{isBreakdownVisible && (
				<View style={styles.breakdownContainer} testID={`${testID}-breakdown`}>
					<Text style={styles.breakdownTitle}>Score Breakdown</Text>

					{Object.entries(subScores).map(([key, value]) => {
						const isWeakest = key === weakestSubscore;
						const itemColor = getScoreColor(value);

						return (
							<View key={key} style={styles.breakdownItem}>
								<Text
									style={[
										styles.breakdownLabel,
										isWeakest && styles.weakestLabel,
									]}
								>
									{key === "stability" && "🎯 Stability"}
									{key === "level" && "📐 Level"}
									{key === "framing" && "👤 Framing"}
									{key === "lighting" && "💡 Lighting"}
									{key === "aesthetic" && "✨ Aesthetic"}
									{isWeakest && " (weakest)"}
								</Text>
								<Text
									style={[
										styles.breakdownValue,
										{ color: itemColor },
										isWeakest && styles.weakestValue,
									]}
								>
									{value}
								</Text>
							</View>
						);
					})}

					<Text style={styles.breakdownHint}>
						{weakestSubscore === "stability" &&
							"Try holding the phone steadier"}
						{weakestSubscore === "level" && "Tilt phone to straighten horizon"}
						{weakestSubscore === "framing" && "Adjust distance to subject"}
						{weakestSubscore === "lighting" && "Move to better lighting"}
						{weakestSubscore === "aesthetic" && "Aesthetic model unavailable"}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 70,
		right: 16,
		zIndex: 30, // Above header (20) and prompt pill (25)
		alignItems: "flex-end",
	},
	ringContainer: {
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
	},
	progressOverlay: {
		position: "absolute",
		borderStyle: "solid",
	},
	scoreTextContainer: {
		justifyContent: "center",
		alignItems: "center",
	},
	scoreText: {
		fontWeight: "700",
	},
	breakdownContainer: {
		backgroundColor: "rgba(0, 0, 0, 0.85)",
		borderRadius: 12,
		padding: 12,
		marginTop: 8,
		minWidth: 180,
	},
	breakdownTitle: {
		color: "#FFF",
		fontSize: 14,
		fontWeight: "700",
		marginBottom: 8,
		textAlign: "center",
	},
	breakdownItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	breakdownLabel: {
		color: "rgba(255, 255, 255, 0.8)",
		fontSize: 12,
	},
	weakestLabel: {
		color: "#FFF",
		fontWeight: "600",
	},
	breakdownValue: {
		fontSize: 12,
		fontWeight: "700",
		marginLeft: 8,
	},
	weakestValue: {
		fontSize: 13,
	},
	breakdownHint: {
		color: "rgba(255, 255, 255, 0.6)",
		fontSize: 11,
		marginTop: 8,
		textAlign: "center",
		fontStyle: "italic",
	},
});
