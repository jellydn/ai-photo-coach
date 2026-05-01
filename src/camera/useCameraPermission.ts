/**
 * Camera permission hook - Manages camera permission state and requests
 * 
 * Extracted from CameraScreen to reduce complexity and improve testability.
 * Handles:
 * - Permission status tracking
 * - Permission checks on mount
 * - Permission requests
 * - Platform-specific permission types
 * - Settings link for blocked permissions
 */

import { useCallback, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import { check, PERMISSIONS, request, RESULTS } from "react-native-permissions";

export type PermissionStatus = "checking" | "granted" | "denied" | "blocked" | "error" | null;

export interface UseCameraPermissionResult {
	/** Current permission status */
	status: PermissionStatus;
	/** Check current permission status */
	check: () => Promise<void>;
	/** Request permission from user */
	request: () => Promise<void>;
	/** Open device settings for blocked permissions */
	openSettings: () => void;
	/** Whether permission is granted */
	isGranted: boolean;
	/** Whether permission is denied/blocked/error */
	isDenied: boolean;
}

/**
 * Hook to manage camera permission state and requests
 */
export function useCameraPermission(): UseCameraPermissionResult {
	const [status, setStatus] = useState<PermissionStatus>("checking");

	/** Get platform-specific camera permission constant */
	const getCameraPermission = useCallback(() => {
		return Platform.OS === "ios"
			? PERMISSIONS.IOS.CAMERA
			: PERMISSIONS.ANDROID.CAMERA;
	}, []);

	/** Check current permission status */
	const checkPermission = useCallback(async () => {
		try {
			const cameraPermission = getCameraPermission();
			const result = await check(cameraPermission);
			setStatus(
				result === RESULTS.GRANTED
					? "granted"
					: result === RESULTS.BLOCKED
						? "blocked"
						: result === RESULTS.DENIED
							? "denied"
							: "error",
			);
		} catch {
			setStatus("error");
		}
	}, [getCameraPermission]);

	/** Request permission from user */
	const requestPermission = useCallback(async () => {
		try {
			const cameraPermission = getCameraPermission();
			const result = await request(cameraPermission);
			setStatus(
				result === RESULTS.GRANTED
					? "granted"
					: result === RESULTS.BLOCKED
						? "blocked"
						: result === RESULTS.DENIED
							? "denied"
							: "error",
			);
		} catch {
			setStatus("error");
		}
	}, [getCameraPermission]);

	/** Open device settings for blocked permissions */
	const openSettings = useCallback(() => {
		// eslint-disable-next-line no-void
		void Linking.openSettings();
	}, []);

	// Check permission on mount
	useEffect(() => {
		// eslint-disable-next-line no-void
		void checkPermission();
	}, [checkPermission]);

	return {
		status,
		check: checkPermission,
		request: requestPermission,
		openSettings,
		isGranted: status === "granted",
		isDenied: status === "denied" || status === "blocked" || status === "error",
	};
}
