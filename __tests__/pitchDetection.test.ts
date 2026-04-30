/**
 * Unit tests for pitch detection and food mode flat-lay functionality
 */

import {
	computeFlatLayScore as computeFlatLaySubscore,
	FOOD_MODE_WEIGHTS,
} from "../src/scoring/types";
import {
	computeFlatLayScore,
	computePitchFromAccel,
	isFlatLayPosition,
	MAX_FLATLAY_PITCH_DEVIATION_DEG,
	TARGET_FLATLAY_PITCH_DEG,
} from "../src/sensors/math";

describe("Pitch Detection", () => {
	describe("computePitchFromAccel", () => {
		it("returns 0 when phone is flat on table (z=9.8, x=0)", () => {
			const accel = { x: 0, y: 0, z: 9.8 };
			const pitch = computePitchFromAccel(accel);
			expect(pitch).toBeCloseTo(0, 1);
		});

		it("returns ~+90 when phone is in flat-lay position (camera down, x=-9.8)", () => {
			const accel = { x: -9.8, y: 0, z: 0 };
			const pitch = computePitchFromAccel(accel);
			expect(pitch).toBeCloseTo(90, 1);
		});

		it("returns ~-90 when phone is upside down (camera up, x=9.8)", () => {
			const accel = { x: 9.8, y: 0, z: 0 };
			const pitch = computePitchFromAccel(accel);
			expect(pitch).toBeCloseTo(-90, 1);
		});

		it("returns positive pitch when tilted forward (toward flat-lay)", () => {
			const accel = { x: -5, y: 0, z: 8 };
			const pitch = computePitchFromAccel(accel);
			expect(pitch).toBeGreaterThan(0);
		});

		it("returns negative pitch when tilted backward (away from flat-lay)", () => {
			const accel = { x: 5, y: 0, z: 8 };
			const pitch = computePitchFromAccel(accel);
			expect(pitch).toBeLessThan(0);
		});

		it("handles zero gravity edge case", () => {
			const accel = { x: 0, y: 0, z: 0 };
			const pitch = computePitchFromAccel(accel);
			expect(pitch).toBeCloseTo(0, 1);
		});
	});

	describe("isFlatLayPosition", () => {
		it("returns true at exactly +90°", () => {
			expect(isFlatLayPosition(90)).toBe(true);
		});

		it("returns true within default tolerance (15°)", () => {
			expect(isFlatLayPosition(80)).toBe(true);
			expect(isFlatLayPosition(100)).toBe(true);
			expect(isFlatLayPosition(75)).toBe(true);
			expect(isFlatLayPosition(105)).toBe(true);
		});

		it("returns false outside tolerance", () => {
			expect(isFlatLayPosition(60)).toBe(false);
			expect(isFlatLayPosition(120)).toBe(false);
			expect(isFlatLayPosition(0)).toBe(false);
		});

		it("respects custom tolerance", () => {
			expect(isFlatLayPosition(70, 20)).toBe(true);
			expect(isFlatLayPosition(70, 15)).toBe(false);
		});

		it("returns true at boundary values", () => {
			const tolerance = MAX_FLATLAY_PITCH_DEVIATION_DEG;
			expect(isFlatLayPosition(90 + tolerance)).toBe(true);
			expect(isFlatLayPosition(90 - tolerance)).toBe(true);
		});
	});

	describe("computeFlatLayScore (sensors)", () => {
		it("returns 100 at exactly +90°", () => {
			expect(computeFlatLayScore(90)).toBe(100);
		});

		it("returns 100 within 15° deviation", () => {
			expect(computeFlatLayScore(80)).toBe(100);
			expect(computeFlatLayScore(100)).toBe(100);
			expect(computeFlatLayScore(75)).toBe(100);
		});

		it("returns lower scores for larger deviations", () => {
			const score30 = computeFlatLayScore(60); // 30° deviation
			const score45 = computeFlatLayScore(45); // 45° deviation
			expect(score30).toBeLessThan(100);
			expect(score45).toBeLessThan(score30);
		});

		it("returns 0 at 45° deviation or more", () => {
			expect(computeFlatLayScore(45)).toBe(0);
			expect(computeFlatLayScore(30)).toBe(0);
			expect(computeFlatLayScore(0)).toBe(0);
		});

		it("handles negative angles correctly", () => {
			expect(computeFlatLayScore(-90)).toBe(0); // Camera pointing up
			expect(computeFlatLayScore(-45)).toBeLessThan(50);
		});
	});

	describe("Constants", () => {
		it("TARGET_FLATLAY_PITCH_DEG is +90", () => {
			expect(TARGET_FLATLAY_PITCH_DEG).toBe(90);
		});

		it("MAX_FLATLAY_PITCH_DEVIATION_DEG is 15", () => {
			expect(MAX_FLATLAY_PITCH_DEVIATION_DEG).toBe(15);
		});
	});
});

describe("Flat-Lay Scoring", () => {
	describe("computeFlatLayScore (scoring module)", () => {
		it("returns 100 when flat-lay is not enabled", () => {
			expect(computeFlatLaySubscore(false, 0)).toBe(100);
			expect(computeFlatLaySubscore(false, 90)).toBe(100);
			expect(computeFlatLaySubscore(false, 45)).toBe(100);
		});

		it("returns 100 when enabled and at target pitch", () => {
			expect(computeFlatLaySubscore(true, 90)).toBe(100);
		});

		it("returns 100 when enabled and within 15° deviation", () => {
			expect(computeFlatLaySubscore(true, 80)).toBe(100);
			expect(computeFlatLaySubscore(true, 100)).toBe(100);
		});

		it("returns decreasing scores for increasing deviation", () => {
			const score20 = computeFlatLaySubscore(true, 70); // 20° deviation
			const score30 = computeFlatLaySubscore(true, 60); // 30° deviation
			const score40 = computeFlatLaySubscore(true, 50); // 40° deviation
			expect(score20).toBeGreaterThan(score30);
			expect(score30).toBeGreaterThan(score40);
		});

		it("returns 0 at 45° or more deviation", () => {
			expect(computeFlatLaySubscore(true, 45)).toBe(0);
			expect(computeFlatLaySubscore(true, 30)).toBe(0);
			expect(computeFlatLaySubscore(true, 0)).toBe(0);
			expect(computeFlatLaySubscore(true, -90)).toBe(0); // Camera pointing up
		});
	});

	describe("FOOD_MODE_WEIGHTS", () => {
		it("has all subscore weights defined", () => {
			expect(FOOD_MODE_WEIGHTS.stability).toBeDefined();
			expect(FOOD_MODE_WEIGHTS.level).toBeDefined();
			expect(FOOD_MODE_WEIGHTS.framing).toBeDefined();
			expect(FOOD_MODE_WEIGHTS.lighting).toBeDefined();
			expect(FOOD_MODE_WEIGHTS.aesthetic).toBeDefined();
			expect(FOOD_MODE_WEIGHTS.flatLay).toBeDefined();
		});

		it("weights sum to approximately 1.0", () => {
			const total =
				FOOD_MODE_WEIGHTS.stability +
				FOOD_MODE_WEIGHTS.level +
				FOOD_MODE_WEIGHTS.framing +
				FOOD_MODE_WEIGHTS.lighting +
				FOOD_MODE_WEIGHTS.aesthetic +
				FOOD_MODE_WEIGHTS.flatLay;
			expect(total).toBeCloseTo(1.0, 2);
		});

		it("emphasizes flat-lay for food mode", () => {
			expect(FOOD_MODE_WEIGHTS.flatLay).toBe(0.25);
		});
	});
});
