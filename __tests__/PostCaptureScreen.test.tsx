/**
 * Tests for PostCaptureScreen component
 */

import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import React from "react";
import type { SubScores } from "../src/scoring/types";
import { PostCaptureScreen } from "../src/screens/PostCaptureScreen";
import { photoStorage } from "../src/storage";

// Mock the storage module
jest.mock("../src/storage", () => ({
	photoStorage: {
		delete: jest.fn(),
	},
}));

describe("PostCaptureScreen", () => {
	const mockOnSave = jest.fn();
	const mockOnDiscard = jest.fn();

	const defaultSubScores: SubScores = {
		stability: 85,
		level: 70,
		framing: 90,
		lighting: 75,
		aesthetic: 80,
		flatLay: 85,
	};

	const defaultProps = {
		photoId: "test-photo-123",
		photoUri: "file://test/photo.jpg",
		subScores: defaultSubScores,
		weakestSubscore: "level" as const,
		onSave: mockOnSave,
		onDiscard: mockOnDiscard,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Rendering", () => {
		it("should render the photo", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			const photo = screen.getByTestId("post-capture-photo");
			expect(photo).toBeTruthy();
		});

		it("should show After view by default", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			expect(screen.getByText("After")).toBeTruthy();
		});

		it("should render annotations overlay in After mode", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			const overlay = screen.getByTestId("annotations-overlay");
			expect(overlay).toBeTruthy();
		});

		it("should show annotation for weakest subscore", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			expect(screen.getByText("Horizon Level: 70/100")).toBeTruthy();
		});

		it("should show learning tip annotation", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			expect(screen.getByText("Learning Tip")).toBeTruthy();
			expect(screen.getByText("Horizon was tilted ~3°")).toBeTruthy();
		});
	});

	describe("View Mode Toggle", () => {
		it("should toggle to Before view when toggle button is pressed", () => {
			render(<PostCaptureScreen {...defaultProps} />);

			// Initially shows After
			expect(screen.getByText("After")).toBeTruthy();
			expect(screen.queryByText("Before")).toBeNull();

			// Press toggle button
			const toggleButton = screen.getByTestId("view-mode-toggle");
			fireEvent.press(toggleButton);

			// Should now show Before
			expect(screen.getByText("Before")).toBeTruthy();
			expect(screen.queryByText("After")).toBeNull();
		});

		it("should toggle back to After view", () => {
			render(<PostCaptureScreen {...defaultProps} />);

			// Toggle to Before
			fireEvent.press(screen.getByTestId("view-mode-toggle"));
			expect(screen.getByText("Before")).toBeTruthy();

			// Toggle back to After
			fireEvent.press(screen.getByTestId("view-mode-toggle"));
			expect(screen.getByText("After")).toBeTruthy();
		});

		it("should hide annotations in Before view", () => {
			render(<PostCaptureScreen {...defaultProps} />);

			// Toggle to Before
			fireEvent.press(screen.getByTestId("view-mode-toggle"));

			// Annotations should be hidden
			expect(screen.queryByTestId("annotations-overlay")).toBeNull();
		});

		it("should update toggle button text based on mode", () => {
			render(<PostCaptureScreen {...defaultProps} />);

			// In After mode, button shows "Show Raw"
			expect(screen.getByText("← Show Raw")).toBeTruthy();

			// Toggle to Before
			fireEvent.press(screen.getByTestId("view-mode-toggle"));

			// In Before mode, button shows "Show Analysis"
			expect(screen.getByText("Show Analysis →")).toBeTruthy();
		});
	});

	describe("Swipe Gesture", () => {
		it("should show swipe hint in After mode", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			expect(
				screen.getByText("Swipe right or tap to see raw photo"),
			).toBeTruthy();
		});

		it("should show swipe hint in Before mode", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			// Toggle to Before
			fireEvent.press(screen.getByTestId("view-mode-toggle"));
			expect(screen.getByText("Swipe left or tap for analysis")).toBeTruthy();
		});

		it("should render gesture detector wrapper", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			// The photo container should be wrapped in gesture detector
			const photoContainer = screen.getByTestId("mode-indicator").parent;
			expect(photoContainer).toBeTruthy();
		});
	});

	describe("Action Buttons", () => {
		it("should call onSave when save button is pressed", async () => {
			render(<PostCaptureScreen {...defaultProps} />);

			const saveButton = screen.getByTestId("save-button");
			fireEvent.press(saveButton);

			await waitFor(() => {
				expect(mockOnSave).toHaveBeenCalledTimes(1);
			});
		});

		it("should call onDiscard and delete photo when discard button is pressed", async () => {
			(photoStorage.delete as jest.Mock).mockResolvedValue(true);

			render(<PostCaptureScreen {...defaultProps} />);

			const discardButton = screen.getByTestId("discard-button");
			fireEvent.press(discardButton);

			await waitFor(() => {
				expect(photoStorage.delete).toHaveBeenCalledWith("test-photo-123");
				expect(mockOnDiscard).toHaveBeenCalledTimes(1);
			});
		});

		it("should still call onDiscard if delete fails", async () => {
			(photoStorage.delete as jest.Mock).mockRejectedValue(
				new Error("Delete failed"),
			);

			render(<PostCaptureScreen {...defaultProps} />);

			const discardButton = screen.getByTestId("discard-button");
			fireEvent.press(discardButton);

			await waitFor(() => {
				expect(mockOnDiscard).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("Annotation Text Generation", () => {
		it("should generate correct annotation for level subscore", () => {
			const props = {
				...defaultProps,
				weakestSubscore: "level" as const,
				subScores: { ...defaultSubScores, level: 60 },
			};
			render(<PostCaptureScreen {...props} />);
			expect(screen.getByText("Horizon was tilted ~4°")).toBeTruthy();
		});

		it("should generate correct annotation for stability subscore", () => {
			const props = {
				...defaultProps,
				weakestSubscore: "stability" as const,
				subScores: { ...defaultSubScores, stability: 45 },
			};
			render(<PostCaptureScreen {...props} />);
			expect(
				screen.getByText("Photo was shaky - hold steadier next time"),
			).toBeTruthy();
		});

		it("should generate correct annotation for framing subscore", () => {
			const props = {
				...defaultProps,
				weakestSubscore: "framing" as const,
				subScores: { ...defaultSubScores, framing: 40 },
			};
			render(<PostCaptureScreen {...props} />);
			expect(
				screen.getByText("Subject too small or large - adjust distance"),
			).toBeTruthy();
		});

		it("should generate correct annotation for lighting subscore", () => {
			const props = {
				...defaultProps,
				weakestSubscore: "lighting" as const,
				subScores: { ...defaultSubScores, lighting: 30 },
			};
			render(<PostCaptureScreen {...props} />);
			expect(screen.getByText("Too dark - find better lighting")).toBeTruthy();
		});

		it("should generate correct annotation for aesthetic subscore", () => {
			const props = {
				...defaultProps,
				weakestSubscore: "aesthetic" as const,
				subScores: { ...defaultSubScores, aesthetic: 50 },
			};
			render(<PostCaptureScreen {...props} />);
			expect(
				screen.getByText("Scene could be more visually interesting"),
			).toBeTruthy();
		});

		it("should show mild framing message for score >= 50", () => {
			const props = {
				...defaultProps,
				weakestSubscore: "framing" as const,
				subScores: { ...defaultSubScores, framing: 60 },
			};
			render(<PostCaptureScreen {...props} />);
			expect(
				screen.getByText("Subject slightly off-center - check composition"),
			).toBeTruthy();
		});

		it("should show mild lighting message for score >= 40", () => {
			const props = {
				...defaultProps,
				weakestSubscore: "lighting" as const,
				subScores: { ...defaultSubScores, lighting: 50 },
			};
			render(<PostCaptureScreen {...props} />);
			expect(
				screen.getByText("Uneven lighting - face the light source"),
			).toBeTruthy();
		});
	});

	describe("Accessibility", () => {
		it("should have accessibility label on save button", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			const saveButton = screen.getByLabelText("Save photo");
			expect(saveButton).toBeTruthy();
		});

		it("should have accessibility label on discard button", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			const discardButton = screen.getByLabelText("Discard photo");
			expect(discardButton).toBeTruthy();
		});

		it("should have accessibility label on view mode toggle", () => {
			render(<PostCaptureScreen {...defaultProps} />);
			const toggle = screen.getByLabelText("Switch to before view");
			expect(toggle).toBeTruthy();
		});
	});

	describe("Button States", () => {
		it("should show loading state on discard button during delete", async () => {
			(photoStorage.delete as jest.Mock).mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve(true), 50)),
			);

			render(<PostCaptureScreen {...defaultProps} />);

			const discardButton = screen.getByTestId("discard-button");
			fireEvent.press(discardButton);

			// Should show loading text
			expect(screen.getByText("Deleting...")).toBeTruthy();

			await waitFor(() => {
				expect(mockOnDiscard).toHaveBeenCalled();
			});
		});
	});
});
