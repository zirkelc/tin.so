/**
 * Keeps the promise of each key, so that a key loads only once. A promise that rejects leaves the
 * cache, so that the next call loads the key again.
 */
export function cached<VALUE>(
  cache: Map<string, Promise<VALUE>>,
  key: string,
  load: () => Promise<VALUE>,
): Promise<VALUE> {
  const existing = cache.get(key);
  if (existing) return existing;
  const loading = load();
  cache.set(key, loading);
  loading.catch(() => {
    if (cache.get(key) === loading) cache.delete(key);
  });
  return loading;
}
