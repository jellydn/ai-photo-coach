import { useCallback, useEffect, useRef, useState } from "react";
import {
	accelerometer,
	gyroscope,
	SensorTypes,
	setUpdateIntervalForType,
} from "react-native-sensors";
import type { Subscription } from "rxjs";
import {
	computeStability,
	DEFAULT_STABILITY_THRESHOLD,
	MIN_UPDATE_INTERVAL_MS,
	type SensorSample,
	STABILITY_WINDOW_MS,
} from "./math";

export interface StabilityState {
	/** Whether device is currently stable (low movement) */
	isStable: boolean;
	/** Number of samples in current window */
	sampleCount: number;
	/** Current stability score (lower = more stable) */
	stabilityScore: number;
	/** Whether sensors are available on this device */
	isAvailable: boolean;
	/** Error message if sensors failed */
	error: string | null;
}

export interface UseStabilityOptions {
	/** Stability threshold 0-1 (default: 0.02) - lower is stricter */
	threshold?: number;
	/** Update interval in ms, minimum 33ms for 30Hz (default: 33) */
	updateIntervalMs?: number;
	/** Rolling window size in ms (default: 500) */
	windowMs?: number;
}

/**
 * Hook to subscribe to accelerometer + gyroscope and compute stability
 *
 * Features:
 * - Reads accelerometer and gyroscope at >= 30Hz
 * - Maintains rolling window of sensor samples (default 500ms)
 * - Computes stability using combined accel + gyro magnitudes
 * - Returns boolean isStable signal based on threshold
 *
 * @param options - Configuration options
 * @returns StabilityState with isStable flag and diagnostic info
 */
export function useStability(
	options: UseStabilityOptions = {},
): StabilityState {
	const {
		threshold = DEFAULT_STABILITY_THRESHOLD,
		updateIntervalMs = MIN_UPDATE_INTERVAL_MS,
		windowMs = STABILITY_WINDOW_MS,
	} = options;

	const [isStable, setIsStable] = useState<boolean>(false);
	const [stabilityScore, setStabilityScore] = useState<number>(0);
	const [isAvailable, setIsAvailable] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// Rolling window of sensor samples
	const samplesRef = useRef<SensorSample[]>([]);

	// Sensor subscriptions
	const accelSubRef = useRef<Subscription | null>(null);
	const gyroSubRef = useRef<Subscription | null>(null);

	// Latest sensor values (combined to create samples)
	const latestAccelRef = useRef<{ x: number; y: number; z: number } | null>(
		null,
	);
	const latestGyroRef = useRef<{ x: number; y: number; z: number } | null>(
		null,
	);

	// Process new sample and update stability
	const processSample = useCallback(() => {
		if (!latestAccelRef.current || !latestGyroRef.current) {
			return;
		}

		const now = Date.now();

		// Add new sample
		samplesRef.current.push({
			accel: latestAccelRef.current,
			gyro: latestGyroRef.current,
			timestamp: now,
		});

		// Remove samples outside the rolling window
		const cutoffTime = now - windowMs;
		samplesRef.current = samplesRef.current.filter(
			(s) => s.timestamp >= cutoffTime,
		);

		// Compute stability
		const stable = computeStability(samplesRef.current, threshold);
		setIsStable(stable);

		// Compute rough stability score for debugging (lower = more stable)
		const score =
			samplesRef.current.length > 0
				? samplesRef.current.length / (windowMs / updateIntervalMs)
				: 0;
		setStabilityScore(score);
	}, [threshold, windowMs, updateIntervalMs]);

	// Handle accelerometer data
	const handleAccelData = useCallback(
		(data: { x: number; y: number; z: number; timestamp?: number }) => {
			latestAccelRef.current = { x: data.x, y: data.y, z: data.z };
			// Process sample when we have both accel and gyro data
			if (latestGyroRef.current) {
				processSample();
			}
		},
		[processSample],
	);

	// Handle gyroscope data
	const handleGyroData = useCallback(
		(data: { x: number; y: number; z: number; timestamp?: number }) => {
			latestGyroRef.current = { x: data.x, y: data.y, z: data.z };
		},
		[],
	);

	useEffect(() => {
		// Set update intervals for both sensors (30Hz minimum)
		const interval = Math.max(updateIntervalMs, MIN_UPDATE_INTERVAL_MS);
		setUpdateIntervalForType(SensorTypes.accelerometer, interval);
		setUpdateIntervalForType(SensorTypes.gyroscope, interval);

		// Subscribe to accelerometer
		accelSubRef.current = accelerometer.subscribe({
			next: handleAccelData,
			error: (err: Error) => {
				setIsAvailable(false);
				setError(err.message || "Accelerometer unavailable");
				console.error("Accelerometer error:", err);
			},
		});

		// Subscribe to gyroscope
		gyroSubRef.current = gyroscope.subscribe({
			next: handleGyroData,
			error: (err: Error) => {
				setIsAvailable(false);
				setError(err.message || "Gyroscope unavailable");
				console.error("Gyroscope error:", err);
			},
		});

		// Cleanup subscriptions on unmount
		return () => {
			if (accelSubRef.current) {
				accelSubRef.current.unsubscribe();
				accelSubRef.current = null;
			}
			if (gyroSubRef.current) {
				gyroSubRef.current.unsubscribe();
				gyroSubRef.current = null;
			}
		};
	}, [handleAccelData, handleGyroData, updateIntervalMs]);

	return {
		isStable: isAvailable && isStable,
		sampleCount: samplesRef.current.length,
		stabilityScore,
		isAvailable,
		error,
	};
}
