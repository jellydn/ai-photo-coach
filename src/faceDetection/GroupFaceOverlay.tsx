/**
 * GroupFaceOverlay component
 * Displays bounding boxes for all detected faces in group photo mode
 * Color-coded: green if fully inside frame, yellow if touching edge
 */

import type React from "react";
import { StyleSheet, View } from "react-native";
import {
	type DetectedFace,
	type GroupFramingAnalysis,
	isFaceTouchingEdge,
} from "./types";

/**
 * Props for GroupFaceOverlay component
 */
interface GroupFaceOverlayProps {
	/** All detected faces to display */
	faces: DetectedFace[];
	/** Group framing analysis for color coding */
	groupAnalysis?: GroupFramingAnalysis;
	/** Whether the overlay is visible */
	visible?: boolean;
	/** Color for face bounding box when fully inside frame */
	goodFrameColor?: string;
	/** Color for face bounding box when touching frame edge */
	edgeTouchingColor?: string;
	/** Width of bounding box border */
	borderWidth?: number;
	/** Test ID for testing */
	testID?: string;
}

/**
 * Individual face box component
 */
interface FaceBoxProps {
	face: DetectedFace;
	color: string;
	borderWidth: number;
	index: number;
}

function FaceBox({
	face,
	color,
	borderWidth,
	index,
}: FaceBoxProps): React.JSX.Element {
	return (
		<View
			style={[
				styles.faceBox,
				{
					borderColor: color,
					borderWidth,
					left: `${face.bounds.x * 100}%`,
					top: `${face.bounds.y * 100}%`,
					width: `${face.bounds.width * 100}%`,
					height: `${face.bounds.height * 100}%`,
				},
			]}
			testID={`group-face-box-${index}`}
		>
			{/* Corner markers for visual appeal */}
			<View style={[styles.corner, styles.cornerTL, { borderColor: color }]} />
			<View style={[styles.corner, styles.cornerTR, { borderColor: color }]} />
			<View style={[styles.corner, styles.cornerBL, { borderColor: color }]} />
			<View style={[styles.corner, styles.cornerBR, { borderColor: color }]} />
		</View>
	);
}

/**
 * GroupFaceOverlay renders bounding boxes for all detected faces
 * Color-coded based on framing status:
 * - Green: Face is fully inside frame (good framing)
 * - Yellow: Face is touching or near frame edge (needs adjustment)
 */
export function GroupFaceOverlay({
	faces,
	groupAnalysis,
	visible = true,
	goodFrameColor = "rgba(76, 217, 100, 0.8)",
	edgeTouchingColor = "rgba(255, 204, 0, 0.8)",
	borderWidth = 2,
	testID = "group-face-overlay",
}: GroupFaceOverlayProps): React.JSX.Element | null {
	if (!visible || faces.length === 0) {
		return null;
	}

	// Use groupAnalysis if provided, otherwise compute edge touching per face
	const edgeTouchingSet = groupAnalysis
		? new Set(groupAnalysis.edgeTouchingFaces.map((f) => f.id))
		: new Set(faces.filter((f) => isFaceTouchingEdge(f)).map((f) => f.id));

	return (
		<View
			style={styles.container}
			testID={testID}
			pointerEvents="none" // Allow touches to pass through to camera
		>
			{faces.map((face, index) => {
				const isTouchingEdge = edgeTouchingSet.has(face.id);
				const color = isTouchingEdge ? edgeTouchingColor : goodFrameColor;

				return (
					<FaceBox
						key={face.id}
						face={face}
						color={color}
						borderWidth={borderWidth}
						index={index}
					/>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFill,
		zIndex: 12, // Same as FaceOverlay - between composition (10) and horizon (15)
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
});
