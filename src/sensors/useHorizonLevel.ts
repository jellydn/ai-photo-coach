import { useCallback, useEffect, useRef, useState } from "react";
import {
	accelerometer,
	SensorTypes,
	setUpdateIntervalForType,
} from "react-native-sensors";
import type { Subscription } from "rxjs";
import {
	type AccelerometerData,
	computeRollFromAccel,
	DEFAULT_FILTER_ALPHA,
	isLevel,
	lowPassFilter,
	MIN_UPDATE_INTERVAL_MS,
} from "./math";

export interface HorizonLevel {
	/** Current roll angle in degrees, smoothed */
	roll: number;
	/** Whether the device is within tolerance of level */
	isLevel: boolean;
	/** Raw unfiltered roll (for debugging) */
	rawRoll: number;
}

export interface UseHorizonLevelOptions {
	/** Tolerance in degrees for "level" detection (default: 2) */
	toleranceDeg?: number;
	/** Low-pass filter coefficient 0-1 (default: 0.2) */
	filterAlpha?: number;
	/** Update interval in ms, minimum 33ms for 30Hz (default: 33) */
	updateIntervalMs?: number;
}

/**
 * Hook to subscribe to accelerometer and compute horizon level
 *
 * Features:
 * - Reads accelerometer at >= 30Hz (configurable)
 * - Computes roll angle from accelerometer data
 * - Applies low-pass filter to eliminate jitter
 * - Returns whether device is level based on tolerance
 *
 * @param options - Configuration options
 * @returns HorizonLevel object with roll angle and level status
 */
export function useHorizonLevel(
	options: UseHorizonLevelOptions = {},
): HorizonLevel {
	const {
		toleranceDeg = 2,
		filterAlpha = DEFAULT_FILTER_ALPHA,
		updateIntervalMs = MIN_UPDATE_INTERVAL_MS,
	} = options;

	const [roll, setRoll] = useState<number>(0);
	const [rawRoll, setRawRoll] = useState<number>(0);
	const filteredRollRef = useRef<number>(0);
	const subscriptionRef = useRef<Subscription | null>(null);

	// Memoized handlers to prevent unnecessary re-subscriptions
	const handleAccelData = useCallback(
		(data: { x: number; y: number; z: number; timestamp?: number }) => {
			const accelData: AccelerometerData = {
				x: data.x,
				y: data.y,
				z: data.z,
			};

			// Compute raw roll from accelerometer
			const rawRollValue = computeRollFromAccel(accelData);
			setRawRoll(rawRollValue);

			// Apply low-pass filter for smoothing
			const filteredRoll = lowPassFilter(
				rawRollValue,
				filteredRollRef.current,
				filterAlpha,
			);

			filteredRollRef.current = filteredRoll;
			setRoll(filteredRoll);
		},
		[filterAlpha],
	);

	useEffect(() => {
		// Set update interval for accelerometer (30Hz minimum)
		setUpdateIntervalForType(
			SensorTypes.accelerometer,
			Math.max(updateIntervalMs, MIN_UPDATE_INTERVAL_MS),
		);

		// Subscribe to accelerometer
		subscriptionRef.current = accelerometer.subscribe({
			next: handleAccelData,
			error: (err) => {
				console.error("Accelerometer error:", err);
			},
		});

		// Cleanup subscription on unmount
		return () => {
			if (subscriptionRef.current) {
				subscriptionRef.current.unsubscribe();
				subscriptionRef.current = null;
			}
		};
	}, [handleAccelData, updateIntervalMs]);

	return {
		roll,
		isLevel: isLevel(roll, toleranceDeg),
		rawRoll,
	};
}
