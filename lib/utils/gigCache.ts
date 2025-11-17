import { Gig } from '@/types/gig';

// Cache duration: 5 minutes for 2G/3G optimization
const CACHE_DURATION_MS = 5 * 60 * 1000;
const CACHE_KEY_PREFIX = 'mzansigig_gigs_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class GigCache {
  /**
   * Store gigs in localStorage with timestamp
   */
  static set(key: string, data: Gig[]): void {
    try {
      const now = Date.now();
      const entry: CacheEntry<Gig[]> = {
        data,
        timestamp: now,
        expiresAt: now + CACHE_DURATION_MS
      };

      localStorage.setItem(
        `${CACHE_KEY_PREFIX}${key}`,
        JSON.stringify(entry)
      );
    } catch (error) {
      // Silently fail if localStorage is full or disabled
      console.warn('Failed to cache gigs:', error);
    }
  }

  /**
   * Get gigs from localStorage if cache is fresh
   * Returns null if cache is stale or missing
   */
  static get(key: string): Gig[] | null {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
      if (!cached) return null;

      const entry: CacheEntry<Gig[]> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still fresh
      if (now > entry.expiresAt) {
        // Cache expired, remove it
        this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      // Invalid cache data or parse error
      console.warn('Failed to read gigs cache:', error);
      this.remove(key);
      return null;
    }
  }

  /**
   * Remove cached entry
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
    } catch (error) {
      console.warn('Failed to remove gigs cache:', error);
    }
  }

  /**
   * Clear all gig caches
   */
  static clearAll(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear gigs cache:', error);
    }
  }

  /**
   * Check if cache exists and is fresh
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache age in seconds
   */
  static getAge(key: string): number | null {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
      if (!cached) return null;

      const entry: CacheEntry<Gig[]> = JSON.parse(cached);
      return Math.floor((Date.now() - entry.timestamp) / 1000);
    } catch {
      return null;
    }
  }
}
