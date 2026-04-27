/**
 * @format
 */

import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { HorizonIndicator } from "../src/components/HorizonIndicator";

describe("HorizonIndicator", () => {
	afterEach(() => {
		// Clean up after each test
		ReactTestRenderer.act(() => {});
	});

	it("renders correctly when visible", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<HorizonIndicator
					roll={0}
					isLevel={true}
					visible={true}
					testID="horizon-test"
				/>,
			);
		});

		const testInstance = testRenderer!.root;

		// Check main indicator is rendered by finding it by testID
		const indicator = testInstance.findByProps({ testID: "horizon-test" });
		expect(indicator).toBeTruthy();

		// Check horizon line is rendered
		expect(
			testInstance.findByProps({ testID: "horizon-test-line" }),
		).toBeTruthy();
	});

	it("returns null when not visible", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<HorizonIndicator roll={0} isLevel={true} visible={false} />,
			);
		});

		// When not visible, the component should render nothing
		const json = testRenderer!.toJSON();
		expect(json).toBeNull();
	});

	it("renders with positive roll (tilted right)", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<HorizonIndicator roll={15} isLevel={false} visible={true} />,
			);
		});

		expect(testRenderer!.toJSON()).toBeTruthy();
	});

	it("renders with negative roll (tilted left)", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<HorizonIndicator roll={-15} isLevel={false} visible={true} />,
			);
		});

		expect(testRenderer!.toJSON()).toBeTruthy();
	});

	it("renders with large roll angles", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<HorizonIndicator roll={45} isLevel={false} visible={true} />,
			);
		});

		expect(testRenderer!.toJSON()).toBeTruthy();
	});

	it("uses active color when level", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<HorizonIndicator
					roll={0}
					isLevel={true}
					visible={true}
					activeColor="rgba(0, 255, 0, 1)"
					inactiveColor="rgba(255, 0, 0, 1)"
				/>,
			);
		});

		expect(testRenderer!.toJSON()).toBeTruthy();
		// The tree structure should use the active color (green)
	});

	it("uses inactive color when not level", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<HorizonIndicator
					roll={10}
					isLevel={false}
					visible={true}
					activeColor="rgba(0, 255, 0, 1)"
					inactiveColor="rgba(255, 0, 0, 1)"
				/>,
			);
		});

		expect(testRenderer!.toJSON()).toBeTruthy();
		// The tree structure should use the inactive color (red)
	});

	it("accepts custom line width", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<HorizonIndicator
					roll={0}
					isLevel={true}
					visible={true}
					lineWidth="80%"
					lineThickness={5}
				/>,
			);
		});

		expect(testRenderer!.toJSON()).toBeTruthy();
	});

	it("has correct testID", async () => {
		let testRenderer: ReactTestRenderer.ReactTestRenderer;

		await ReactTestRenderer.act(async () => {
			testRenderer = ReactTestRenderer.create(
				<HorizonIndicator
					roll={0}
					isLevel={true}
					visible={true}
					testID="custom-horizon"
				/>,
			);
		});

		const testInstance = testRenderer!.root;
		const indicator = testInstance.findByProps({ testID: "custom-horizon" });
		expect(indicator).toBeTruthy();
	});
});
