import { smokeTestOnlyProbe } from "../src/lighting/smokeTestOnlyProbe";

describe("smokeTestOnlyProbe", () => {
	it("is the mean-luminance default the green phase wires in", () => {
		expect(smokeTestOnlyProbe).toBe(128);
	});
});
