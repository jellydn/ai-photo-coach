/**
 * Post-capture screen showing captured photo with Before/After annotations
 */

import type React from "react";
import { useCallback, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SubScores } from "../scoring/types";
import { getSubscoreLabel } from "../scoring/types";
import { photoStorage } from "../storage";

interface PostCaptureScreenProps {
	photoId: string;
	photoUri: string;
	subScores: SubScores;
	weakestSubscore: keyof SubScores;
	onSave: () => void;
	onDiscard: () => void;
}

/**
 * Generate annotation text for weakest subscore
 */
function getAnnotationText(
	subscore: keyof SubScores,
	subScores: SubScores,
): string {
	const score = subScores[subscore];

	switch (subscore) {
		case "level": {
			// Level issue - horizon was tilted
			const degrees = Math.round((100 - score) / 10);
			return `Horizon was tilted ~${degrees}°`;
		}
		case "stability":
			return "Photo was shaky - hold steadier next time";
		case "framing":
			return score < 50
				? "Subject too small or large - adjust distance"
				: "Subject slightly off-center - check composition";
		case "lighting":
			return score < 40
				? "Too dark - find better lighting"
				: "Uneven lighting - face the light source";
		case "aesthetic":
			return "Scene could be more visually interesting";
		default:
			return `${getSubscoreLabel(subscore)} could be improved`;
	}
}

/**
 * Post-capture screen component
 */
