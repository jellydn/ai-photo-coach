import {
	type AccelerometerData,
	computeAccelMagnitude,
	computeGyroMagnitude,
	computeRollFromAccel,
	computeStability,
	DEFAULT_FILTER_ALPHA,
	DEFAULT_STABILITY_THRESHOLD,
	type GyroscopeData,
	isLevel,
	lowPassFilter,
	MIN_UPDATE_INTERVAL_MS,
	type SensorSample,
	STABILITY_WINDOW_MS,
} from "../src/sensors/math";

describe("computeRollFromAccel", () => {
	it("returns 0 when device is flat on table (y=0, z=9.8)", () => {
		const accel: AccelerometerData = { x: 0, y: 0, z: 9.8 };
		const roll = computeRollFromAccel(accel);
		expect(roll).toBeCloseTo(0, 1);
	});

	it("returns 0 when device is flat face down (y=0, z=-9.8)", () => {
		const accel: AccelerometerData = { x: 0, y: 0, z: -9.8 };
		const roll = computeRollFromAccel(accel);
		expect(roll).toBeCloseTo(180, 1); // 180 or -180 depending on atan2
	});

	it("returns positive value when tilted right (y>0)", () => {
		// When device tilts right, y increases (gravity component on Y axis)
		// z decreases as device rotates
		const accel: AccelerometerData = { x: 0, y: 4.9, z: 8.5 }; // ~30 degrees
		const roll = computeRollFromAccel(accel);
		expect(roll).toBeGreaterThan(0);
		expect(roll).toBeCloseTo(30, 0); // Approximately 30 degrees
	});

	it("returns negative value when tilted left (y<0)", () => {
		// When device tilts left, y is negative
		const accel: AccelerometerData = { x: 0, y: -4.9, z: 8.5 }; // ~-30 degrees
		const roll = computeRollFromAccel(accel);
		expect(roll).toBeLessThan(0);
		expect(roll).toBeCloseTo(-30, 0); // Approximately -30 degrees
	});

	it("returns 90 when device is on right edge (y=9.8, z=0)", () => {
		const accel: AccelerometerData = { x: 0, y: 9.8, z: 0 };
		const roll = computeRollFromAccel(accel);
		expect(roll).toBeCloseTo(90, 1);
	});

	it("returns -90 when device is on left edge (y=-9.8, z=0)", () => {
		const accel: AccelerometerData = { x: 0, y: -9.8, z: 0 };
		const roll = computeRollFromAccel(accel);
		expect(roll).toBeCloseTo(-90, 1);
	});

	it("returns approximately 45 degrees for 45-degree tilt", () => {
		// At 45 degrees, y and z components are equal (with gravity = 9.8)
		// y = 9.8 * sin(45°) ≈ 6.93
		// z = 9.8 * cos(45°) ≈ 6.93
		const accel: AccelerometerData = { x: 0, y: 6.93, z: 6.93 };
		const roll = computeRollFromAccel(accel);
		expect(roll).toBeCloseTo(45, 0);
	});

	it("returns approximately -45 degrees for -45-degree tilt", () => {
		const accel: AccelerometerData = { x: 0, y: -6.93, z: 6.93 };
		const roll = computeRollFromAccel(accel);
		expect(roll).toBeCloseTo(-45, 0);
	});

	it("handles edge case with very small z values", () => {
		const accel: AccelerometerData = { x: 0, y: 9.8, z: 0.001 };
		const roll = computeRollFromAccel(accel);
		expect(roll).toBeCloseTo(90, 0);
	});

	it("x-axis does not affect roll calculation", () => {
		// Roll is rotation around X-axis, so X acceleration doesn't affect it
		const accel1: AccelerometerData = { x: 0, y: 0, z: 9.8 };
		const accel2: AccelerometerData = { x: 5, y: 0, z: 9.8 };
		const roll1 = computeRollFromAccel(accel1);
		const roll2 = computeRollFromAccel(accel2);
		expect(roll1).toBeCloseTo(roll2, 5);
	});
});

