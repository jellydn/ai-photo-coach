/**
 * Mock for react-native-mmkv
 */
class MMKV {
	private store: Map<string, string> = new Map();
	private id: string;

	constructor(config?: { id?: string }) {
		this.id = config?.id ?? "default";
	}

	getString(key: string): string | undefined {
		return this.store.get(key);
	}

	set(key: string, value: string | boolean | number): void {
		this.store.set(key, String(value));
	}

	remove(key: string): boolean {
		const existed = this.store.has(key);
		this.store.delete(key);
		return existed;
	}

	clearAll(): void {
		this.store.clear();
	}

	contains(key: string): boolean {
		return this.store.has(key);
	}

	getAllKeys(): string[] {
		return Array.from(this.store.keys());
	}

	// Testing helpers
	__getId(): string {
		return this.id;
	}

	__getStore(): Map<string, string> {
		return this.store;
	}
}

/**
 * Create MMKV instance (mock implementation)
 */
function createMMKV(config?: { id?: string }): MMKV {
	return new MMKV(config);
}

export { createMMKV, MMKV };
export default MMKV;
