/**
 * @format
 */

import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { CompositionOverlay } from "../src/components/CompositionOverlay";

describe("CompositionOverlay", () => {
	afterEach(() => {
		// Clean up after each test
		ReactTestRenderer.act(() => {});
	});

	it("renders correctly when visible", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<CompositionOverlay visible={true} testID="test-overlay" />,
			);
		});

		const testInstance = testRenderer!.root;

		// Check main overlay is rendered by finding it by testID
		const overlay = testInstance.findByProps({ testID: "test-overlay" });
		expect(overlay).toBeTruthy();

		// Check grid lines are rendered
		expect(
			testInstance.findByProps({ testID: "test-overlay-line-horizontal-1" }),
		).toBeTruthy();
		expect(
			testInstance.findByProps({ testID: "test-overlay-line-horizontal-2" }),
		).toBeTruthy();
		expect(
			testInstance.findByProps({ testID: "test-overlay-line-vertical-1" }),
		).toBeTruthy();
		expect(
			testInstance.findByProps({ testID: "test-overlay-line-vertical-2" }),
		).toBeTruthy();

		// Check center marker is rendered
		expect(
			testInstance.findByProps({ testID: "test-overlay-center-marker" }),
		).toBeTruthy();
	});

	it("returns null when not visible", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<CompositionOverlay visible={false} testID="test-overlay" />,
			);
		});

		// When not visible, the component should render nothing (empty JSON tree)
		const json = testRenderer!.toJSON();
		expect(json).toBeNull();
	});

	it("renders with custom line colors and widths", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<CompositionOverlay
					visible={true}
					testID="custom-overlay"
					lineColor="rgba(255, 0, 0, 0.5)"
					lineWidth={2}
					centerMarkerColor="rgba(0, 255, 0, 0.5)"
					centerMarkerSize={30}
				/>,
			);
		});

		const testInstance = testRenderer!.root;

		// Check overlay renders with custom props
		const overlay = testInstance.findByProps({ testID: "custom-overlay" });
		expect(overlay).toBeTruthy();
	});
});
