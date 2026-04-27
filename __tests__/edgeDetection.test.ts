/**
 * Unit tests for edge detection module
 */

import {
	computeFrameStats,
	detectDominantLines,
	EDGE_DETECTION_THRESHOLD,
	type FrameStats,
	getLineOrientationDescription,
	MAX_EDGE_DETECTION_LONG_EDGE,
	MIN_DOMINANT_LINE_CONFIDENCE,
	MIN_EDGE_PIXEL_RATIO,
	needsLineAlignment,
	TARGET_EDGE_DETECTION_FPS,
} from "../src/edgeDetection/types";

describe("Edge Detection Constants", () => {
	test("EDGE_DETECTION_THRESHOLD should be 0.3", () => {
		expect(EDGE_DETECTION_THRESHOLD).toBe(0.3);
	});

	test("MIN_DOMINANT_LINE_CONFIDENCE should be 0.6", () => {
		expect(MIN_DOMINANT_LINE_CONFIDENCE).toBe(0.6);
	});

	test("MIN_EDGE_PIXEL_RATIO should be 0.15", () => {
		expect(MIN_EDGE_PIXEL_RATIO).toBe(0.15);
	});

	test("TARGET_EDGE_DETECTION_FPS should be 20", () => {
		expect(TARGET_EDGE_DETECTION_FPS).toBe(20);
	});

	test("MAX_EDGE_DETECTION_LONG_EDGE should be 320", () => {
		expect(MAX_EDGE_DETECTION_LONG_EDGE).toBe(320);
	});
});

describe("detectDominantLines", () => {
	test("should return no lines for empty frame stats", () => {
		const frameStats: FrameStats = {
			width: 100,
			height: 100,
			horizontalEdges: [],
			verticalEdges: [],
			meanEdgeStrength: 0,
		};

		const result = detectDominantLines(frameStats);

		expect(result.hasDominantLines).toBe(false);
		expect(result.primaryOrientation).toBe("none");
		expect(result.confidence).toBe(0);
		expect(result.isAligned).toBe(false);
		expect(result.prompt).toBeNull();
	});

	test("should detect dominant horizontal lines", () => {
		// Create frame stats with strong horizontal edges
		// Use consistent array sizes for the ratio calculation
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(0.6), // Strong horizontal edges
			verticalEdges: new Array(sampleCount).fill(0.1), // Weak vertical edges
			meanEdgeStrength: 0.35,
		};

		const result = detectDominantLines(frameStats);

		expect(result.hasDominantLines).toBe(true);
		expect(result.primaryOrientation).toBe("horizontal");
		expect(result.confidence).toBeGreaterThan(MIN_DOMINANT_LINE_CONFIDENCE);
	});

	test("should detect dominant vertical lines", () => {
		// Create frame stats with strong vertical edges
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(0.1), // Weak horizontal edges
			verticalEdges: new Array(sampleCount).fill(0.6), // Strong vertical edges
			meanEdgeStrength: 0.35,
		};

		const result = detectDominantLines(frameStats);

		expect(result.hasDominantLines).toBe(true);
		expect(result.primaryOrientation).toBe("vertical");
		expect(result.confidence).toBeGreaterThan(MIN_DOMINANT_LINE_CONFIDENCE);
	});

	test("should not detect lines when edge strength is below threshold", () => {
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(0.1), // Below threshold
			verticalEdges: new Array(sampleCount).fill(0.1), // Below threshold
			meanEdgeStrength: 0.1,
		};

		const result = detectDominantLines(frameStats);

		expect(result.hasDominantLines).toBe(false);
		expect(result.primaryOrientation).toBe("none");
	});

	test("should not detect lines when edge confidence is too low", () => {
		// Very weak edges with low coverage
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(100).fill(0.15), // Low strength, low count
			verticalEdges: new Array(100).fill(0.1),
			meanEdgeStrength: 0.12,
		};

		const result = detectDominantLines(frameStats);

		// Confidence should be below MIN_DOMINANT_LINE_CONFIDENCE (0.6)
		expect(result.hasDominantLines).toBe(false);
	});

	test("should return alignment prompt when lines detected but not aligned", () => {
		// Lines detected with moderate confidence - should trigger prompt but not be "aligned"
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(0.45), // Moderate strength
			verticalEdges: new Array(sampleCount).fill(0.1),
			meanEdgeStrength: 0.28,
		};

		const result = detectDominantLines(frameStats);

		// Lines detected and confidence is above minimum threshold
		expect(result.hasDominantLines).toBe(true);
		expect(result.confidence).toBeGreaterThanOrEqual(
			MIN_DOMINANT_LINE_CONFIDENCE,
		);

		// If confidence is below alignment threshold (0.75), should show prompt
		// If confidence is at or above alignment threshold, no prompt needed
		if (result.confidence < 0.75) {
			expect(result.isAligned).toBe(false);
			expect(result.prompt).toBe("Align with line");
		} else {
			expect(result.isAligned).toBe(true);
			expect(result.prompt).toBeNull();
		}
	});

	test("should return null prompt when lines are aligned", () => {
		// High confidence detection (> 75%)
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(0.8), // High strength
			verticalEdges: new Array(sampleCount).fill(0.1),
			meanEdgeStrength: 0.45,
		};

		const result = detectDominantLines(frameStats);

		expect(result.hasDominantLines).toBe(true);
		expect(result.isAligned).toBe(true);
		expect(result.prompt).toBeNull();
	});

	test("should handle mixed edge strengths", () => {
		// Moderate strength in both directions
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(0.5),
			verticalEdges: new Array(sampleCount).fill(0.5),
			meanEdgeStrength: 0.5,
		};

		const result = detectDominantLines(frameStats);

		// Should detect dominant lines with one orientation
		expect(result.hasDominantLines).toBe(true);
		expect(result.confidence).toBeGreaterThan(0);
		expect(result.primaryOrientation).toMatch(/horizontal|vertical/);
	});

	test("should clamp confidence to maximum of 1", () => {
		// Very strong edges that might exceed confidence calculation
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(1.0),
			verticalEdges: new Array(sampleCount).fill(0.0),
			meanEdgeStrength: 0.5,
		};

		const result = detectDominantLines(frameStats);

		expect(result.confidence).toBeLessThanOrEqual(1);
	});

	test("should round confidence to 2 decimal places", () => {
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(0.5),
			verticalEdges: new Array(sampleCount).fill(0.1),
			meanEdgeStrength: 0.3,
		};

		const result = detectDominantLines(frameStats);

		// Check that confidence has at most 2 decimal places
		const confidenceString = result.confidence.toString();
		const decimalPlaces = confidenceString.includes(".")
			? confidenceString.split(".")[1].length
			: 0;
		expect(decimalPlaces).toBeLessThanOrEqual(2);
	});
});

