/**
 * Group Photo mode unit tests
 * Tests group framing analysis, multi-face detection, and scoring
 */

import {
	computeGroupFramingAnalysis,
	computeTotalFaceAreaPercent,
	type DetectedFace,
	GROUP_EDGE_MARGIN_PCT,
	GROUP_MAX_TOTAL_FACE_AREA_PCT,
	GROUP_MIN_TOTAL_FACE_AREA_PCT,
	isFaceTouchingEdge,
} from "../src/faceDetection/types";
import {
	computeGroupFramingScore,
	GROUP_MODE_WEIGHTS,
} from "../src/scoring/types";

// Helper to create a detected face
function createFace(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
): DetectedFace {
	return {
		id,
		bounds: { x, y, width, height },
		confidence: 0.9,
	};
}

describe("Group Photo Mode", () => {
	describe("isFaceTouchingEdge", () => {
		it("should return true when face touches left edge", () => {
			const face = createFace("1", 0.02, 0.3, 0.2, 0.3); // x < 5%
			expect(isFaceTouchingEdge(face)).toBe(true);
		});

		it("should return true when face touches right edge", () => {
			const face = createFace("1", 0.85, 0.3, 0.2, 0.3); // x + width > 95%
			expect(isFaceTouchingEdge(face)).toBe(true);
		});

		it("should return true when face touches top edge", () => {
			const face = createFace("1", 0.3, 0.02, 0.3, 0.2); // y < 5%
			expect(isFaceTouchingEdge(face)).toBe(true);
		});

		it("should return true when face touches bottom edge", () => {
			const face = createFace("1", 0.3, 0.85, 0.3, 0.2); // y + height > 95%
			expect(isFaceTouchingEdge(face)).toBe(true);
		});

		it("should return false when face is fully inside frame", () => {
			const face = createFace("1", 0.3, 0.3, 0.2, 0.2); // Centered, away from edges
			expect(isFaceTouchingEdge(face)).toBe(false);
		});

		it("should respect custom margin percentage", () => {
			const face = createFace("1", 0.08, 0.3, 0.2, 0.3); // x = 8%, default margin 5%
			expect(isFaceTouchingEdge(face)).toBe(false);
			expect(isFaceTouchingEdge(face, 10)).toBe(true); // 10% margin
		});
	});

	describe("computeTotalFaceAreaPercent", () => {
		it("should return 0 for empty array", () => {
			expect(computeTotalFaceAreaPercent([])).toBe(0);
		});

		it("should calculate single face area correctly", () => {
			const face = createFace("1", 0.3, 0.3, 0.2, 0.3); // 0.2 * 0.3 = 6% of frame
			expect(computeTotalFaceAreaPercent([face])).toBe(6);
		});

		it("should sum multiple face areas", () => {
			const face1 = createFace("1", 0.2, 0.3, 0.15, 0.2); // 3%
			const face2 = createFace("2", 0.6, 0.3, 0.15, 0.2); // 3%
			const face3 = createFace("3", 0.4, 0.6, 0.1, 0.15); // 1.5%
			// Total: 7.5%
			expect(computeTotalFaceAreaPercent([face1, face2, face3])).toBe(7.5);
		});
	});

	describe("computeGroupFramingAnalysis", () => {
		it("should handle empty face array", () => {
			const analysis = computeGroupFramingAnalysis([]);
			expect(analysis.faceCount).toBe(0);
			expect(analysis.totalFaceAreaPercent).toBe(0);
			expect(analysis.allFacesInFrame).toBe(true);
			expect(analysis.prompt).toBeNull();
		});

		it("should handle single face (no group prompt)", () => {
			const face = createFace("1", 0.3, 0.3, 0.2, 0.3);
			const analysis = computeGroupFramingAnalysis([face]);
			expect(analysis.faceCount).toBe(1);
			expect(analysis.prompt).toBeNull(); // No group prompt for single face
		});

		it("should detect edge-touching faces", () => {
			const faces = [
				createFace("1", 0.3, 0.3, 0.2, 0.2), // Centered - OK
				createFace("2", 0.02, 0.3, 0.2, 0.2), // Touching left edge
				createFace("3", 0.8, 0.02, 0.15, 0.15), // Touching top-right area
			];
			const analysis = computeGroupFramingAnalysis(faces);
			expect(analysis.faceCount).toBe(3);
			expect(analysis.edgeTouchingFaces).toHaveLength(2);
			expect(analysis.allFacesInFrame).toBe(false);
			expect(analysis.prompt).toBe("Everyone in frame?");
		});

		it("should prompt 'Step back' when total area too large", () => {
			// Create large faces away from edges (total > 70%)
			// Need: x >= 0.05, x + width <= 0.95, y >= 0.05, y + height <= 0.95
			// After careful calculation, these faces are safe from edges:
			const noTouchingFaces = [
				createFace("1", 0.08, 0.06, 0.42, 0.45), // 18.9%
				createFace("2", 0.52, 0.06, 0.42, 0.45), // 18.9%, right at 0.94 OK
				createFace("3", 0.08, 0.55, 0.42, 0.39), // 16.38%
				createFace("4", 0.52, 0.55, 0.42, 0.39), // 16.38%, right at 0.94 OK
			];
			// Total: ~70.56% > 70%, all safe from edges
			const analysis = computeGroupFramingAnalysis(noTouchingFaces);
			expect(analysis.totalFaceAreaPercent).toBeGreaterThan(
				GROUP_MAX_TOTAL_FACE_AREA_PCT,
			);
			expect(analysis.isTooLarge).toBe(true);
			expect(analysis.allFacesInFrame).toBe(true);
			expect(analysis.prompt).toBe("Step back");
		});

		it("should prompt 'Step closer' when total area too small", () => {
			const faces = [
				createFace("1", 0.3, 0.3, 0.05, 0.08), // 0.4%
				createFace("2", 0.6, 0.3, 0.06, 0.09), // 0.54%
			];
			// Total: ~0.94% < 8%
			const analysis = computeGroupFramingAnalysis(faces);
			expect(analysis.totalFaceAreaPercent).toBeLessThan(
				GROUP_MIN_TOTAL_FACE_AREA_PCT,
			);
			expect(analysis.isTooSmall).toBe(true);
			expect(analysis.prompt).toBe("Step closer");
		});

		it("should return valid analysis when all conditions good", () => {
			const faces = [
				createFace("1", 0.15, 0.25, 0.2, 0.25), // 5%
				createFace("2", 0.55, 0.25, 0.2, 0.25), // 5%
				createFace("3", 0.35, 0.55, 0.18, 0.22), // 3.96%
			];
			// Total: ~13.96% (between 8% and 70%)
			const analysis = computeGroupFramingAnalysis(faces);
			expect(analysis.faceCount).toBe(3);
			expect(analysis.allFacesInFrame).toBe(true);
			expect(analysis.isTotalAreaValid).toBe(true);
			expect(analysis.prompt).toBeNull();
		});

		it("should prioritize edge detection over area issues", () => {
			// Face touching edge AND too small
			const faces = [
				createFace("1", 0.02, 0.3, 0.05, 0.08), // Touching edge + small
				createFace("2", 0.6, 0.3, 0.06, 0.09), // Small
			];
			const analysis = computeGroupFramingAnalysis(faces);
			// Edge touching takes priority
			expect(analysis.prompt).toBe("Everyone in frame?");
		});
	});

	describe("computeGroupFramingScore", () => {
		it("should return 100 when group framing disabled", () => {
			const score = computeGroupFramingScore(false, 3, 20, 0);
			expect(score).toBe(100);
		});

		it("should return low score when less than 2 faces", () => {
			const score = computeGroupFramingScore(true, 1, 15, 0);
			expect(score).toBe(50);
		});

		it("should return 100 when all conditions optimal", () => {
			const score = computeGroupFramingScore(true, 3, 35, 0);
			expect(score).toBe(100);
		});

		it("should penalize edge-touching faces", () => {
			// At 35% area (optimal), gets +5 bonus, but edge touching penalizes -25 each
			const score1 = computeGroupFramingScore(true, 3, 35, 1);
			expect(score1).toBe(80); // 100 - 25 + 5 bonus

			const score2 = computeGroupFramingScore(true, 3, 35, 2);
			expect(score2).toBe(55); // 100 - 50 + 5 bonus

			// With 4 edge-touching faces: 100 - 100 + 5 = 5 (not capped to 0)
			const score4 = computeGroupFramingScore(true, 3, 35, 4);
			expect(score4).toBe(5); // 100 - 100 + 5 bonus
		});

		it("should penalize total area too small", () => {
			// At 5% (3% below min of 8%), penalty = 3 * 2 = 6, score = 94
			const score = computeGroupFramingScore(true, 3, 5, 0);
			expect(score).toBeLessThan(100);
			expect(score).toBeGreaterThan(50);
		});

		it("should penalize total area too large", () => {
			// At 80% (10% above max of 70%), penalty = 10, score = 90
			const score = computeGroupFramingScore(true, 3, 80, 0);
			expect(score).toBeLessThan(100);
			expect(score).toBeGreaterThanOrEqual(60);
		});

		it("should give bonus for optimal total area", () => {
			// At 35% (target), within 10% deviation, should get bonus
			const score = computeGroupFramingScore(true, 3, 35, 0);
			expect(score).toBe(100);
		});

		it("should handle combined penalties", () => {
			// 2 edge-touching faces (-50) + area too large (-30 max)
			const score = computeGroupFramingScore(true, 5, 85, 2);
			// Edge: 2 * 25 = 50 penalty
			// Area: 85 - 70 = 15, capped at 40, so 15 penalty
			// Total: 100 - 50 - 15 = 35, but with deviation penalties
			expect(score).toBeLessThanOrEqual(50);
		});

		it("should cap score at 0", () => {
			const score = computeGroupFramingScore(true, 10, 200, 10);
			expect(score).toBe(0);
		});
	});

	describe("GROUP_MODE_WEIGHTS", () => {
		it("should have correct weights for group photo mode", () => {
			expect(GROUP_MODE_WEIGHTS.groupFraming).toBe(0.25);
			expect(GROUP_MODE_WEIGHTS.stability).toBe(0.2);
			expect(GROUP_MODE_WEIGHTS.level).toBe(0.15);
			expect(GROUP_MODE_WEIGHTS.framing).toBe(0.15);
			expect(GROUP_MODE_WEIGHTS.lighting).toBe(0.15);
			expect(GROUP_MODE_WEIGHTS.aesthetic).toBe(0.1);
			expect(GROUP_MODE_WEIGHTS.flatLay).toBe(0);
		});

		it("should sum to 1.0", () => {
			const sum =
				GROUP_MODE_WEIGHTS.stability +
				GROUP_MODE_WEIGHTS.level +
				GROUP_MODE_WEIGHTS.framing +
				GROUP_MODE_WEIGHTS.lighting +
				GROUP_MODE_WEIGHTS.aesthetic +
				GROUP_MODE_WEIGHTS.flatLay +
				GROUP_MODE_WEIGHTS.groupFraming;
			expect(sum).toBe(1.0);
		});
	});

	describe("Group photo mode constants", () => {
		it("should have correct area thresholds", () => {
			expect(GROUP_MIN_TOTAL_FACE_AREA_PCT).toBe(8);
			expect(GROUP_MAX_TOTAL_FACE_AREA_PCT).toBe(70);
		});

		it("should have correct edge margin", () => {
			expect(GROUP_EDGE_MARGIN_PCT).toBe(5);
		});
	});
});
