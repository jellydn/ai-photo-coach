/**
 * Pitch detection hook for flat-lay photography
 * Uses accelerometer to detect if camera is pointing straight down
 */

import { useEffect, useRef, useState } from "react";
import { SensorTypes, setUpdateIntervalForType } from "react-native-sensors";
import type { Subscription } from "rxjs";
import {
	type AccelerometerData,
	computeFlatLayScore,
	computePitchFromAccel,
	DEFAULT_FILTER_ALPHA,
	isFlatLayPosition,
	lowPassFilter,
	MAX_FLATLAY_PITCH_DEVIATION_DEG,
	MIN_UPDATE_INTERVAL_MS,
} from "./math";

interface PitchDetectionOptions {
	/** Tolerance in degrees for flat-lay position (default 15) */
	toleranceDeg?: number;
	/** Low-pass filter alpha (default 0.2) */
	filterAlpha?: number;
	/** Whether pitch detection is enabled */
	enabled?: boolean;
}

interface PitchDetectionResult {
	/** Current pitch angle in degrees (-90 = camera pointing down) */
	pitch: number;
	/** Whether device is in flat-lay position */
	isFlatLay: boolean;
	/** Flat-lay score 0-100 */
	flatLayScore: number;
	/** Raw pitch without filtering (for debugging) */
	rawPitch: number;
}

/**
 * Hook for pitch detection using accelerometer
 * Used for food mode flat-lay photography guidance
 *
 * @param options - Configuration options
 * @returns Pitch detection result with angle and flat-lay status
 */
export function usePitchDetection(
	options: PitchDetectionOptions = {},
): PitchDetectionResult {
	const {
		toleranceDeg = MAX_FLATLAY_PITCH_DEVIATION_DEG,
		filterAlpha = DEFAULT_FILTER_ALPHA,
		enabled = true,
	} = options;

	const [pitch, setPitch] = useState(0);
	const [rawPitch, setRawPitch] = useState(0);
	const [isFlatLay, setIsFlatLay] = useState(false);
	const [flatLayScore, setFlatLayScore] = useState(0);

	// Refs for filtering and subscription management
	const filteredPitchRef = useRef(0);
	const subscriptionRef = useRef<Subscription | null>(null);

	useEffect(() => {
		if (!enabled) {
			// Reset state when disabled
			setPitch(0);
			setRawPitch(0);
			setIsFlatLay(false);
			setFlatLayScore(0);
			return;
		}

		// Set update interval to target 30Hz
		setUpdateIntervalForType(SensorTypes.accelerometer, MIN_UPDATE_INTERVAL_MS);

		// Import accelerometer dynamically to avoid issues with SSR
		const { accelerometer } = require("react-native-sensors");

		// Subscribe to accelerometer data
		subscriptionRef.current = accelerometer.subscribe({
			next: (sensorData: AccelerometerData) => {
				// Compute raw pitch from accelerometer
				const rawPitchValue = computePitchFromAccel(sensorData);
				setRawPitch(rawPitchValue);

				// Apply low-pass filter to smooth the value
				const filteredValue = lowPassFilter(
					rawPitchValue,
					filteredPitchRef.current,
					filterAlpha,
				);

				filteredPitchRef.current = filteredValue;
				setPitch(filteredValue);

				// Update flat-lay status
				const flatLay = isFlatLayPosition(filteredValue, toleranceDeg);
				setIsFlatLay(flatLay);

				// Update flat-lay score
				const score = computeFlatLayScore(filteredValue);
				setFlatLayScore(score);
			},
			error: (err: Error) => {
				console.error("Pitch detection sensor error:", err);
			},
		});

		// Cleanup subscription on unmount
		return () => {
			if (subscriptionRef.current) {
				subscriptionRef.current.unsubscribe();
				subscriptionRef.current = null;
			}
		};
	}, [enabled, toleranceDeg, filterAlpha]);

	return {
		pitch,
		isFlatLay,
		flatLayScore,
		rawPitch,
	};
}
