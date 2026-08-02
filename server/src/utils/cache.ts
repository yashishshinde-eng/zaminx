/**
 * Minimal in-process TTL cache (Phase 16). A single-node deployment reads hot,
 * rarely-changing data (settings, public CMS, SMTP config) on every request;
 * this avoids a MongoDB round-trip for each. The short TTL bounds staleness and
 * **write-invalidation** makes same-process admin edits apply immediately.
 *
 * Not a replacement for Redis: with multiple instances each has its own cache,
 * so a write on one node is invisible to the others until their TTL expires.
 * That matches the existing maintenance-flag cache and is acceptable for the
 * current single-node shape; revisit when horizontal scaling lands.
 *
 * The cache stores arbitrary resolved values (including `null`/`undefined`).
 * `cached()` is async and dedupes concurrent in-flight loads for the same key
 * via a shared pending promise, so a thundering herd of first-hit requests
 * triggers exactly one loader call.
 */

interface Entry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();
/** In-flight loaders, to dedupe concurrent first-hit calls for the same key. */
const pending = new Map<string, Promise<unknown>>();

/**
 * Return the cached value for `key` if it is fresh, otherwise call `loader`,
 * store its result with a `ttlMs` lifetime, and return it. Concurrent misses on
 * the same key share a single in-flight loader promise.
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }
  // Expired entry — drop it so a subsequent miss doesn't see a stale slot.
  if (hit) store.delete(key);

  const inflight = pending.get(key);
  if (inflight) return inflight as Promise<T>;

  const p = (async () => {
    try {
      const value = await loader();
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, p);
  return (await p) as T;
}

/** Drop a single key (call after a write that should invalidate the cached read). */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Drop every key beginning with `prefix` (e.g. invalidate all cached pages). */
export function invalidatePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}