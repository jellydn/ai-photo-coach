import type React from "react";
import { StyleSheet, View } from "react-native";

/**
 * Props for the CompositionOverlay component
 */
interface CompositionOverlayProps {
	/** When false, the overlay is hidden */
	visible?: boolean;
	/** Color of the grid lines - defaults to semi-transparent white */
	lineColor?: string;
	/** Width of the grid lines - defaults to 1 */
	lineWidth?: number;
	/** Color of the center marker - defaults to semi-transparent gold */
	centerMarkerColor?: string;
	/** Size of the center marker - defaults to 20 */
	centerMarkerSize?: number;
	/** Test ID for testing */
	testID?: string;
}

// Overlay scales with container, no need for explicit dimensions

/**
 * CompositionOverlay renders rule-of-thirds grid and center marker
 * for photography composition guidance.
 *
 * Rule of thirds: Two equally-spaced horizontal lines and two equally-spaced
 * vertical lines divide the frame into 9 equal parts. Placing subjects at
 * intersection points creates more engaging compositions.
 *
 * The overlay uses absolute positioning on top of the camera preview and
 * scales automatically with the container dimensions.
 */
export function CompositionOverlay({
	visible = true,
	lineColor = "rgba(255, 255, 255, 0.6)",
	lineWidth = 1,
	centerMarkerColor = "rgba(255, 215, 0, 0.8)",
	centerMarkerSize = 20,
	testID = "composition-overlay",
}: CompositionOverlayProps): React.ReactNode {
	if (!visible) {
		return null;
	}

	return (
		<View
			style={styles.container}
			testID={testID}
			pointerEvents="none" // Allow touches to pass through to camera
		>
			{/* Rule of thirds grid */}
			<View style={styles.gridContainer}>
				{/* Horizontal line 1/3 from top */}
				<View
					style={[
						styles.horizontalLine,
						{
							backgroundColor: lineColor,
							height: lineWidth,
							marginTop: "33.33%",
						},
					]}
					testID={`${testID}-line-horizontal-1`}
				/>
				{/* Horizontal line 2/3 from top */}
				<View
					style={[
						styles.horizontalLine,
						{
							backgroundColor: lineColor,
							height: lineWidth,
							marginTop: "33.33%",
						},
					]}
					testID={`${testID}-line-horizontal-2`}
				/>
				{/* Vertical line 1/3 from left */}
				<View
					style={[
						styles.verticalLine,
						{
							backgroundColor: lineColor,
							width: lineWidth,
							marginLeft: "33.33%",
						},
					]}
					testID={`${testID}-line-vertical-1`}
				/>
				{/* Vertical line 2/3 from left */}
				<View
					style={[
						styles.verticalLine,
						{
							backgroundColor: lineColor,
							width: lineWidth,
							marginLeft: "33.33%",
						},
					]}
					testID={`${testID}-line-vertical-2`}
				/>
			</View>

			{/* Center marker - crosshair */}
			<View
				style={[styles.centerMarkerContainer, { width: centerMarkerSize }]}
				testID={`${testID}-center-marker`}
			>
				{/* Horizontal line of crosshair */}
				<View
					style={[
						styles.centerLineHorizontal,
						{
							backgroundColor: centerMarkerColor,
							height: Math.max(2, lineWidth + 1),
							width: centerMarkerSize,
						},
					]}
				/>
				{/* Vertical line of crosshair */}
				<View
					style={[
						styles.centerLineVertical,
						{
							backgroundColor: centerMarkerColor,
							width: Math.max(2, lineWidth + 1),
							height: centerMarkerSize,
						},
					]}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFill,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 10, // Above camera, below interactive UI elements
	},
	gridContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		flexDirection: "row",
	},
	horizontalLine: {
		position: "absolute",
		left: 0,
		right: 0,
	},
	verticalLine: {
		position: "absolute",
		top: 0,
		bottom: 0,
	},
	centerMarkerContainer: {
		position: "absolute",
		aspectRatio: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	centerLineHorizontal: {
		position: "absolute",
		borderRadius: 1,
	},
	centerLineVertical: {
		position: "absolute",
		borderRadius: 1,
	},
});
