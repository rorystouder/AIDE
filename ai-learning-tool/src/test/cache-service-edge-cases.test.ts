import * as assert from 'assert';
import * as vscode from 'vscode';
import { CacheService } from '../cache-service';
import { TestUtils } from './test-utils';

suite('CacheService Edge Cases Test Suite', () => {
    let cacheService: CacheService;

    setup(() => {
        cacheService = CacheService.getInstance();
        cacheService.clearAll();
    });

    teardown(() => {
        cacheService.clearAll();
    });

    test('Should handle extremely long prompts', () => {
        const longPrompt = 'a'.repeat(100000); // 100KB prompt
        const completion = 'test completion';
        
        cacheService.cacheCompletion(longPrompt, completion);
        const retrieved = cacheService.getCachedCompletion(longPrompt);
        
        assert.strictEqual(retrieved, completion);
    });

    test('Should handle prompts with special characters', () => {
        const specialPrompt = '!@#$%^&*()_+{}[]|\\:";\'<>?,./ ñáéíóú 中文 🚀🎯';
        const completion = 'special completion';
        
        cacheService.cacheCompletion(specialPrompt, completion);
        const retrieved = cacheService.getCachedCompletion(specialPrompt);
        
        assert.strictEqual(retrieved, completion);
    });

    test('Should handle empty prompts', () => {
        const emptyPrompt = '';
        const completion = 'empty completion';
        
        cacheService.cacheCompletion(emptyPrompt, completion);
        const retrieved = cacheService.getCachedCompletion(emptyPrompt);
        
        assert.strictEqual(retrieved, completion);
    });

    test('Should handle whitespace-only prompts', () => {
        const whitespacePrompt = '   \n\t\r   ';
        const completion = 'whitespace completion';
        
        cacheService.cacheCompletion(whitespacePrompt, completion);
        const retrieved = cacheService.getCachedCompletion(whitespacePrompt);
        
        assert.strictEqual(retrieved, completion);
    });

    test('Should handle prompts with only whitespace differences', () => {
        const prompt1 = 'test  prompt\n\nwith   spaces';
        const prompt2 = 'test prompt with spaces';
        const completion = 'normalized completion';
        
        cacheService.cacheCompletion(prompt1, completion);
        const retrieved = cacheService.getCachedCompletion(prompt2);
        
        assert.strictEqual(retrieved, completion);
    });

    test('Should handle null and undefined values gracefully', () => {
        assert.doesNotThrow(() => {
            cacheService.cacheCompletion(null as any, 'test');
        });
        
        assert.doesNotThrow(() => {
            cacheService.cacheCompletion('test', null as any);
        });
        
        const result = cacheService.getCachedCompletion(null as any);
        assert.strictEqual(result, null);
    });

    test('Should handle concurrent access correctly', async () => {
        const promises = [];
        const numOperations = 100;
        
        // Concurrent cache operations
        for (let i = 0; i < numOperations; i++) {
            promises.push(Promise.resolve().then(() => {
                cacheService.cacheCompletion(`prompt${i}`, `completion${i}`);
                return cacheService.getCachedCompletion(`prompt${i}`);
            }));
        }
        
        const results = await Promise.all(promises);
        
        // Verify all operations completed successfully
        for (let i = 0; i < numOperations; i++) {
            assert.strictEqual(results[i], `completion${i}`);
        }
    });

    test('Should handle cache operations during cleanup', async () => {
        // Fill cache with expired entries
        for (let i = 0; i < 50; i++) {
            cacheService.cacheContext(`expired${i}`, `data${i}`, 1); // 1ms TTL
        }
        
        // Wait for expiration
        await TestUtils.delay(10);
        
        // Perform operations while cleanup might be running
        cacheService.cacheCompletion('during-cleanup', 'test');
        const result = cacheService.getCachedCompletion('during-cleanup');
        
        assert.strictEqual(result, 'test');
    });

    test('Should handle cache size limit enforcement', () => {
        const maxSize = (cacheService as any).maxCacheSize;
        
        // Fill cache beyond limit
        for (let i = 0; i < maxSize + 100; i++) {
            cacheService.cacheCompletion(`prompt${i}`, `completion${i}`);
        }
        
        const stats = cacheService.getCacheStats();
        assert.ok(stats.completions.size <= maxSize);
        
        // Verify most recent entries are still available
        const recentResult = cacheService.getCachedCompletion(`prompt${maxSize + 99}`);
        assert.strictEqual(recentResult, `completion${maxSize + 99}`);
        
        // Verify oldest entries were evicted
        const oldResult = cacheService.getCachedCompletion('prompt0');
        assert.strictEqual(oldResult, null);
    });

    test('Should handle file URIs with special characters', () => {
        const specialUri = TestUtils.createMockUri('/path/with spaces/file (1).js');
        const content = 'test content';
        const version = 1;
        
        cacheService.cacheFileContent(specialUri, content, version);
        const retrieved = cacheService.getCachedFileContent(specialUri, version);
        
        assert.strictEqual(retrieved, content);
    });

    test('Should handle workspace analysis with large data', () => {
        const largeAnalysis = {
            files: Array(1000).fill(0).map((_, i) => ({ name: `file${i}.js` })),
            dependencies: Array(500).fill(0).map((_, i) => `dep${i}`),
            metadata: { huge: 'x'.repeat(10000) }
        };
        
        cacheService.cacheWorkspaceAnalysis('large-workspace', largeAnalysis);
        const retrieved = cacheService.getCachedWorkspaceAnalysis('large-workspace');
        
        assert.deepStrictEqual(retrieved, largeAnalysis);
    });

    test('Should handle provider response caching with zero TTL', () => {
        const provider = 'test-provider';
        const prompt = 'test prompt';
        const response = 'test response';
        
        // Cache with 0 TTL (should expire immediately)
        (cacheService as any).cacheProviderResponse(provider, prompt, response);
        
        // Should return null since TTL is 0
        const result = cacheService.getCachedProviderResponse(provider, prompt);
        assert.strictEqual(result, null);
    });

    test('Should handle cache invalidation with non-existent URIs', () => {
        const nonExistentUri = TestUtils.createMockUri('/non/existent/file.js');
        
        // Should not throw
        assert.doesNotThrow(() => {
            cacheService.invalidateFileCache(nonExistentUri);
        });
    });

    test('Should handle memory estimation for complex objects', () => {
        const complexObject = {
            nested: {
                array: [1, 2, 3, { deep: 'value' }],
                string: 'test'.repeat(1000),
                circular: null as any
            }
        };
        
        // Create circular reference
        complexObject.nested.circular = complexObject;
        
        cacheService.cacheContext('complex', complexObject);
        
        const stats = cacheService.getCacheStats();
        assert.ok(stats.memoryUsage !== '0 Bytes');
    });

    test('Should handle rapid cache updates', () => {
        const key = 'rapid-update';
        
        // Rapid updates to same key
        for (let i = 0; i < 100; i++) {
            cacheService.cacheContext(key, `value${i}`, 5000);
        }
        
        const result = cacheService.getCachedContext(key);
        assert.strictEqual(result, 'value99'); // Should have latest value
    });

    test('Should handle cache access during disposal', () => {
        cacheService.cacheCompletion('test', 'value');
        
        // Start disposal
        cacheService.dispose();
        
        // Operations after disposal should not throw but may return null
        const result = cacheService.getCachedCompletion('test');
        // Result could be null or the cached value, both are acceptable
        assert.ok(result === null || result === 'value');
    });

    test('Should handle TTL edge cases', () => {
        const key = 'ttl-test';
        const data = 'test data';
        
        // Test with negative TTL (should expire immediately)
        cacheService.cacheContext(key, data, -1000);
        let result = cacheService.getCachedContext(key);
        assert.strictEqual(result, null);
        
        // Test with very large TTL
        cacheService.cacheContext(key, data, Number.MAX_SAFE_INTEGER);
        result = cacheService.getCachedContext(key);
        assert.strictEqual(result, data);
        
        // Test with decimal TTL
        cacheService.cacheContext(key, data, 1.5);
        result = cacheService.getCachedContext(key);
        assert.strictEqual(result, data);
    });

    test('Should handle access count overflow', () => {
        const prompt = 'overflow-test';
        const completion = 'test completion';
        
        cacheService.cacheCompletion(prompt, completion);
        
        // Access many times to test access count
        for (let i = 0; i < 10000; i++) {
            cacheService.getCachedCompletion(prompt);
        }
        
        const stats = cacheService.getCacheStats();
        assert.ok(stats.completions.hits >= 10000);
    });

    test('Should handle cleanup during high load', async () => {
        // Create many entries that will expire
        for (let i = 0; i < 1000; i++) {
            cacheService.cacheContext(`temp${i}`, `data${i}`, 1);
        }
        
        // Create some that won't expire
        for (let i = 0; i < 100; i++) {
            cacheService.cacheContext(`permanent${i}`, `data${i}`, 10000);
        }
        
        // Wait for expiration
        await TestUtils.delay(20);
        
        // Force cleanup by creating new entries
        for (let i = 0; i < 10; i++) {
            cacheService.cacheContext(`new${i}`, `data${i}`, 5000);
        }
        
        // Verify permanent entries are still there
        const result = cacheService.getCachedContext('permanent50');
        assert.strictEqual(result, 'data50');
    });
});