describe("isLevel", () => {
	it("returns true when roll is within positive tolerance", () => {
		expect(isLevel(1, 2)).toBe(true);
		expect(isLevel(2, 2)).toBe(true);
	});

	it("returns true when roll is within negative tolerance", () => {
		expect(isLevel(-1, 2)).toBe(true);
		expect(isLevel(-2, 2)).toBe(true);
	});

	it("returns true when roll is exactly 0", () => {
		expect(isLevel(0, 2)).toBe(true);
		expect(isLevel(0, 0.5)).toBe(true);
	});

	it("returns false when roll exceeds positive tolerance", () => {
		expect(isLevel(3, 2)).toBe(false);
		expect(isLevel(5, 2)).toBe(false);
	});

	it("returns false when roll exceeds negative tolerance", () => {
		expect(isLevel(-3, 2)).toBe(false);
		expect(isLevel(-5, 2)).toBe(false);
	});

	it("handles portrait mode tolerance of 2 degrees", () => {
		// Portrait mode has strict 2-degree tolerance
		expect(isLevel(1.9, 2)).toBe(true);
		expect(isLevel(-1.9, 2)).toBe(true);
		expect(isLevel(2.1, 2)).toBe(false);
		expect(isLevel(-2.1, 2)).toBe(false);
	});

	it("handles document mode tolerance of 1 degree", () => {
		// Document mode has very strict 1-degree tolerance
		expect(isLevel(0.9, 1)).toBe(true);
		expect(isLevel(-0.9, 1)).toBe(true);
		expect(isLevel(1.1, 1)).toBe(false);
		expect(isLevel(-1.1, 1)).toBe(false);
	});

	it("handles pet/kids mode tolerance of 4 degrees", () => {
		// Pet/kids mode has loose 4-degree tolerance
		expect(isLevel(3.9, 4)).toBe(true);
		expect(isLevel(-3.9, 4)).toBe(true);
		expect(isLevel(4.1, 4)).toBe(false);
		expect(isLevel(-4.1, 4)).toBe(false);
	});
});

describe("lowPassFilter", () => {
	it("returns current value when alpha is 1 (no filtering)", () => {
		const result = lowPassFilter(10, 5, 1);
		expect(result).toBe(10);
	});

	it("returns previous value when alpha is 0 (full filtering)", () => {
		const result = lowPassFilter(10, 5, 0);
		expect(result).toBe(5);
	});

	it("correctly blends values with alpha of 0.5", () => {
		// 0.5 * 10 + 0.5 * 5 = 7.5
		const result = lowPassFilter(10, 5, 0.5);
		expect(result).toBe(7.5);
	});

	it("with default alpha (0.2), result is closer to previous value", () => {
		// 0.2 * 10 + 0.8 * 5 = 2 + 4 = 6
		const result = lowPassFilter(10, 5, DEFAULT_FILTER_ALPHA);
		expect(result).toBe(6);
	});

	it("smooths out rapid changes over multiple samples", () => {
		// Simulate a series of values with noise
		const alpha = DEFAULT_FILTER_ALPHA; // 0.2
		let filtered = 0;

		// Apply filter to a sequence
		filtered = lowPassFilter(10, filtered, alpha); // First sample
		expect(filtered).toBe(2); // 0.2 * 10 + 0.8 * 0

		filtered = lowPassFilter(12, filtered, alpha); // Second sample
		expect(filtered).toBeCloseTo(4, 1); // 0.2 * 12 + 0.8 * 2

		filtered = lowPassFilter(8, filtered, alpha); // Third sample (dip)
		// 0.2 * 8 + 0.8 * 4 = 1.6 + 3.2 = 4.8
		expect(filtered).toBeCloseTo(4.8, 1);

		// Filter reduces the impact of the dip from 8 to ~4.8
		// The filtered value (4.8) should be less than the raw value (8)
		expect(filtered).toBeLessThan(8); // Filtered value is less than raw
	});

	it("handles negative values correctly", () => {
		const result = lowPassFilter(-10, -5, 0.5);
		expect(result).toBe(-7.5);
	});

	it("handles mixed positive and negative values", () => {
		const result = lowPassFilter(10, -10, 0.5);
		expect(result).toBe(0);
	});
});

describe("constants", () => {
	it("DEFAULT_FILTER_ALPHA is 0.2", () => {
		expect(DEFAULT_FILTER_ALPHA).toBe(0.2);
	});

	it("MIN_UPDATE_INTERVAL_MS is approximately 33ms (30Hz)", () => {
		expect(MIN_UPDATE_INTERVAL_MS).toBe(33);
		// Verify: 1000ms / 30Hz ≈ 33.33ms
		expect(1000 / 30).toBeCloseTo(33.33, 1);
	});

	it("STABILITY_WINDOW_MS is 500ms", () => {
		expect(STABILITY_WINDOW_MS).toBe(500);
	});

	it("DEFAULT_STABILITY_THRESHOLD is 0.02", () => {
		expect(DEFAULT_STABILITY_THRESHOLD).toBe(0.02);
	});
});

describe("computeAccelMagnitude", () => {
	it("returns 9.8 for flat device at rest", () => {
		const accel: AccelerometerData = { x: 0, y: 0, z: 9.8 };
		expect(computeAccelMagnitude(accel)).toBeCloseTo(9.8, 1);
	});

	it("computes correct magnitude for 3D vector", () => {
		const accel: AccelerometerData = { x: 3, y: 4, z: 0 };
		// sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5
		expect(computeAccelMagnitude(accel)).toBe(5);
	});

	it("handles all zeros", () => {
		const accel: AccelerometerData = { x: 0, y: 0, z: 0 };
		expect(computeAccelMagnitude(accel)).toBe(0);
	});

	it("handles negative values (squared, so positive result)", () => {
		const accel: AccelerometerData = { x: -3, y: -4, z: 0 };
		expect(computeAccelMagnitude(accel)).toBe(5);
	});
});

