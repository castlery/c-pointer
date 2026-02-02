import NodeCache from 'node-cache';
import { logger } from '../logging/logger.js';

export interface CacheOptions {
  ttlSeconds: number;
  maxSize: number;
}

export class MemoryCache {
  private cache: NodeCache;
  private hitCount = 0;
  private missCount = 0;

  constructor(options: CacheOptions) {
    this.cache = new NodeCache({
      stdTTL: options.ttlSeconds,
      maxKeys: options.maxSize,
      checkperiod: 120,
      useClones: true
    });

    this.cache.on('expired', (key) => {
      logger.debug('Cache key expired', { key });
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.hitCount++;
      logger.debug('Cache hit', { key });
      return value;
    }
    this.missCount++;
    logger.debug('Cache miss', { key });
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (ttl !== undefined) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
    logger.debug('Cache set', { key });
  }

  async delete(key: string): Promise<void> {
    this.cache.del(key);
    logger.debug('Cache delete', { key });
  }

  generateKey(componentPath: string, branch: string, commit: string): string {
    return `${componentPath}:${branch}:${commit}`;
  }

  getStats() {
    return {
      size: this.cache.keys().length,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: this.hitCount + this.missCount > 0
        ? this.hitCount / (this.hitCount + this.missCount)
        : 0
    };
  }

  clear(): void {
    this.cache.flushAll();
    this.hitCount = 0;
    this.missCount = 0;
  }
}