export function PostCaptureScreen({
	photoId,
	photoUri,
	subScores,
	weakestSubscore,
	onSave,
	onDiscard,
}: PostCaptureScreenProps): React.JSX.Element {
	// View mode: 'before' (raw) or 'after' (annotated)
	const [viewMode, setViewMode] = useState<"before" | "after">("after");
	const [isSaving, setIsSaving] = useState(false);
	const [isDiscarding, setIsDiscarding] = useState(false);

	// Handle save action
	const handleSave = useCallback(async () => {
		if (isSaving) return;

		setIsSaving(true);
		try {
			// Photo is already saved via PhotoStorage from CameraScreen
			// Just notify parent that user confirmed save
			onSave();
		} catch (error) {
			console.error("Failed to save photo:", error);
		} finally {
			setIsSaving(false);
		}
	}, [isSaving, onSave]);

	// Handle discard action
	const handleDiscard = useCallback(async () => {
		if (isDiscarding) return;

		setIsDiscarding(true);
		try {
			// Delete the photo from storage
			await photoStorage.delete(photoId);
			onDiscard();
		} catch (error) {
			console.error("Failed to discard photo:", error);
			// Still call onDiscard to exit screen even if delete failed
			onDiscard();
		} finally {
			setIsDiscarding(false);
		}
	}, [isDiscarding, photoId, onDiscard]);

	// Toggle view mode directly
	const toggleViewMode = useCallback(() => {
		setViewMode((prev) => (prev === "before" ? "after" : "before"));
	}, []);

	// Get annotation text
	const annotationText = getAnnotationText(weakestSubscore, subScores);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.photoContainer}>
				{/* Photo display */}
				<Image
					source={{ uri: photoUri }}
					style={styles.photo}
					resizeMode="cover"
					testID="post-capture-photo"
				/>

				{/* Annotations overlay (shown in After mode) */}
				{viewMode === "after" && (
					<View style={styles.annotationsOverlay} testID="annotations-overlay">
						<View style={styles.annotationCard}>
							<Text style={styles.annotationLabel}>Learning Tip</Text>
							<Text style={styles.annotationText}>{annotationText}</Text>
							<View style={styles.scoreBadge}>
								<Text style={styles.scoreBadgeText}>
									{getSubscoreLabel(weakestSubscore)}:{" "}
									{subScores[weakestSubscore]}/100
								</Text>
							</View>
						</View>
					</View>
				)}

				{/* Mode indicator */}
				<View style={styles.modeIndicator}>
					<Text style={styles.modeIndicatorText}>
						{viewMode === "before" ? "Before" : "After"}
					</Text>
					<Text style={styles.modeIndicatorHint}>
						{viewMode === "before"
							? "Tap for analysis"
							: "Tap to see raw photo"}
					</Text>
				</View>
			</View>

			{/* Bottom controls */}
			<View style={styles.bottomControls}>
				{/* View mode toggle button */}
				<TouchableOpacity
					style={styles.toggleButton}
					onPress={toggleViewMode}
					testID="view-mode-toggle"
					accessibilityLabel={`Switch to ${viewMode === "before" ? "after" : "before"} view`}
				>
					<Text style={styles.toggleButtonText}>
						{viewMode === "before" ? "Show Analysis →" : "← Show Raw"}
					</Text>
				</TouchableOpacity>

				{/* Action buttons */}
				<View style={styles.actionButtons}>
					<TouchableOpacity
						style={[
							styles.discardButton,
							isDiscarding && styles.buttonDisabled,
						]}
						onPress={handleDiscard}
						disabled={isDiscarding}
						testID="discard-button"
						accessibilityLabel="Discard photo"
					>
						<Text style={styles.discardButtonText}>
							{isDiscarding ? "Deleting..." : "Discard"}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.saveButton, isSaving && styles.buttonDisabled]}
						onPress={handleSave}
						disabled={isSaving}
						testID="save-button"
						accessibilityLabel="Save photo"
					>
						<Text style={styles.saveButtonText}>
							{isSaving ? "Saving..." : "Save"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	photoContainer: {
		flex: 1,
		position: "relative",
	},
	photo: {
		...StyleSheet.absoluteFill,
		width: "100%",
		height: "100%",
	},
	annotationsOverlay: {
		...StyleSheet.absoluteFill,
		backgroundColor: "rgba(0,0,0,0.3)",
		justifyContent: "flex-end",
		padding: 20,
	},
	annotationCard: {
		backgroundColor: "rgba(0,0,0,0.7)",
		borderRadius: 16,
		padding: 20,
		marginBottom: 100, // Space for bottom controls
		borderLeftWidth: 4,
		borderLeftColor: "#FFCC00",
	},
	annotationLabel: {
		color: "#FFCC00",
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 8,
	},
	annotationText: {
		color: "#FFF",
		fontSize: 16,
		fontWeight: "500",
		lineHeight: 22,
		marginBottom: 12,
	},
	scoreBadge: {
		backgroundColor: "rgba(255,255,255,0.2)",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		alignSelf: "flex-start",
	},
	scoreBadgeText: {
		color: "#FFF",
		fontSize: 13,
		fontWeight: "600",
	},
	modeIndicator: {
		position: "absolute",
		top: 60,
		left: 0,
		right: 0,
		alignItems: "center",
	},
	modeIndicatorText: {
		color: "#FFF",
		fontSize: 18,
		fontWeight: "700",
		textShadowColor: "rgba(0,0,0,0.8)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	modeIndicatorHint: {
		color: "rgba(255,255,255,0.8)",
		fontSize: 13,
		marginTop: 4,
		textShadowColor: "rgba(0,0,0,0.8)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	bottomControls: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		padding: 20,
		paddingBottom: 40,
		backgroundColor: "rgba(0,0,0,0.7)",
	},
	toggleButton: {
		alignSelf: "center",
		paddingHorizontal: 20,
		paddingVertical: 10,
		backgroundColor: "rgba(255,255,255,0.2)",
		borderRadius: 20,
		marginBottom: 20,
	},
	toggleButtonText: {
		color: "#FFF",
		fontSize: 14,
		fontWeight: "600",
	},
	actionButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 16,
	},
	discardButton: {
		flex: 1,
		backgroundColor: "#FF3B30",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
	},
	discardButtonText: {
		color: "#FFF",
		fontSize: 17,
		fontWeight: "600",
	},
	saveButton: {
		flex: 1,
		backgroundColor: "#34C759",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
	},
	saveButtonText: {
		color: "#FFF",
		fontSize: 17,
		fontWeight: "600",
	},
	buttonDisabled: {
		opacity: 0.6,
	},
});
