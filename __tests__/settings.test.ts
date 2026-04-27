/**
 * Unit tests for settings storage module
 */

import {
	clearAllSettings,
	getAutoCaptureEnabled,
	setAutoCaptureEnabled,
	toggleAutoCaptureEnabled,
} from "../src/storage/settings";

// Mock MMKV module
const mockStorage: Record<string, string> = {};

jest.mock("react-native-mmkv", () => ({
	createMMKV: jest.fn(() => ({
		getString: jest.fn((key: string) => mockStorage[key] ?? null),
		set: jest.fn((key: string, value: string) => {
			mockStorage[key] = value;
		}),
		remove: jest.fn((key: string) => {
			delete mockStorage[key];
		}),
	})),
}));

describe("Settings storage", () => {
	beforeEach(() => {
		// Clear mock storage before each test
		for (const key in mockStorage) {
			delete mockStorage[key];
		}
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("getAutoCaptureEnabled", () => {
		it("returns true by default when no value stored", () => {
			expect(getAutoCaptureEnabled()).toBe(true);
		});

		it("returns true when stored value is 'true'", () => {
			mockStorage["@auto_capture_enabled"] = "true";
			expect(getAutoCaptureEnabled()).toBe(true);
		});

		it("returns false when stored value is 'false'", () => {
			mockStorage["@auto_capture_enabled"] = "false";
			expect(getAutoCaptureEnabled()).toBe(false);
		});
	});

	describe("setAutoCaptureEnabled", () => {
		it("stores 'true' when enabled", () => {
			setAutoCaptureEnabled(true);
			expect(mockStorage["@auto_capture_enabled"]).toBe("true");
		});

		it("stores 'false' when disabled", () => {
			setAutoCaptureEnabled(false);
			expect(mockStorage["@auto_capture_enabled"]).toBe("false");
		});
	});

	describe("toggleAutoCaptureEnabled", () => {
		it("toggles from true to false", () => {
			mockStorage["@auto_capture_enabled"] = "true";
			const result = toggleAutoCaptureEnabled();
			expect(result).toBe(false);
			expect(mockStorage["@auto_capture_enabled"]).toBe("false");
		});

		it("toggles from false to true", () => {
			mockStorage["@auto_capture_enabled"] = "false";
			const result = toggleAutoCaptureEnabled();
			expect(result).toBe(true);
			expect(mockStorage["@auto_capture_enabled"]).toBe("true");
		});

		it("toggles from default (true) to false", () => {
			const result = toggleAutoCaptureEnabled();
			expect(result).toBe(false);
			expect(mockStorage["@auto_capture_enabled"]).toBe("false");
		});
	});

	describe("clearAllSettings", () => {
		it("removes auto-capture setting", () => {
			mockStorage["@auto_capture_enabled"] = "true";
			clearAllSettings();
			expect(mockStorage["@auto_capture_enabled"]).toBeUndefined();
		});
	});
});