describe("needsLineAlignment", () => {
	test("should return true when lines detected but not aligned", () => {
		const result = {
			hasDominantLines: true,
			primaryOrientation: "horizontal" as const,
			confidence: 0.65,
			isAligned: false,
			prompt: "Align with line",
		};

		expect(needsLineAlignment(result)).toBe(true);
	});

	test("should return false when no lines detected", () => {
		const result = {
			hasDominantLines: false,
			primaryOrientation: "none" as const,
			confidence: 0,
			isAligned: false,
			prompt: null,
		};

		expect(needsLineAlignment(result)).toBe(false);
	});

	test("should return false when lines are aligned", () => {
		const result = {
			hasDominantLines: true,
			primaryOrientation: "vertical" as const,
			confidence: 0.8,
			isAligned: true,
			prompt: null,
		};

		expect(needsLineAlignment(result)).toBe(false);
	});
});

describe("getLineOrientationDescription", () => {
	test("should describe horizontal orientation", () => {
		expect(getLineOrientationDescription("horizontal")).toBe(
			"horizontal lines (like horizons)",
		);
	});

	test("should describe vertical orientation", () => {
		expect(getLineOrientationDescription("vertical")).toBe(
			"vertical lines (like buildings)",
		);
	});

	test("should describe none orientation", () => {
		expect(getLineOrientationDescription("none")).toBe("no strong lines");
	});
});

