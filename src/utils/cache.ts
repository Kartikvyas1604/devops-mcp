/**
 * DevOps Omnibus - Advanced Caching System
 * Multi-tier caching with TTL, LRU eviction, and persistence
 */

import * as vscode from 'vscode';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
    value: T;
    createdAt: number;
    accessedAt: number;
    expiresAt: number;
    accessCount: number;
    size: number;
    tags: string[];
}

/**
 * Cache statistics
 */
interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    entryCount: number;
    hitRate: number;
    avgAccessTime: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
    maxSize: number;
    maxEntries: number;
    defaultTTL: number;
    evictionPolicy: 'lru' | 'lfu' | 'fifo';
    persistence: boolean;
    persistenceKey?: string;
    onEvict?: (key: string, value: unknown) => void;
}

/**
 * Advanced LRU Cache with TTL and persistence
 */
export class AdvancedCache<T = unknown> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private config: CacheConfig;
    private stats: CacheStats;
    private accessTimes: number[] = [];
    private context?: vscode.ExtensionContext;

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = {
            maxSize: config.maxSize ?? 100 * 1024 * 1024, // 100MB default
            maxEntries: config.maxEntries ?? 10000,
            defaultTTL: config.defaultTTL ?? 3600000, // 1 hour default
            evictionPolicy: config.evictionPolicy ?? 'lru',
            persistence: config.persistence ?? false,
            persistenceKey: config.persistenceKey ?? 'devops-omnibus-cache',
            onEvict: config.onEvict
        };

        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0,
            entryCount: 0,
            hitRate: 0,
            avgAccessTime: 0
        };
    }

    /**
     * Initialize with VS Code context for persistence
     */
    initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        if (this.config.persistence) {
            this.loadFromPersistence();
        }
    }

    /**
     * Get a value from the cache
     */
    get(key: string): T | undefined {
        const startTime = Date.now();
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            this.updateHitRate();
            return undefined;
        }

        // Check expiration
        if (Date.now() > entry.expiresAt) {
            this.delete(key);
            this.stats.misses++;
            this.updateHitRate();
            return undefined;
        }

        // Update access metadata
        entry.accessedAt = Date.now();
        entry.accessCount++;
        
        this.stats.hits++;
        this.updateHitRate();
        this.recordAccessTime(Date.now() - startTime);

        return entry.value;
    }

    /**
     * Set a value in the cache
     */
    set(key: string, value: T, options: {
        ttl?: number;
        tags?: string[];
    } = {}): void {
        const size = this.calculateSize(value);
        const ttl = options.ttl ?? this.config.defaultTTL;
        const now = Date.now();

        // Evict if necessary
        this.evictIfNeeded(size);

        const entry: CacheEntry<T> = {
            value,
            createdAt: now,
            accessedAt: now,
            expiresAt: now + ttl,
            accessCount: 1,
            size,
            tags: options.tags ?? []
        };

        // Update stats if replacing existing entry
        const existing = this.cache.get(key);
        if (existing) {
            this.stats.size -= existing.size;
        } else {
            this.stats.entryCount++;
        }

        this.cache.set(key, entry);
        this.stats.size += size;

        // Persist if enabled
        if (this.config.persistence) {
            this.persist();
        }
    }

    /**
     * Delete a value from the cache
     */
    delete(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry) {
            this.stats.size -= entry.size;
            this.stats.entryCount--;
            this.config.onEvict?.(key, entry.value);
            this.cache.delete(key);

            if (this.config.persistence) {
                this.persist();
            }
            return true;
        }
        return false;
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.cache.clear();
        this.stats.size = 0;
        this.stats.entryCount = 0;

        if (this.config.persistence) {
            this.persist();
        }
    }

    /**
     * Check if key exists
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (Date.now() > entry.expiresAt) {
            this.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Get or set with factory function
     */
    async getOrSet(
        key: string,
        factory: () => T | Promise<T>,
        options: { ttl?: number; tags?: string[] } = {}
    ): Promise<T> {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await Promise.resolve(factory());
        this.set(key, value, options);
        return value;
    }

    /**
     * Invalidate entries by tag
     */
    invalidateByTag(tag: string): number {
        let count = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.tags.includes(tag)) {
                this.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Invalidate entries by pattern
     */
    invalidateByPattern(pattern: RegExp | string): number {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Get all keys
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Get all entries with metadata
     */
    entries(): Array<[string, CacheEntry<T>]> {
        return Array.from(this.cache.entries());
    }

    /**
     * Evict entries if limits exceeded
     */
    private evictIfNeeded(incomingSize: number): void {
        // Check entry count limit
        while (this.stats.entryCount >= this.config.maxEntries) {
            this.evictOne();
        }

        // Check size limit
        while (this.stats.size + incomingSize > this.config.maxSize && this.cache.size > 0) {
            this.evictOne();
        }
    }

    /**
     * Evict one entry based on policy
     */
    private evictOne(): void {
        let keyToEvict: string | undefined;

        switch (this.config.evictionPolicy) {
            case 'lru':
                keyToEvict = this.findLRUKey();
                break;
            case 'lfu':
                keyToEvict = this.findLFUKey();
                break;
            case 'fifo':
                keyToEvict = this.findFIFOKey();
                break;
        }

        if (keyToEvict) {
            this.delete(keyToEvict);
            this.stats.evictions++;
        }
    }

    /**
     * Find least recently used key
     */
    private findLRUKey(): string | undefined {
        let lruKey: string | undefined;
        let lruTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.accessedAt < lruTime) {
                lruTime = entry.accessedAt;
                lruKey = key;
            }
        }

        return lruKey;
    }

    /**
     * Find least frequently used key
     */
    private findLFUKey(): string | undefined {
        let lfuKey: string | undefined;
        let lfuCount = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.accessCount < lfuCount) {
                lfuCount = entry.accessCount;
                lfuKey = key;
            }
        }

        return lfuKey;
    }

    /**
     * Find oldest key (FIFO)
     */
    private findFIFOKey(): string | undefined {
        let fifoKey: string | undefined;
        let fifoTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.createdAt < fifoTime) {
                fifoTime = entry.createdAt;
                fifoKey = key;
            }
        }

        return fifoKey;
    }

    /**
     * Calculate approximate size of value
     */
    private calculateSize(value: T): number {
        const json = JSON.stringify(value);
        return json ? json.length * 2 : 0; // Approximate UTF-16 size
    }

    /**
     * Update hit rate
     */
    private updateHitRate(): void {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }

    /**
     * Record access time for metrics
     */
    private recordAccessTime(time: number): void {
        this.accessTimes.push(time);
        if (this.accessTimes.length > 1000) {
            this.accessTimes = this.accessTimes.slice(-1000);
        }
        this.stats.avgAccessTime = this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
    }

    /**
     * Load cache from persistence
     */
    private loadFromPersistence(): void {
        if (!this.context || !this.config.persistenceKey) return;

        try {
            const data = this.context.globalState.get<Array<[string, CacheEntry<T>]>>(this.config.persistenceKey);
            if (data) {
                const now = Date.now();
                for (const [key, entry] of data) {
                    // Only restore non-expired entries
                    if (entry.expiresAt > now) {
                        this.cache.set(key, entry);
                        this.stats.size += entry.size;
                        this.stats.entryCount++;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load cache from persistence:', error);
        }
    }

    /**
     * Save cache to persistence
     */
    private persist(): void {
        if (!this.context || !this.config.persistenceKey) return;

        try {
            const data = Array.from(this.cache.entries());
            this.context.globalState.update(this.config.persistenceKey, data);
        } catch (error) {
            console.error('Failed to persist cache:', error);
        }
    }
}

/**
 * Request deduplication cache
 * Prevents duplicate concurrent requests for the same resource
 */
export class RequestDeduplicator<T = unknown> {
    private pending: Map<string, Promise<T>> = new Map();

    /**
     * Execute request with deduplication
     */
    async execute(key: string, request: () => Promise<T>): Promise<T> {
        // Return existing pending request if available
        const existingRequest = this.pending.get(key);
        if (existingRequest) {
            return existingRequest;
        }

        // Create new request
        const promise = request().finally(() => {
            this.pending.delete(key);
        });

        this.pending.set(key, promise);
        return promise;
    }

    /**
     * Check if request is pending
     */
    isPending(key: string): boolean {
        return this.pending.has(key);
    }

    /**
     * Get count of pending requests
     */
    get pendingCount(): number {
        return this.pending.size;
    }
}

/**
 * TTL Map - Simple map with automatic expiration
 */
export class TTLMap<K, V> {
    private map: Map<K, { value: V; expiresAt: number }> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor(private defaultTTL: number = 60000) {
        this.startCleanup();
    }

    set(key: K, value: V, ttl?: number): void {
        this.map.set(key, {
            value,
            expiresAt: Date.now() + (ttl ?? this.defaultTTL)
        });
    }

    get(key: K): V | undefined {
        const entry = this.map.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.map.delete(key);
            return undefined;
        }
        return entry.value;
    }

    has(key: K): boolean {
        return this.get(key) !== undefined;
    }

    delete(key: K): boolean {
        return this.map.delete(key);
    }

    clear(): void {
        this.map.clear();
    }

    get size(): number {
        return this.map.size;
    }

    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.map.entries()) {
                if (now > entry.expiresAt) {
                    this.map.delete(key);
                }
            }
        }, 60000); // Cleanup every minute
    }

    dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.map.clear();
    }
}