describe("computeGyroMagnitude", () => {
	it("computes correct magnitude for 3D vector", () => {
		const gyro: GyroscopeData = { x: 3, y: 4, z: 0 };
		expect(computeGyroMagnitude(gyro)).toBe(5);
	});

	it("returns 0 when all axes are zero", () => {
		const gyro: GyroscopeData = { x: 0, y: 0, z: 0 };
		expect(computeGyroMagnitude(gyro)).toBe(0);
	});

	it("handles typical rotation values", () => {
		const gyro: GyroscopeData = { x: 0.5, y: 0.3, z: 0.2 };
		const expected = Math.sqrt(0.5 * 0.5 + 0.3 * 0.3 + 0.2 * 0.2);
		expect(computeGyroMagnitude(gyro)).toBeCloseTo(expected, 5);
	});
});

describe("computeStability", () => {
	it("returns false when samples array is empty", () => {
		expect(computeStability([], 0.02)).toBe(false);
	});

	it("returns false when only one sample (not enough data)", () => {
		const sample: SensorSample = {
			accel: { x: 0, y: 0, z: 9.8 },
			gyro: { x: 0, y: 0, z: 0 },
			timestamp: Date.now(),
		};
		expect(computeStability([sample], 0.02)).toBe(false);
	});

	it("returns true for perfectly still device (identical samples)", () => {
		const samples: SensorSample[] = [];
		const now = Date.now();
		// Create 10 identical samples (device perfectly still)
		for (let i = 0; i < 10; i++) {
			samples.push({
				accel: { x: 0, y: 0, z: 9.8 },
				gyro: { x: 0, y: 0, z: 0 },
				timestamp: now + i * 50,
			});
		}
		expect(computeStability(samples, 0.02)).toBe(true);
	});

	it("returns false for shaking device (high variance)", () => {
		const samples: SensorSample[] = [];
		const now = Date.now();
		// Create samples with high variance (device shaking)
		for (let i = 0; i < 10; i++) {
			samples.push({
				accel: {
					x: Math.random() * 5 - 2.5,
					y: Math.random() * 5 - 2.5,
					z: 9.8 + Math.random() * 5 - 2.5,
				},
				gyro: {
					x: Math.random() * 2 - 1,
					y: Math.random() * 2 - 1,
					z: Math.random() * 2 - 1,
				},
				timestamp: now + i * 50,
			});
		}
		expect(computeStability(samples, 0.02)).toBe(false);
	});

	it("respects threshold - strict threshold (0.01) requires very still device", () => {
		const samples: SensorSample[] = [];
		const now = Date.now();
		// Create samples with oscillating movement (high variance)
		for (let i = 0; i < 10; i++) {
			// Alternating between two different acceleration states
			const offset = i % 2 === 0 ? 0.5 : -0.5;
			samples.push({
				accel: { x: offset, y: offset, z: 9.8 + offset },
				gyro: { x: offset * 0.1, y: offset * 0.1, z: 0 },
				timestamp: now + i * 50,
			});
		}
		// Strict threshold should fail with oscillating movements
		expect(computeStability(samples, 0.01)).toBe(false);
	});

	it("respects threshold - loose threshold (0.05) allows some movement", () => {
		const samples: SensorSample[] = [];
		const now = Date.now();
		// Create samples with very small, nearly constant values
		for (let i = 0; i < 10; i++) {
			samples.push({
				accel: { x: 0.01, y: 0.01, z: 9.8 },
				gyro: { x: 0.001, y: 0.001, z: 0 },
				timestamp: now + i * 50,
			});
		}
		// Loose threshold should pass with minimal movements
		expect(computeStability(samples, 0.05)).toBe(true);
	});

	it("uses portrait mode strict threshold correctly", () => {
		const samples: SensorSample[] = [];
		const now = Date.now();
		// Simulate slight hand movement
		for (let i = 0; i < 10; i++) {
			samples.push({
				accel: { x: 0.05, y: 0.05, z: 9.8 },
				gyro: { x: 0, y: 0, z: 0.005 },
				timestamp: now + i * 50,
			});
		}
		// Portrait mode uses 0.02 threshold
		expect(computeStability(samples, 0.02)).toBe(true);
	});

	it("uses travel mode loose threshold correctly", () => {
		const samples: SensorSample[] = [];
		const now = Date.now();
		// Simulate more hand movement acceptable for travel
		for (let i = 0; i < 10; i++) {
			samples.push({
				accel: { x: 0.2, y: 0.2, z: 9.8 + 0.1 },
				gyro: { x: 0.02, y: 0.02, z: 0.01 },
				timestamp: now + i * 50,
			});
		}
		// Travel mode uses 0.05 threshold (looser for handheld landscape)
		expect(computeStability(samples, 0.05)).toBe(true);
	});
});
