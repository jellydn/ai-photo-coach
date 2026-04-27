import {
	type AccelerometerData,
	computeAccelMagnitude,
	computeGyroMagnitude,
	computeStability,
	DEFAULT_STABILITY_THRESHOLD,
	type GyroscopeData,
	type SensorSample,
	STABILITY_WINDOW_MS,
} from "../src/sensors/math";

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

describe("stability constants", () => {
	it("STABILITY_WINDOW_MS is 500ms", () => {
		expect(STABILITY_WINDOW_MS).toBe(500);
	});

	it("DEFAULT_STABILITY_THRESHOLD is 0.02", () => {
		expect(DEFAULT_STABILITY_THRESHOLD).toBe(0.02);
	});
});