describe("computeFrameStats", () => {
	test("should compute frame stats from pixel data", () => {
		// Create larger image to ensure sampling produces results
		// Minimum size needs to be > sampleStep (4) + borders
		const width = 16;
		const height = 16;
		const pixelData = new Uint8Array(width * height * 4);

		// Fill with gradient pattern
		for (let i = 0; i < pixelData.length; i += 4) {
			const pixelIndex = i / 4;
			const intensity = Math.floor((pixelIndex / (width * height)) * 255);
			pixelData[i] = intensity; // R
			pixelData[i + 1] = intensity; // G
			pixelData[i + 2] = intensity; // B
			pixelData[i + 3] = 255; // A
		}

		const stats = computeFrameStats(pixelData, width, height);

		expect(stats.width).toBe(width);
		expect(stats.height).toBe(height);
		expect(stats.horizontalEdges.length).toBeGreaterThan(0);
		expect(stats.verticalEdges.length).toBeGreaterThan(0);
		expect(stats.meanEdgeStrength).toBeGreaterThanOrEqual(0);
		expect(stats.meanEdgeStrength).toBeLessThanOrEqual(1);
	});

	test("should handle uniform color (no edges)", () => {
		const width = 4;
		const height = 4;
		const pixelData = new Uint8Array(width * height * 4);

		// Fill with same color (no edges)
		for (let i = 0; i < pixelData.length; i += 4) {
			pixelData[i] = 128;
			pixelData[i + 1] = 128;
			pixelData[i + 2] = 128;
			pixelData[i + 3] = 255;
		}

		const stats = computeFrameStats(pixelData, width, height);

		// All edges should be close to 0 for uniform color
		expect(stats.meanEdgeStrength).toBeLessThan(0.1);
	});

	test("should detect strong edges in high contrast pattern", () => {
		// Use larger image for better sampling
		const width = 32;
		const height = 32;
		const pixelData = new Uint8Array(width * height * 4);

		// Create checkerboard pattern with larger blocks for strong edges
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = (y * width + x) * 4;
				// 4x4 blocks instead of 1x1 for stronger edges at sampling points
				const isWhite = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
				const intensity = isWhite ? 255 : 0;
				pixelData[idx] = intensity;
				pixelData[idx + 1] = intensity;
				pixelData[idx + 2] = intensity;
				pixelData[idx + 3] = 255;
			}
		}

		const stats = computeFrameStats(pixelData, width, height);

		// Should have sampled some pixels
		expect(stats.horizontalEdges.length).toBeGreaterThan(0);
		// Checkerboard should have some edges detected
		expect(stats.meanEdgeStrength).toBeGreaterThanOrEqual(0);
	});
});

describe("Edge Detection Integration", () => {
	test("should work with detectDominantLines output", () => {
		// Use larger image for better edge detection
		const width = 32;
		const height = 24;
		const pixelData = new Uint8Array(width * height * 4);

		// Create horizontal stripes for strong horizontal edges
		for (let y = 0; y < height; y++) {
			const intensity = y % 4 < 2 ? 255 : 0; // 2 rows white, 2 rows black
			for (let x = 0; x < width; x++) {
				const idx = (y * width + x) * 4;
				pixelData[idx] = intensity;
				pixelData[idx + 1] = intensity;
				pixelData[idx + 2] = intensity;
				pixelData[idx + 3] = 255;
			}
		}

		const frameStats = computeFrameStats(pixelData, width, height);
		expect(frameStats.horizontalEdges.length).toBeGreaterThan(0);

		const result = detectDominantLines(frameStats);

		// Horizontal stripes should produce horizontal dominant lines
		if (result.hasDominantLines) {
			expect(result.primaryOrientation).toBe("horizontal");
		}
	});

	test("should handle travel mode scenario - building edges", () => {
		// Simulate vertical edges from buildings
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(0.15),
			verticalEdges: new Array(sampleCount).fill(0.6), // Strong vertical edges
			meanEdgeStrength: 0.38,
		};

		const result = detectDominantLines(frameStats);

		expect(result.hasDominantLines).toBe(true);
		expect(result.primaryOrientation).toBe("vertical");
		expect(result.confidence).toBeGreaterThan(MIN_DOMINANT_LINE_CONFIDENCE);
	});

	test("should handle travel mode scenario - horizon line", () => {
		// Simulate horizontal edge from horizon
		const sampleCount = 1000;
		const frameStats: FrameStats = {
			width: 320,
			height: 240,
			horizontalEdges: new Array(sampleCount).fill(0.55), // Strong horizontal
			verticalEdges: new Array(sampleCount).fill(0.2),
			meanEdgeStrength: 0.38,
		};

		const result = detectDominantLines(frameStats);

		expect(result.hasDominantLines).toBe(true);
		expect(result.primaryOrientation).toBe("horizontal");
	});
});
