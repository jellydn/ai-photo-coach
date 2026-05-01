/**
 * Post-capture screen showing captured photo with Before/After annotations
 */

import type React from "react";
import { useCallback, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SubScores } from "../scoring/types";
import { getSubscoreLabel } from "../scoring/types";
import { photoStorage } from "../storage";

interface BurstPhoto {
	id: string;
	uri: string;
}

interface PostCaptureScreenProps {
	photoId: string;
	photoUri: string;
	subScores: SubScores;
	weakestSubscore: keyof SubScores;
	onSave: () => void;
	onDiscard: () => void;
	/** Optional burst photos for Pet/Kids mode carousel */
	burstPhotos?: BurstPhoto[];
	/** Burst ID for grouping related photos (unused but reserved for future) */
	_burstId?: string;
	/** Initial selected burst index */
	selectedBurstIndex?: number;
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
	burstPhotos,
	_burstId,
	selectedBurstIndex = 0,
}: PostCaptureScreenProps): React.JSX.Element {
	// View mode: 'before' (raw) or 'after' (annotated)
	const [viewMode, setViewMode] = useState<"before" | "after">("after");
	const [isSaving, setIsSaving] = useState(false);
	const [isDiscarding, setIsDiscarding] = useState(false);

	// Burst mode state
	const isBurstMode = burstPhotos && burstPhotos.length > 1;
	const [currentBurstIndex, setCurrentBurstIndex] =
		useState(selectedBurstIndex);
	const [keepAllBurst, setKeepAllBurst] = useState(true); // Default to keeping all burst shots

	// Get current photo to display (burst or single)
	const currentPhoto = isBurstMode
		? burstPhotos[currentBurstIndex]
		: { id: photoId, uri: photoUri };

	// Handle save action
	// In burst mode: keep current (or all) burst shots
	const handleSave = useCallback(async () => {
		if (isSaving) return;

		setIsSaving(true);
		try {
			if (isBurstMode && !keepAllBurst) {
				// "Keep best" - delete all other burst shots except current
				const photosToDelete = burstPhotos.filter(
					(_, index) => index !== currentBurstIndex,
				);
				for (const photo of photosToDelete) {
					await photoStorage.delete(photo.id);
				}
			}
			// Photo(s) already saved via PhotoStorage from CameraScreen
			// Just notify parent that user confirmed save
			onSave();
		} catch (error) {
			console.error("Failed to save photo:", error);
		} finally {
			setIsSaving(false);
		}
	}, [
		isSaving,
		isBurstMode,
		keepAllBurst,
		burstPhotos,
		currentBurstIndex,
		onSave,
	]);

	// Handle discard action
	// In burst mode: discard all burst shots
	const handleDiscard = useCallback(async () => {
		if (isDiscarding) return;

		setIsDiscarding(true);
		try {
			if (isBurstMode) {
				// Delete all burst photos
				for (const photo of burstPhotos) {
					await photoStorage.delete(photo.id);
				}
			} else {
				// Delete single photo
				await photoStorage.delete(photoId);
			}
			onDiscard();
		} catch (error) {
			console.error("Failed to discard photo:", error);
			// Still call onDiscard to exit screen even if delete failed
			onDiscard();
		} finally {
			setIsDiscarding(false);
		}
	}, [isDiscarding, isBurstMode, burstPhotos, photoId, onDiscard]);

	// Toggle view mode directly
	const toggleViewMode = useCallback(() => {
		setViewMode((prev) => (prev === "before" ? "after" : "before"));
	}, []);

	// Swipe gesture handler - horizontal swipe
	// In burst mode: swipe to navigate between burst photos
	// In single mode: swipe to toggle between Before/After views
	const swipeGesture = Gesture.Pan()
		.onEnd((event) => {
			const { translationX } = event;
			const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger

			if (isBurstMode) {
				// Burst mode: swipe to change current burst photo
				if (
					translationX < -SWIPE_THRESHOLD &&
					currentBurstIndex < burstPhotos.length - 1
				) {
					// Swipe left -> next photo
					setCurrentBurstIndex((prev) => prev + 1);
				} else if (translationX > SWIPE_THRESHOLD && currentBurstIndex > 0) {
					// Swipe right -> previous photo
					setCurrentBurstIndex((prev) => prev - 1);
				}
			} else {
				// Single mode: swipe to toggle Before/After
				if (translationX > SWIPE_THRESHOLD && viewMode === "after") {
					// Swipe right while in After mode -> go to Before
					setViewMode("before");
				} else if (translationX < -SWIPE_THRESHOLD && viewMode === "before") {
					// Swipe left while in Before mode -> go to After
					setViewMode("after");
				}
			}
		})
		.runOnJS(true);

	// Get annotation text
	const annotationText = getAnnotationText(weakestSubscore, subScores);

	return (
		<SafeAreaView style={styles.container}>
			<GestureDetector gesture={swipeGesture}>
				<View style={styles.photoContainer}>
					{/* Photo display - shows current burst photo or single photo */}
					<Image
						source={{ uri: currentPhoto.uri }}
						style={styles.photo}
						resizeMode="cover"
						testID="post-capture-photo"
					/>

					{/* Burst carousel indicator (only in burst mode) */}
					{isBurstMode && (
						<View style={styles.burstIndicator} testID="burst-indicator">
							<Text style={styles.burstIndicatorText}>
								Photo {currentBurstIndex + 1} of {burstPhotos.length}
							</Text>
							<View style={styles.burstDots}>
								{burstPhotos.map((_, index) => (
									<View
										key={`burst-dot-${index}`}
										style={[
											styles.burstDot,
											index === currentBurstIndex && styles.burstDotActive,
										]}
									/>
								))}
							</View>
						</View>
					)}

					{/* Annotations overlay (shown in After mode) */}
					{viewMode === "after" && (
						<View
							style={styles.annotationsOverlay}
							testID="annotations-overlay"
						>
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
					<View style={styles.modeIndicator} testID="mode-indicator">
						<Text style={styles.modeIndicatorText}>
							{viewMode === "before" ? "Before" : "After"}
						</Text>
						<Text style={styles.modeIndicatorHint}>
							{viewMode === "before"
								? "Swipe left or tap for analysis"
								: "Swipe right or tap to see raw photo"}
						</Text>
					</View>
				</View>
			</GestureDetector>

			{/* Bottom controls */}
			<View style={styles.bottomControls}>
				{/* View mode toggle button (single mode) or burst toggle (burst mode) */}
				{isBurstMode ? (
					/* Burst mode: Keep All / Keep Best toggle */
					<View style={styles.burstToggleContainer}>
						<TouchableOpacity
							style={[
								styles.burstToggleButton,
								keepAllBurst && styles.burstToggleActive,
							]}
							onPress={() => setKeepAllBurst(true)}
							testID="keep-all-button"
							accessibilityLabel="Keep all burst photos"
						>
							<Text
								style={[
									styles.burstToggleText,
									keepAllBurst && styles.burstToggleTextActive,
								]}
							>
								Save All
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.burstToggleButton,
								!keepAllBurst && styles.burstToggleActive,
							]}
							onPress={() => setKeepAllBurst(false)}
							testID="keep-best-button"
							accessibilityLabel="Keep only the current burst photo"
						>
							<Text
								style={[
									styles.burstToggleText,
									!keepAllBurst && styles.burstToggleTextActive,
								]}
							>
								Keep Best
							</Text>
						</TouchableOpacity>
					</View>
				) : (
					/* Single mode: View mode toggle */
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
				)}

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
						accessibilityLabel={
							isBurstMode ? "Discard all burst photos" : "Discard photo"
						}
					>
						<Text style={styles.discardButtonText}>
							{isDiscarding
								? "Deleting..."
								: isBurstMode
									? "Discard All"
									: "Discard"}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.saveButton, isSaving && styles.buttonDisabled]}
						onPress={handleSave}
						disabled={isSaving}
						testID="save-button"
						accessibilityLabel={
							isBurstMode
								? keepAllBurst
									? "Save all burst photos"
									: "Keep only the selected burst photo"
								: "Save photo"
						}
					>
						<Text style={styles.saveButtonText}>
							{isSaving
								? "Saving..."
								: isBurstMode
									? keepAllBurst
										? "Save All"
										: "Keep Best"
									: "Save"}
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
	burstIndicator: {
		position: "absolute",
		bottom: 180,
		left: 0,
		right: 0,
		alignItems: "center",
	},
	burstIndicatorText: {
		color: "#FFF",
		fontSize: 14,
		fontWeight: "600",
		textShadowColor: "rgba(0,0,0,0.8)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
		marginBottom: 8,
	},
	burstDots: {
		flexDirection: "row",
		gap: 8,
	},
	burstDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "rgba(255,255,255,0.4)",
	},
	burstDotActive: {
		backgroundColor: "#34C759",
	},
	burstToggleContainer: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 12,
		marginBottom: 20,
	},
	burstToggleButton: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		backgroundColor: "rgba(255,255,255,0.1)",
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.3)",
	},
	burstToggleActive: {
		backgroundColor: "rgba(52,199,89,0.3)",
		borderColor: "#34C759",
	},
	burstToggleText: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 14,
		fontWeight: "600",
	},
	burstToggleTextActive: {
		color: "#FFF",
	},
});
