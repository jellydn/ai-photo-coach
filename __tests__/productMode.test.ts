/**
 * Product mode unit tests
 * Tests centering subscore and background detection
 */

import {
	BACKGROUND_VARIANCE_THRESHOLD,
	computeCenteringScore,
	isBackgroundCluttered,
	MAX_CENTERING_DEVIATION,
	PRODUCT_MODE_WEIGHTS,
} from "../src/scoring/types";

describe("Product Mode", () => {
	describe("computeCenteringScore", () => {
		it("should return 100 when centering is disabled", () => {
			const score = computeCenteringScore(false, 0.5, 0.5, 0);
			expect(score).toBe(100);
		});

		it("should return 100 when subject is perfectly centered", () => {
			const score = computeCenteringScore(true, 0.5, 0.5, 0);
			expect(score).toBe(100);
		});

		it("should return 100 when subject is within 5% of center", () => {
			const score = computeCenteringScore(true, 0.52, 0.48, 0);
			expect(score).toBe(100);
		});

		it("should return lower score when subject is off-center", () => {
			const score = computeCenteringScore(true, 0.6, 0.5, 0);
			// At 10% deviation from center (within the 5-20% range)
			expect(score).toBeLessThan(100);
			expect(score).toBeGreaterThanOrEqual(30);
		});

		it("should return minimum 30 at maximum deviation", () => {
			const score = computeCenteringScore(true, 0.3, 0.5, 0);
			// At 20% deviation
			expect(score).toBe(30);
		});

		it("should return 30 when subject is far from center", () => {
			const score = computeCenteringScore(true, 0.1, 0.1, 0);
			expect(score).toBe(30);
		});

		it("should penalize cluttered background", () => {
			const centeredScore = computeCenteringScore(true, 0.5, 0.5, 0);
			const clutteredScore = computeCenteringScore(
				true,
				0.5,
				0.5,
				BACKGROUND_VARIANCE_THRESHOLD + 0.1,
			);
			expect(clutteredScore).toBeLessThan(centeredScore);
		});

		it("should apply increasing penalty for higher variance", () => {
			const lowVariance = computeCenteringScore(true, 0.5, 0.5, 0.15);
			const highVariance = computeCenteringScore(true, 0.5, 0.5, 0.3);
			expect(highVariance).toBeLessThan(lowVariance);
		});

		it("should cap penalty at 30 points", () => {
			const score = computeCenteringScore(true, 0.5, 0.5, 1.0);
			// Even with extreme variance, shouldn't go below 70 (100 - 30)
			expect(score).toBeGreaterThanOrEqual(70);
		});
	});

	describe("isBackgroundCluttered", () => {
		it("should return false for clean background (low variance)", () => {
			expect(isBackgroundCluttered(0.05)).toBe(false);
			expect(isBackgroundCluttered(0.1)).toBe(false);
			expect(isBackgroundCluttered(BACKGROUND_VARIANCE_THRESHOLD - 0.01)).toBe(
				false,
			);
		});

		it("should return true for cluttered background (high variance)", () => {
			expect(isBackgroundCluttered(BACKGROUND_VARIANCE_THRESHOLD + 0.01)).toBe(
				true,
			);
			expect(isBackgroundCluttered(0.2)).toBe(true);
			expect(isBackgroundCluttered(0.5)).toBe(true);
		});
	});

	describe("PRODUCT_MODE_WEIGHTS", () => {
		it("should have correct weight values", () => {
			expect(PRODUCT_MODE_WEIGHTS.centering).toBe(0.25);
			expect(PRODUCT_MODE_WEIGHTS.stability).toBe(0.2);
			expect(PRODUCT_MODE_WEIGHTS.level).toBe(0.1);
			expect(PRODUCT_MODE_WEIGHTS.framing).toBe(0.15);
			expect(PRODUCT_MODE_WEIGHTS.lighting).toBe(0.2);
			expect(PRODUCT_MODE_WEIGHTS.aesthetic).toBe(0.1);
			expect(PRODUCT_MODE_WEIGHTS.flatLay).toBe(0);
			expect(PRODUCT_MODE_WEIGHTS.groupFraming).toBe(0);
		});

		it("should have weights that sum to 1.0", () => {
			const totalWeight =
				PRODUCT_MODE_WEIGHTS.stability +
				PRODUCT_MODE_WEIGHTS.level +
				PRODUCT_MODE_WEIGHTS.framing +
				PRODUCT_MODE_WEIGHTS.lighting +
				PRODUCT_MODE_WEIGHTS.aesthetic +
				PRODUCT_MODE_WEIGHTS.flatLay +
				PRODUCT_MODE_WEIGHTS.groupFraming +
				PRODUCT_MODE_WEIGHTS.centering;
			expect(totalWeight).toBe(1.0);
		});
	});

	describe("Constants", () => {
		it("should have correct MAX_CENTERING_DEVIATION", () => {
			expect(MAX_CENTERING_DEVIATION).toBe(0.2);
		});

		it("should have correct BACKGROUND_VARIANCE_THRESHOLD", () => {
			expect(BACKGROUND_VARIANCE_THRESHOLD).toBe(0.15);
		});
	});
});
