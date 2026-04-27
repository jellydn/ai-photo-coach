/**
 * Sensor math utilities - pure functions for horizon level detection
 */

/**
 * Accelerometer data interface
 */
export interface AccelerometerData {
	/** X-axis acceleration in m/s² (positive when device tilts right) */
	x: number;
	/** Y-axis acceleration in m/s² (positive when device tilts forward) */
	y: number;
	/** Z-axis acceleration in m/s² (positive when device is face up) */
	z: number;
}

/**
 * Compute roll angle (rotation around X-axis) from accelerometer data
 * Roll is the tilt from side to side (crooked horizon detection)
 *
 * Uses the formula: roll = atan2(y, z) converted to degrees
 * When phone is flat on table: y=0, z=~9.8, roll=0
 * When phone tilted right: y increases, z decreases, roll > 0
 * When phone tilted left: y decreases, z decreases, roll < 0
 *
 * @param accel - Accelerometer data (x, y, z)
 * @returns Roll angle in degrees, range [-180, 180]
 */
export function computeRollFromAccel(accel: AccelerometerData): number {
	const { y, z } = accel;

	// atan2(y, z) gives roll in radians
	// When y=0 and z>0 (flat), atan2(0, z) = 0
	// When y>0 and z=0 (tilted right), atan2(y, 0) = 90
	// When y<0 and z=0 (tilted left), atan2(-y, 0) = -90
	const rollRad = Math.atan2(y, z);
	const rollDeg = (rollRad * 180) / Math.PI;

	return rollDeg;
}

/**
 * Check if the device is level (horizon is straight)
 * @param rollDeg - Roll angle in degrees
 * @param toleranceDeg - Tolerance in degrees (e.g., 2 for +/- 2 degrees)
 * @returns true if roll is within tolerance of 0 degrees
 */
export function isLevel(rollDeg: number, toleranceDeg: number): boolean {
	return Math.abs(rollDeg) <= toleranceDeg;
}

/**
 * Apply low-pass filter to smooth sensor data
 * Formula: output = alpha * current + (1 - alpha) * previous
 *
 * @param current - Current raw value
 * @param previous - Previous filtered value
 * @param alpha - Filter coefficient (0-1), higher = more responsive, lower = more smoothing
 * @returns Filtered value
 */
export function lowPassFilter(
	current: number,
	previous: number,
	alpha: number,
): number {
	return alpha * current + (1 - alpha) * previous;
}

/**
 * Default filter coefficient for horizon smoothing
 * alpha = 0.2 provides good balance:
 * - Responsive enough to detect intentional tilting
 * - Smooth enough to eliminate jitter from hand shake
 */
export const DEFAULT_FILTER_ALPHA = 0.2;

/**
 * Minimum update interval for accelerometer in milliseconds
 * 30 Hz = 33.33ms interval
 */
export const MIN_UPDATE_INTERVAL_MS = 33;
