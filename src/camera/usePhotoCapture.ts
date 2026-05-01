/**
 * Photo capture hook - Manages photo capture with single and burst mode support
 * 
 * Extracted from CameraScreen to reduce complexity and improve testability.
 * Handles:
 * - Single photo capture
 * - Burst mode capture (Pet/Kids)
 * - Burst state management
 * - Photo metadata storage
 * - Haptic feedback triggering
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Mode } from "../config/modes";
import type { SubScores } from "../scoring/types";
import { photoStorage } from "../storage";

export interface PhotoCaptureOptions {
	/** VisionCamera v5 photo output */
	photoOutput: { capturePhotoToFile: (settings: { flashMode: "off" | "on" | "auto" }, callbacks: Record<string, unknown>) => Promise<{ filePath: string }> };
	/** Current capture mode */
	mode: Mode;
	/** Current shot score */
	score: number;
	/** Subscores for metadata */
	subScores: SubScores;
	/** Weakest subscore for feedback */
	weakestSubscore: keyof SubScores;
	/** Whether in burst mode */
	isBurstMode: boolean;
	/** Number of shots in burst */
	burstShotCount: number;
	/** Current burst shot index from autoCapture */
	burstShotIndex: number;
	/** Auto-capture state ('idle' | 'counting' | 'capturing' | 'completed') */
	captureState: string;
	/** Haptic trigger function */
	triggerCapture: () => void;
	/** Callback when photo(s) captured */
	onPhotoCaptured?: (
		photoId: string,
		uri: string,
		subScores: SubScores,
		weakestSubscore: keyof SubScores,
		wasAutoCapture: boolean,
		burstId?: string,
		burstPhotos?: Array<{ id: string; uri: string }>,
	) => void;
}

export interface PhotoCaptureResult {
	/** Whether a capture is in progress */
	isCapturing: boolean;
	/** Burst photos collected so far */
	burstPhotos: Array<{ id: string; uri: string }>;
	/** Set burst photos (for manual reset) */
	setBurstPhotos: React.Dispatch<React.SetStateAction<Array<{ id: string; uri: string }>>>;
	/** Reset burst state */
	resetBurst: () => void;
	/** Capture photo function (single or burst) */
	capturePhoto: (burstIndex?: number) => Promise<void>;
	/** Whether the last capture was auto-triggered */
	isAutoCaptureRef: React.RefObject<boolean>;
}

/**
 * Hook to manage photo capture with single and burst mode support
 */
export function usePhotoCapture({
	photoOutput,
	mode,
	score,
	subScores,
	weakestSubscore,
	isBurstMode,
	burstShotCount,
	burstShotIndex,
	captureState,
	triggerCapture,
	onPhotoCaptured,
}: PhotoCaptureOptions): PhotoCaptureResult {
	const [isCapturing, setIsCapturing] = useState(false);
	const [burstPhotos, setBurstPhotos] = useState<
		Array<{ id: string; uri: string }>
	>([]);
	const burstIdRef = useRef<string | null>(null);
	const isAutoCaptureRef = useRef(false);

	/** Reset burst state for new capture sequence */
	const resetBurst = useCallback(() => {
		setBurstPhotos([]);
		burstIdRef.current = null;
	}, []);

	/**
	 * Core photo capture function
	 * Supports both single capture and burst mode
	 */
	const capturePhoto = useCallback(
		async (burstIndex: number = 0) => {
			if (isCapturing && burstIndex === 0) {
				// Only block if starting a new capture (not burst continuation)
				return;
			}

			if (burstIndex === 0) {
				setIsCapturing(true);
			}
			try {
				// Use VisionCamera v5 capturePhotoToFile API
				const photoFile = await photoOutput.capturePhotoToFile(
					{ flashMode: "off" },
					{},
				);

				// Get photo dimensions from device or use defaults
				const width = 1920;
				const height = 1080;

				// Generate burst ID if in burst mode and this is the first shot
				if (isBurstMode && burstIndex === 0) {
					burstIdRef.current = `burst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
				}

				// Save photo with metadata
				const metadata = await photoStorage.save(
					{
						path: photoFile.filePath,
						width,
						height,
					},
					{
						mode,
						score,
						subscores: subScores,
						burstId: burstIdRef.current ?? undefined,
					},
				);

				// Track burst photo
				if (isBurstMode) {
					setBurstPhotos((prev) => [
						...prev,
						{ id: metadata.id, uri: photoFile.filePath },
					]);
				}

				// If not in burst mode, notify parent immediately
				if (!isBurstMode) {
					// Reset auto-capture flag after reading
					const wasAutoCapture = isAutoCaptureRef.current;
					isAutoCaptureRef.current = false;

					// Trigger capture haptic feedback
					triggerCapture();

					onPhotoCaptured?.(
						metadata.id,
						photoFile.filePath,
						subScores,
						weakestSubscore,
						wasAutoCapture,
					);
				}
			} catch (error) {
				console.error("Failed to capture photo:", error);
				if (burstIndex === 0) {
					setIsCapturing(false);
				}
			}
		},
		[
			isCapturing,
			photoOutput,
			mode,
			score,
			subScores,
			weakestSubscore,
			onPhotoCaptured,
			triggerCapture,
			isBurstMode,
		],
	);

	// Burst mode effect - capture multiple shots in sequence
	useEffect(() => {
		// Only handle burst progression when in burst mode and capturing state
		if (!isBurstMode || captureState !== "capturing") {
			return;
		}

		// Capture the current burst shot
		const captureCurrentShot = async () => {
			// Trigger haptic on first shot
			if (burstShotIndex === 0) {
				triggerCapture();
			}
			await capturePhoto(burstShotIndex);
		};

		captureCurrentShot();
	}, [isBurstMode, captureState, burstShotIndex, capturePhoto, triggerCapture]);

	// Notify parent when burst is complete
	useEffect(() => {
		if (
			isBurstMode &&
			burstPhotos.length === burstShotCount &&
			burstPhotos.length > 0
		) {
			// Burst complete - notify parent with all photos
			const wasAutoCapture = isAutoCaptureRef.current;
			isAutoCaptureRef.current = false;
			setIsCapturing(false);

			// Use the first photo as the primary
			const primaryPhoto = burstPhotos[0];
			const burstId = burstIdRef.current ?? undefined;

			onPhotoCaptured?.(
				primaryPhoto.id,
				primaryPhoto.uri,
				subScores,
				weakestSubscore,
				wasAutoCapture,
				burstId,
				burstPhotos,
			);

			// Reset burst state
			resetBurst();
		}
	}, [
		isBurstMode,
		burstPhotos,
		burstShotCount,
		subScores,
		weakestSubscore,
		onPhotoCaptured,
		resetBurst,
	]);

	// Trigger capture when countdown completes (single shot mode only)
	useEffect(() => {
		if (captureState === "capturing" && !isBurstMode) {
			// Mark as auto-capture
			isAutoCaptureRef.current = true;
			capturePhoto();
		}
	}, [captureState, capturePhoto, isBurstMode]);

	return {
		isCapturing,
		burstPhotos,
		setBurstPhotos,
		resetBurst,
		capturePhoto,
		isAutoCaptureRef,
	};
}
