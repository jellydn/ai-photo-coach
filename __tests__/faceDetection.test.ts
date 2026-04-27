/**
 * Unit tests for face detection types and utilities
 */

import {
	calculateFaceAreaPercent,
	computeFaceFramingGuidance,
	type DetectedFace,
	downscaleFrame,
	type FaceBounds,
	MAX_ML_LONG_EDGE,
	MIN_FACE_CONFIDENCE,
	selectPrimaryFace,
	TARGET_FACE_DETECTION_FPS,
} from "../src/faceDetection/types";

describe("Face Detection Types & Utilities", () => {
	describe("downscaleFrame", () => {
		it("should not scale when frame is smaller than max long edge", () => {
			const result = downscaleFrame(300, 200, 320);
			expect(result).toEqual({ width: 300, height: 200 });
		});

		it("should scale when width is larger than max long edge", () => {
			const result = downscaleFrame(1920, 1080, 320);
			expect(result.width).toBe(320);
			expect(result.height).toBe(180); // 1080 * (320/1920)
		});

		it("should scale when height is larger than max long edge", () => {
			const result = downscaleFrame(1080, 1920, 320);
			expect(result.width).toBe(180); // 1080 * (320/1920)
			expect(result.height).toBe(320);
		});

		it("should use default max long edge of 320px", () => {
			const result = downscaleFrame(300, 200);
			expect(result).toEqual({ width: 300, height: 200 });
		});

		it("should maintain aspect ratio", () => {
			const result = downscaleFrame(4000, 3000, 320);
			const aspectRatio = result.width / result.height;
			expect(aspectRatio).toBeCloseTo(4 / 3, 2);
		});
	});

	describe("calculateFaceAreaPercent", () => {
		it("should calculate correct percentage for square face", () => {
			const bounds: FaceBounds = { x: 0, y: 0, width: 0.5, height: 0.5 };
			const result = calculateFaceAreaPercent(bounds);
			expect(result).toBe(25); // 0.5 * 0.5 * 100 = 25%
		});

		it("should calculate correct percentage for small face", () => {
			const bounds: FaceBounds = { x: 0.4, y: 0.4, width: 0.1, height: 0.1 };
			const result = calculateFaceAreaPercent(bounds);
			expect(result).toBeCloseTo(1, 1); // 0.1 * 0.1 * 100 = 1%
		});

		it("should calculate correct percentage for large face", () => {
			const bounds: FaceBounds = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
			const result = calculateFaceAreaPercent(bounds);
			expect(result).toBeCloseTo(64, 1); // 0.8 * 0.8 * 100 = 64%
		});
	});

	describe("selectPrimaryFace", () => {
		it("should return undefined for empty array", () => {
			const result = selectPrimaryFace([]);
			expect(result).toBeUndefined();
		});

		it("should return the only face when single face provided", () => {
			const face: DetectedFace = {
				id: "face-1",
				bounds: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
				confidence: 0.9,
			};
			const result = selectPrimaryFace([face]);
			expect(result).toEqual(face);
		});

		it("should select largest face when multiple faces", () => {
			const smallFace: DetectedFace = {
				id: "small",
				bounds: { x: 0, y: 0, width: 0.1, height: 0.1 },
				confidence: 0.9,
			};
			const largeFace: DetectedFace = {
				id: "large",
				bounds: { x: 0, y: 0, width: 0.5, height: 0.5 },
				confidence: 0.9,
			};
			const result = selectPrimaryFace([smallFace, largeFace]);
			expect(result?.id).toBe("large");
		});

		it("should prefer centered face when areas are similar", () => {
			const offCenterFace: DetectedFace = {
				id: "off-center",
				bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
				confidence: 0.9,
			};
			const centeredFace: DetectedFace = {
				id: "centered",
				bounds: { x: 0.35, y: 0.35, width: 0.3, height: 0.3 },
				confidence: 0.9,
			};
			const result = selectPrimaryFace([offCenterFace, centeredFace]);
			expect(result?.id).toBe("centered");
		});
	});

	describe("computeFaceFramingGuidance", () => {
		const minAreaPct = 15;
		const maxAreaPct = 60;

		it("should return no-face guidance when face is undefined", () => {
			const result = computeFaceFramingGuidance(
				undefined,
				minAreaPct,
				maxAreaPct,
			);
			expect(result.isProperlyFramed).toBe(false);
			expect(result.faceAreaPercent).toBe(0);
			expect(result.isTooSmall).toBe(true);
			expect(result.prompt).toBe("No face detected");
		});

		it("should detect face that is too small", () => {
			const face: DetectedFace = {
				id: "face-1",
				bounds: { x: 0.4, y: 0.4, width: 0.1, height: 0.1 }, // 1% area
				confidence: 0.9,
			};
			const result = computeFaceFramingGuidance(face, minAreaPct, maxAreaPct);
			expect(result.isTooSmall).toBe(true);
			expect(result.isTooLarge).toBe(false);
			expect(result.prompt).toBe("Step closer");
		});

		it("should detect face that is too large", () => {
			const face: DetectedFace = {
				id: "face-1",
				bounds: { x: 0.1, y: 0.1, width: 0.9, height: 0.9 }, // 81% area
				confidence: 0.9,
			};
			const result = computeFaceFramingGuidance(face, minAreaPct, maxAreaPct);
			expect(result.isTooSmall).toBe(false);
			expect(result.isTooLarge).toBe(true);
			expect(result.prompt).toBe("Step back");
		});

		it("should detect proper framing when size is within range", () => {
			const face: DetectedFace = {
				id: "face-1",
				bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, // 25% area
				confidence: 0.9,
			};
			const result = computeFaceFramingGuidance(face, minAreaPct, maxAreaPct);
			expect(result.isTooSmall).toBe(false);
			expect(result.isTooLarge).toBe(false);
			expect(result.faceAreaPercent).toBe(25);
		});

		it("should detect face positioned too high", () => {
			const face: DetectedFace = {
				id: "face-1",
				bounds: { x: 0.25, y: 0.45, width: 0.5, height: 0.5 }, // Top at 45% (above upper third)
				confidence: 0.9,
			};
			const result = computeFaceFramingGuidance(face, minAreaPct, maxAreaPct);
			expect(result.headroomOffset).toBeGreaterThan(0.05);
			expect(result.prompt).toBe("Lower camera");
		});

		it("should detect face positioned too low", () => {
			const face: DetectedFace = {
				id: "face-1",
				bounds: { x: 0.25, y: 0.1, width: 0.5, height: 0.5 }, // Top at 10% (well below upper third)
				confidence: 0.9,
			};
			const result = computeFaceFramingGuidance(face, minAreaPct, maxAreaPct);
			expect(result.headroomOffset).toBeLessThan(-0.1);
			expect(result.prompt).toBe("Raise camera");
		});

		it("should return properly framed when size and position are good", () => {
			const face: DetectedFace = {
				id: "face-1",
				bounds: { x: 0.25, y: 0.3, width: 0.5, height: 0.5 }, // Top at 30%, area 25%
				confidence: 0.9,
			};
			const result = computeFaceFramingGuidance(face, minAreaPct, maxAreaPct);
			expect(result.isProperlyFramed).toBe(true);
			expect(result.prompt).toBeNull();
		});
	});

	describe("Constants", () => {
		it("should have correct MAX_ML_LONG_EDGE value", () => {
			expect(MAX_ML_LONG_EDGE).toBe(320);
		});

		it("should have correct MIN_FACE_CONFIDENCE value", () => {
			expect(MIN_FACE_CONFIDENCE).toBe(0.7);
		});

		it("should have correct TARGET_FACE_DETECTION_FPS value", () => {
			expect(TARGET_FACE_DETECTION_FPS).toBe(20);
		});
	});
});
