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

/**
 * Gyroscope data interface
 */
export interface GyroscopeData {
	/** X-axis rotation rate in rad/s (pitch rate) */
	x: number;
	/** Y-axis rotation rate in rad/s (yaw rate) */
	y: number;
	/** Z-axis rotation rate in rad/s (roll rate) */
	z: number;
}

/**
 * Sensor sample containing both accelerometer and gyroscope data
 */
export interface SensorSample {
	accel: AccelerometerData;
	gyro: GyroscopeData;
	timestamp: number;
}

/**
 * Rolling window size for stability detection in milliseconds
 * 500ms window as per spec
 */
export const STABILITY_WINDOW_MS = 500;

/**
 * Compute magnitude (vector length) of accelerometer data
 * Used to detect sudden movements
 * @param accel - Accelerometer data
 * @returns Magnitude in m/s²
 */
export function computeAccelMagnitude(accel: AccelerometerData): number {
	return Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
}

/**
 * Compute magnitude (vector length) of gyroscope data
 * Used to detect rotation movements
 * @param gyro - Gyroscope data
 * @returns Magnitude in rad/s
 */
export function computeGyroMagnitude(gyro: GyroscopeData): number {
	return Math.sqrt(gyro.x * gyro.x + gyro.y * gyro.y + gyro.z * gyro.z);
}

/**
 * Compute stability score from sensor samples
 * Uses rolling window of accelerometer + gyroscope magnitude
 *
 * Algorithm:
 * 1. Calculate variance of accelerometer magnitudes in window
 * 2. Calculate variance of gyroscope magnitudes in window
 * 3. Combined movement = weighted sum (accel weight: 0.7, gyro weight: 0.3)
 * 4. isStable = combined movement < threshold
 *
 * @param samples - Array of sensor samples within rolling window (typically 500ms)
 * @param threshold - Stability threshold from modeConfig (e.g., 0.02 for strict, 0.05 for loose)
 * @returns boolean indicating if device is stable
 */
export function computeStability(
	samples: SensorSample[],
	threshold: number,
): boolean {
	if (samples.length < 2) {
		// Not enough samples to determine stability
		return false;
	}

	// Compute magnitudes for each sample
	const accelMagnitudes = samples.map((s) => computeAccelMagnitude(s.accel));
	const gyroMagnitudes = samples.map((s) => computeGyroMagnitude(s.gyro));

	// Calculate variance (measure of how much values vary from mean)
	// Higher variance = more movement = less stable
	const accelVariance = computeVariance(accelMagnitudes);
	const gyroVariance = computeVariance(gyroMagnitudes);

	// Weighted combination: accelerometer movement is more important for stability
	// than rotation when holding camera
	const combinedMovement = accelVariance * 0.7 + gyroVariance * 0.3;

	// Device is stable if combined movement is below threshold
	return combinedMovement < threshold;
}

/**
 * Calculate variance of an array of numbers
 * Variance = average of squared differences from the mean
 * @param values - Array of numbers
 * @returns Variance (0 = no variation, higher = more variation)
 */
function computeVariance(values: number[]): number {
	if (values.length === 0) return 0;

	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	const squaredDiffs = values.map((v) => (v - mean) * (v - mean));
	const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

	return variance;
}

/**
 * Default threshold for stability detection
 * Lower = stricter (requires less movement)
 * Higher = looser (allows more movement)
 */
export const DEFAULT_STABILITY_THRESHOLD = 0.02;

/**
 * Target pitch angle for flat-lay photography (degrees)
 * +90° = camera pointing straight down (phone held horizontally above subject)
 */
export const TARGET_FLATLAY_PITCH_DEG = 90;

/**
 * Maximum acceptable deviation from target flat-lay pitch (degrees)
 * Prompt "Shoot from above" when deviation exceeds this
 */
export const MAX_FLATLAY_PITCH_DEVIATION_DEG = 15;

/**
 * Compute pitch angle (rotation around Y-axis) from accelerometer data
 * Pitch is the tilt forward/backward (flat-lay detection)
 *
 * Uses the formula: pitch = atan2(-x, sqrt(y² + z²)) converted to degrees
 * When phone is flat on table: x=0, z>0, atan2(0, z) = 0°
 * When phone held for flat-lay (camera down): x≈-9.8, pitch≈+90°
 * When phone upside down (camera up): x≈+9.8, pitch≈-90°
 *
 * @param accel - Accelerometer data (x, y, z)
 * @returns Pitch angle in degrees, range [-180, 180]
 *          +90° = camera pointing straight down (perfect flat-lay)
 *           0° = camera horizontal (phone flat on table)
 *          -90° = camera pointing straight up
 */
export function computePitchFromAccel(accel: AccelerometerData): number {
	const { x, y, z } = accel;

	// atan2(-x, sqrt(y² + z²)) gives pitch in radians
	// Negative x because when phone tilts forward (top down), x becomes negative
	const pitchRad = Math.atan2(-x, Math.sqrt(y * y + z * z));
	const pitchDeg = (pitchRad * 180) / Math.PI;

	return pitchDeg;
}

/**
 * Check if the device is in flat-lay position (camera pointing down)
 * @param pitchDeg - Pitch angle in degrees
 * @param toleranceDeg - Tolerance in degrees (default 15)
 * @returns true if pitch is within tolerance of +90° (camera pointing down)
 */
export function isFlatLayPosition(
	pitchDeg: number,
	toleranceDeg: number = MAX_FLATLAY_PITCH_DEVIATION_DEG,
): boolean {
	// Calculate deviation from target +90°
	const deviation = Math.abs(pitchDeg - TARGET_FLATLAY_PITCH_DEG);
	return deviation <= toleranceDeg;
}

/**
 * Compute flat-lay score based on pitch deviation
 * @param pitchDeg - Current pitch angle in degrees
 * @returns Score 0-100 (100 = perfect flat-lay at +90°)
 */
export function computeFlatLayScore(pitchDeg: number): number {
	const deviation = Math.abs(pitchDeg - TARGET_FLATLAY_PITCH_DEG);

	if (deviation <= MAX_FLATLAY_PITCH_DEVIATION_DEG) {
		return 100; // Perfect flat-lay
	}

	// Linear falloff: 100 at 15° deviation to 0 at 45° deviation
	const maxDeviation = 45;
	const score = Math.max(0, 100 - (deviation / maxDeviation) * 100);

	return Math.round(score);
}
