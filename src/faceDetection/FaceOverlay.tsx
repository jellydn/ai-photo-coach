/**
 * FaceOverlay component
 * Displays face bounding boxes and headroom guidance for portrait mode
 */

import type React from "react";
import { StyleSheet, View } from "react-native";
import type { DetectedFace, FaceFramingGuidance } from "./types";

/**
 * Props for FaceOverlay component
 */
interface FaceOverlayProps {
	/** Primary detected face to display */
	face?: DetectedFace;
	/** Framing guidance for prompts */
	framingGuidance: FaceFramingGuidance;
	/** Whether the overlay is visible */
	visible?: boolean;
	/** Color for face bounding box when properly framed */
	goodFrameColor?: string;
	/** Color for face bounding box when framing needs adjustment */
	adjustFrameColor?: string;
	/** Color for headroom guide line */
	headroomLineColor?: string;
	/** Width of bounding box border */
	borderWidth?: number;
	/** Test ID for testing */
	testID?: string;
}

/**
 * FaceOverlay renders a bounding box around the detected face
 * and shows a headroom guide line at the upper third.
 *
 * The overlay uses normalized coordinates (0-1) from face detection
 * and scales them to the container dimensions using percentage positioning.
 */
export function FaceOverlay({
	face,
	framingGuidance,
	visible = true,
	goodFrameColor = "rgba(76, 217, 100, 0.8)",
	adjustFrameColor = "rgba(255, 204, 0, 0.8)",
	headroomLineColor = "rgba(255, 215, 0, 0.6)",
	borderWidth = 2,
	testID = "face-overlay",
}: FaceOverlayProps): React.JSX.Element | null {
	if (!visible || !face) {
		return null;
	}

	// Choose color based on framing status
	const boxColor = framingGuidance.isProperlyFramed
		? goodFrameColor
		: adjustFrameColor;

	return (
		<View
			style={styles.container}
			testID={testID}
			pointerEvents="none" // Allow touches to pass through to camera
		>
			{/* Headroom guide line at upper third (33.33%) */}
			<View
				style={[
					styles.headroomLine,
					{
						backgroundColor: headroomLineColor,
						height: borderWidth,
					},
				]}
				testID={`${testID}-headroom-line`}
			/>

			{/* Face bounding box */}
			<View
				style={[
					styles.faceBox,
					{
						borderColor: boxColor,
						borderWidth,
					},
					// Use inline style for percentage-based positioning
					{
						left: `${face.bounds.x * 100}%`,
						top: `${face.bounds.y * 100}%`,
						width: `${face.bounds.width * 100}%`,
						height: `${face.bounds.height * 100}%`,
					},
				]}
				testID={`${testID}-face-box`}
			>
				{/* Corner markers for visual appeal */}
				<View
					style={[styles.corner, styles.cornerTL, { borderColor: boxColor }]}
				/>
				<View
					style={[styles.corner, styles.cornerTR, { borderColor: boxColor }]}
				/>
				<View
					style={[styles.corner, styles.cornerBL, { borderColor: boxColor }]}
				/>
				<View
					style={[styles.corner, styles.cornerBR, { borderColor: boxColor }]}
				/>
			</View>

			{/* Face center marker */}
			<View
				style={[
					styles.centerMarker,
					{
						backgroundColor: boxColor,
					},
					{
						left: `${(face.bounds.x + face.bounds.width / 2) * 100}%`,
						top: `${(face.bounds.y + face.bounds.height / 2) * 100}%`,
					},
				]}
				testID={`${testID}-center-marker`}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFill,
		zIndex: 12, // Between composition overlay (10) and horizon indicator (15)
	},
	headroomLine: {
		position: "absolute",
		left: 0,
		right: 0,
		top: "33.33%", // Upper third line for headroom guidance
	},
	faceBox: {
		position: "absolute",
		borderStyle: "solid",
		borderRadius: 4,
		backgroundColor: "transparent",
	},
	corner: {
		position: "absolute",
		width: 12,
		height: 12,
		borderColor: "inherit",
	},
	cornerTL: {
		top: -2,
		left: -2,
		borderTopWidth: 3,
		borderLeftWidth: 3,
		borderRightWidth: 0,
		borderBottomWidth: 0,
	},
	cornerTR: {
		top: -2,
		right: -2,
		borderTopWidth: 3,
		borderRightWidth: 3,
		borderLeftWidth: 0,
		borderBottomWidth: 0,
	},
	cornerBL: {
		bottom: -2,
		left: -2,
		borderBottomWidth: 3,
		borderLeftWidth: 3,
		borderTopWidth: 0,
		borderRightWidth: 0,
	},
	cornerBR: {
		bottom: -2,
		right: -2,
		borderBottomWidth: 3,
		borderRightWidth: 3,
		borderTopWidth: 0,
		borderLeftWidth: 0,
	},
	centerMarker: {
		position: "absolute",
		width: 8,
		height: 8,
		borderRadius: 4,
		marginLeft: -4, // Center on the point
		marginTop: -4,
	},
});
