/**
 * Photo Index Primitives
 *
 * Shared contract for photo metadata indexes, consumed by every
 * PhotoStorage adapter. Owning the keys, id generation, key
 * derivation, and write serialization in ONE place means adapters
 * cannot silently drift apart - a change here is a change everywhere.
 */

export const INDEX_KEY = "@photo_index";
export const PAGE_SIZE = 50;

export function getPhotoKey(id: string): string {
	return `@photo:${id}`;
}

export function generateId(): string {
	return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Serializes index mutations to prevent lost updates under concurrency
 * (read-modify-write race on the MMKV index).
 */
export class IndexMutex {
	private queue: Promise<unknown> = Promise.resolve();

	async enqueue<T>(operation: () => Promise<T>): Promise<T> {
		const promise = this.queue.then(() => operation());
		// The caller receives `promise`, so the internal queue must absorb the
		// rejection to allow later operations to run.
		this.queue = promise.catch((error) => {
			console.error("IndexMutex operation failed:", error);
		});
		return promise;
	}
}
