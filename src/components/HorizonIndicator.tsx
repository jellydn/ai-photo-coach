import type React from "react";
import { StyleSheet, View } from "react-native";

/**
 * Props for the HorizonIndicator component
 */
interface HorizonIndicatorProps {
	/** Roll angle in degrees - positive = tilted right, negative = tilted left */
	roll: number;
	/** Whether the device is level (within tolerance) */
	isLevel: boolean;
	/** When false, the indicator is hidden */
	visible?: boolean;
	/** Color when not level - defaults to semi-transparent white */
	inactiveColor?: string;
	/** Color when level - defaults to semi-transparent green */
	activeColor?: string;
	/** Width of the horizon line - defaults to 60% of screen width */
	lineWidth?: number | `${number}%`;
	/** Thickness of the horizon line - defaults to 3 */
	lineThickness?: number;
	/** Test ID for testing */
	testID?: string;
}

/**
 * HorizonIndicator renders a rotating horizon line that helps users
 * keep their phone level to avoid crooked horizons in photos.
 *
 * The indicator:
 * - Rotates based on device roll angle
 * - Turns green when within tolerance of level
 * - Remains white when tilted beyond tolerance
 * - Uses transform rotation for smooth visual feedback
 */
export function HorizonIndicator({
	roll,
	isLevel,
	visible = true,
	inactiveColor = "rgba(255, 255, 255, 0.8)",
	activeColor = "rgba(76, 217, 100, 0.9)",
	lineWidth = "60%",
	lineThickness = 3,
	testID = "horizon-indicator",
}: HorizonIndicatorProps): React.ReactNode {
	if (!visible) {
		return null;
	}

	// Choose color based on level status
	const lineColor = isLevel ? activeColor : inactiveColor;

	return (
		<View style={styles.container} testID={testID} pointerEvents="none">
			{/* Horizon line with rotation */}
			<View
				style={[
					styles.horizonLineContainer,
					{
						transform: [{ rotate: `${-roll}deg` }],
					},
				]}
				testID={`${testID}-line`}
			>
				<View
					style={[
						styles.horizonLine,
						{
							backgroundColor: lineColor,
							width: lineWidth,
							height: lineThickness,
						},
					]}
				/>
				{/* Center dot to mark the pivot point */}
				<View
					style={[
						styles.centerDot,
						{
							backgroundColor: lineColor,
							width: lineThickness * 2,
							height: lineThickness * 2,
						},
					]}
				/>
			</View>
			{/* Roll angle text - subtle, at bottom */}
			<View style={styles.angleContainer}>
				<View
					style={[
						styles.angleBadge,
						{ backgroundColor: isLevel ? activeColor : inactiveColor },
					]}
				>
					<View style={styles.angleTextContainer} />
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFill,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 15, // Between composition overlay (10) and header UI (higher)
	},
	horizonLineContainer: {
		justifyContent: "center",
		alignItems: "center",
		// The rotation is applied via transform in the component
	},
	horizonLine: {
		borderRadius: 2,
	},
	centerDot: {
		position: "absolute",
		borderRadius: 100,
	},
	angleContainer: {
		position: "absolute",
		bottom: 100, // Above the bottom hint text
		alignItems: "center",
	},
	angleBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		opacity: 0.8,
	},
	angleTextContainer: {
		// Placeholder for angle text if needed
	},
});
