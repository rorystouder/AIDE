import * as vscode from 'vscode';
import * as crypto from 'crypto';

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
    accessCount: number;
    lastAccessed: number;
}

export class CacheService {
    private static instance: CacheService;
    private completionCache = new Map<string, CacheEntry<string>>();
    private contextCache = new Map<string, CacheEntry<any>>();
    private readonly maxCacheSize = 1000;
    private readonly defaultTtl = 5 * 60 * 1000; // 5 minutes
    private readonly completionTtl = 2 * 60 * 1000; // 2 minutes for completions
    private cleanupInterval: NodeJS.Timeout;

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    constructor() {
        // Run cleanup every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60 * 1000);
    }

    /**
     * Cache AI completion responses
     */
    cacheCompletion(prompt: string, completion: string): void {
        const key = this.hashPrompt(prompt);
        const entry: CacheEntry<string> = {
            data: completion,
            timestamp: Date.now(),
            expiry: Date.now() + this.completionTtl,
            accessCount: 0,
            lastAccessed: Date.now()
        };

        this.completionCache.set(key, entry);
        this.enforceMaxSize(this.completionCache);
    }

    /**
     * Get cached completion
     */
    getCachedCompletion(prompt: string): string | null {
        const key = this.hashPrompt(prompt);
        const entry = this.completionCache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiry) {
            this.completionCache.delete(key);
            return null;
        }

        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = Date.now();

