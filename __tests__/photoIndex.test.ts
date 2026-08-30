import { IndexMutex } from "../src/storage/photoIndex";

describe("IndexMutex", () => {
	it("rejects the failed caller but continues processing later operations", async () => {
		const consoleError = jest
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const mutex = new IndexMutex();
		const operation = jest.fn().mockRejectedValueOnce(new Error("write failed"));

		await expect(mutex.enqueue(operation)).rejects.toThrow("write failed");
		operation.mockResolvedValueOnce("recovered");
		await expect(mutex.enqueue(operation)).resolves.toBe("recovered");

		expect(operation).toHaveBeenCalledTimes(2);
		consoleError.mockRestore();
	});
});
