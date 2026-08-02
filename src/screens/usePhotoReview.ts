/**
 * usePhotoReview — owns the post-capture save/discard lifecycle.
 *
 * Deep module behind the PostCaptureScreen seam: burst keep-all/keep-best
 * decisions, storage deletion, and busy states live here so the screen only
 * renders state and forwards intent.
 */

import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { photoStorage } from "../storage";

/** A captured photo in a burst group (or a lone capture). */
export interface BurstPhoto {
	id: string;
	uri: string;
}

export interface UsePhotoReviewOptions {
	/** Photo to save/discard in single mode. */
	photoId: string;
	/** Optional burst photos for Pet/Kids mode carousel. */
	burstPhotos?: BurstPhoto[];
	/** Initial selected burst index. */
	selectedBurstIndex?: number;
	/** Called when the user confirms save. */
	onSave: () => void;
	/** Called when the user confirms discard. */
	onDiscard: () => void;
}

export interface UsePhotoReviewResult {
	isBurstMode: boolean;
	currentBurstIndex: number;
	setCurrentBurstIndex: Dispatch<SetStateAction<number>>;
	keepAllBurst: boolean;
	setKeepAllBurst: Dispatch<SetStateAction<boolean>>;
	isSaving: boolean;
	isDiscarding: boolean;
	handleSave: () => Promise<void>;
	handleDiscard: () => Promise<void>;
}

/**
 * Photo review lifecycle hook.
 *
 * Single mode: discard deletes the captured photo. Burst mode: "Keep best"
 * deletes all but the selected burst photo on save; discard deletes every
 * burst photo. The parent is always notified on save/discard.
 */
export function usePhotoReview({
	photoId,
	burstPhotos,
	selectedBurstIndex,
	onSave,
	onDiscard,
}: UsePhotoReviewOptions): UsePhotoReviewResult {
	const isBurstMode = burstPhotos !== undefined && burstPhotos.length > 1;

	const [currentBurstIndex, setCurrentBurstIndex] = useState<number>(
		selectedBurstIndex ?? 0,
	);
	const [keepAllBurst, setKeepAllBurst] = useState(true); // Default to keeping all burst shots
	const [isSaving, setIsSaving] = useState(false);
	const [isDiscarding, setIsDiscarding] = useState(false);

	// In burst mode: keep current (or all) burst shots.
	const handleSave = useCallback(async () => {
		if (isSaving) return;

		setIsSaving(true);
		try {
			if (isBurstMode && !keepAllBurst) {
				// "Keep best" — delete all other burst shots except current.
				const photosToDelete = (burstPhotos ?? []).filter(
					(_, index) => index !== currentBurstIndex,
				);
				for (const photo of photosToDelete) {
					await photoStorage.delete(photo.id);
				}
			}
			// Photo(s) already saved via PhotoStorage from CameraScreen.
			// Just notify parent that user confirmed save.
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

	// In burst mode: discard all burst shots.
	const handleDiscard = useCallback(async () => {
		if (isDiscarding) return;

		setIsDiscarding(true);
		try {
			if (isBurstMode) {
				// Delete all burst photos.
				for (const photo of burstPhotos ?? []) {
					await photoStorage.delete(photo.id);
				}
			} else {
				// Delete single photo.
				await photoStorage.delete(photoId);
			}
			onDiscard();
		} catch (error) {
			console.error("Failed to discard photo:", error);
			// Still call onDiscard to exit screen even if delete failed.
			onDiscard();
		} finally {
			setIsDiscarding(false);
		}
	}, [isDiscarding, isBurstMode, burstPhotos, photoId, onDiscard]);

	return {
		isBurstMode,
		currentBurstIndex,
		setCurrentBurstIndex,
		keepAllBurst,
		setKeepAllBurst,
		isSaving,
		isDiscarding,
		handleSave,
		handleDiscard,
	};
}