/**
 * Memoization decorator factory
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
    fn: T,
    options: {
        ttl?: number;
        maxSize?: number;
        keyGenerator?: (...args: Parameters<T>) => string;
    } = {}
): T {
    const cache = new AdvancedCache({
        defaultTTL: options.ttl ?? 300000, // 5 minutes default
        maxEntries: options.maxSize ?? 100
    });

    const keyGen = options.keyGenerator ?? ((...args: unknown[]) => JSON.stringify(args));

    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = keyGen(...args);
        const cached = cache.get(key);
        if (cached !== undefined) {
            return cached as ReturnType<T>;
        }

        const result = fn(...args);
        cache.set(key, result);
        return result as ReturnType<T>;
    }) as T;
}

/**
 * Create namespaced cache instance
 */
export function createNamespacedCache<T>(
    namespace: string,
    config: Partial<CacheConfig> = {}
): AdvancedCache<T> {
    return new AdvancedCache<T>({
        ...config,
        persistenceKey: `devops-omnibus-${namespace}`
    });
}

// Singleton caches for common use cases
export const apiResponseCache = new AdvancedCache({
    defaultTTL: 60000, // 1 minute for API responses
    maxEntries: 1000
});

export const providerStateCache = new AdvancedCache({
    defaultTTL: 300000, // 5 minutes for provider state
    maxEntries: 100
});

export const commandResultCache = new AdvancedCache({
    defaultTTL: 30000, // 30 seconds for command results
    maxEntries: 500
});