        return entry.data;
    }

    /**
     * Cache context data
     */
    cacheContext(key: string, data: any, ttl?: number): void {
        const entry: CacheEntry<any> = {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + (ttl || this.defaultTtl),
            accessCount: 0,
            lastAccessed: Date.now()
        };

        this.contextCache.set(key, entry);
        this.enforceMaxSize(this.contextCache);
    }

    /**
     * Get cached context
     */
    getCachedContext(key: string): any | null {
        const entry = this.contextCache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiry) {
            this.contextCache.delete(key);
            return null;
        }

        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = Date.now();

        return entry.data;
    }

    /**
     * Smart caching for file content with change detection
     */
    cacheFileContent(uri: vscode.Uri, content: string, version: number): void {
        const key = `file:${uri.toString()}:${version}`;
        this.cacheContext(key, content, 10 * 60 * 1000); // 10 minutes for file content
    }

    /**
     * Get cached file content
     */
    getCachedFileContent(uri: vscode.Uri, version: number): string | null {
        const key = `file:${uri.toString()}:${version}`;
        return this.getCachedContext(key);
    }

    /**
     * Cache workspace analysis results
     */
    cacheWorkspaceAnalysis(workspaceId: string, analysis: any): void {
        this.cacheContext(`workspace:${workspaceId}`, analysis, 15 * 60 * 1000); // 15 minutes
    }

    /**
     * Get cached workspace analysis
     */
    getCachedWorkspaceAnalysis(workspaceId: string): any | null {
        return this.getCachedContext(`workspace:${workspaceId}`);
    }

    /**
     * Cache provider-specific responses with different TTLs
     */
    cacheProviderResponse(provider: string, prompt: string, response: string): void {
        const ttlMap = {
            'claude': 5 * 60 * 1000,    // 5 minutes
            'openai': 3 * 60 * 1000,    // 3 minutes
            'local': 10 * 60 * 1000,    // 10 minutes (local is more stable)
            'cursor': 1 * 60 * 1000     // 1 minute (guidance changes less)
        };

        const key = `${provider}:${this.hashPrompt(prompt)}`;
        const ttl = ttlMap[provider as keyof typeof ttlMap] || this.completionTtl;
        
        const entry: CacheEntry<string> = {
            data: response,
            timestamp: Date.now(),
            expiry: Date.now() + ttl,
            accessCount: 0,
            lastAccessed: Date.now()
        };

        this.completionCache.set(key, entry);
    }

    /**
     * Get cached provider response
     */
    getCachedProviderResponse(provider: string, prompt: string): string | null {
        const key = `${provider}:${this.hashPrompt(prompt)}`;
        return this.getCachedCompletion(prompt);
    }

    /**
     * Invalidate cache entries based on file changes
     */
    invalidateFileCache(uri: vscode.Uri): void {
        const uriString = uri.toString();
        const keysToDelete: string[] = [];

        // Find all cache entries related to this file
        for (const [key] of this.contextCache) {
            if (key.includes(uriString)) {
                keysToDelete.push(key);
            }
        }

        // Remove related entries
        keysToDelete.forEach(key => {
            this.contextCache.delete(key);
        });
    }

    /**
     * Invalidate workspace cache when workspace changes
     */
    invalidateWorkspaceCache(): void {
        const keysToDelete: string[] = [];

        for (const [key] of this.contextCache) {
            if (key.startsWith('workspace:')) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            this.contextCache.delete(key);
        });
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        completions: { size: number; hits: number; misses: number };
        context: { size: number; hits: number; misses: number };
        memoryUsage: string;
    } {
        const completionHits = Array.from(this.completionCache.values())
            .reduce((sum, entry) => sum + entry.accessCount, 0);
        
        const contextHits = Array.from(this.contextCache.values())
            .reduce((sum, entry) => sum + entry.accessCount, 0);

        // Estimate memory usage
        const completionMemory = this.estimateMapMemory(this.completionCache);
        const contextMemory = this.estimateMapMemory(this.contextCache);
        const totalMemory = completionMemory + contextMemory;

        return {
            completions: {
                size: this.completionCache.size,
                hits: completionHits,
                misses: 0 // TODO: Track misses
            },
            context: {
                size: this.contextCache.size,
                hits: contextHits,
                misses: 0 // TODO: Track misses
            },
            memoryUsage: this.formatBytes(totalMemory)
        };
    }

    /**
     * Clear all caches
     */
    clearAll(): void {
        this.completionCache.clear();
        this.contextCache.clear();
    }

    /**
     * Clear expired entries and enforce size limits
     */
    private cleanup(): void {
        const now = Date.now();

        // Clean completion cache
        for (const [key, entry] of this.completionCache) {
            if (now > entry.expiry) {
                this.completionCache.delete(key);
            }
        }

        // Clean context cache
        for (const [key, entry] of this.contextCache) {
            if (now > entry.expiry) {
                this.contextCache.delete(key);
            }
        }

        // Enforce size limits
        this.enforceMaxSize(this.completionCache);
        this.enforceMaxSize(this.contextCache);
    }

    /**
     * Remove least recently used entries when cache is full
     */
    private enforceMaxSize<T>(cache: Map<string, CacheEntry<T>>): void {
        if (cache.size <= this.maxCacheSize) {
            return;
        }

        // Convert to array and sort by last accessed time
        const entries = Array.from(cache.entries()).sort((a, b) => 
            a[1].lastAccessed - b[1].lastAccessed
        );

        // Remove oldest entries
        const toRemove = cache.size - this.maxCacheSize;
        for (let i = 0; i < toRemove; i++) {
            cache.delete(entries[i][0]);
        }
    }

    /**
     * Create a hash key for prompts
     */
    private hashPrompt(prompt: string): string {
        // Normalize prompt before hashing
        const normalized = prompt.trim().toLowerCase().replace(/\s+/g, ' ');
        return crypto.createHash('md5').update(normalized).digest('hex');
    }

    /**
     * Estimate memory usage of a cache map
     */
    private estimateMapMemory<T>(cache: Map<string, CacheEntry<T>>): number {
        let total = 0;
        
        for (const [key, entry] of cache) {
            // Estimate key size
            total += key.length * 2; // Unicode characters are 2 bytes
            
            // Estimate entry size
            total += JSON.stringify(entry).length * 2;
        }
        
        return total;
    }

    /**
     * Format bytes to human readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clearAll();
    }
}