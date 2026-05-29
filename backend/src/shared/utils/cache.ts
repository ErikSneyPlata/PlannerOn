// backend/src/shared/utils/cache.ts

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Set a value in the memory cache
   * @param key cache key (pref. prefixed by userId)
   * @param value data to store
   * @param ttlSeconds Time To Live in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number = 30): void {
    this.store.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Get a value from the memory cache
   * Returns null if key does not exist or has expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete a single key from cache
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate keys matching a pattern, e.g. for a specific user ID
   */
  invalidateUserCache(userId: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(userId)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all items in cache
   */
  clear(): void {
    this.store.clear();
  }
}

export const appCache = new MemoryCache();
