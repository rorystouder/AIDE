import * as assert from 'assert';
import { CacheService } from '../cache-service';

suite('CacheService Test Suite', () => {
    let cacheService: CacheService;

    setup(() => {
        cacheService = CacheService.getInstance();
        cacheService.clearAll();
    });

    teardown(() => {
        cacheService.clearAll();
    });

    test('Should cache and retrieve completions', () => {
        const prompt = 'test prompt';
        const completion = 'test completion';
        
        cacheService.cacheCompletion(prompt, completion);
        const retrieved = cacheService.getCachedCompletion(prompt);
        
        assert.strictEqual(retrieved, completion);
    });

    test('Should return null for non-cached completions', () => {
        const result = cacheService.getCachedCompletion('non-existent');
        assert.strictEqual(result, null);
    });

    test('Should cache and retrieve context data', () => {
        const key = 'test-context';
        const data = { test: 'data', value: 123 };
        
        cacheService.cacheContext(key, data);
        const retrieved = cacheService.getCachedContext(key);
        
        assert.deepStrictEqual(retrieved, data);
    });

    test('Should respect TTL for cached items', (done) => {
        const key = 'ttl-test';
        const data = 'test data';
        const ttl = 100; // 100ms TTL
        
        cacheService.cacheContext(key, data, ttl);
        
        // Should exist immediately
        assert.strictEqual(cacheService.getCachedContext(key), data);
        
        // Should expire after TTL
        setTimeout(() => {
            const result = cacheService.getCachedContext(key);
            assert.strictEqual(result, null);
            done();
        }, ttl + 50);
    });

    test('Should cache file content with version', () => {
        const uri = { toString: () => 'file://test.js' } as any;
        const content = 'file content';
        const version = 1;
        
        cacheService.cacheFileContent(uri, content, version);
        const retrieved = cacheService.getCachedFileContent(uri, version);
        
        assert.strictEqual(retrieved, content);
    });

    test('Should return null for different file version', () => {
        const uri = { toString: () => 'file://test.js' } as any;
        const content = 'file content';
        
        cacheService.cacheFileContent(uri, content, 1);
        const retrieved = cacheService.getCachedFileContent(uri, 2);
        
        assert.strictEqual(retrieved, null);
    });

    test('Should cache provider-specific responses', () => {
        const provider = 'openai';
        const prompt = 'test prompt';
        const response = 'provider response';
        
        cacheService.cacheProviderResponse(provider, prompt, response);
        const retrieved = cacheService.getCachedProviderResponse(provider, prompt);
        
        assert.strictEqual(retrieved, response);
    });

    test('Should invalidate file cache', () => {
        const uri = { toString: () => 'file://test.js' } as any;
        const content = 'file content';
        
        cacheService.cacheFileContent(uri, content, 1);
        assert.strictEqual(cacheService.getCachedFileContent(uri, 1), content);
        
        cacheService.invalidateFileCache(uri);
        assert.strictEqual(cacheService.getCachedFileContent(uri, 1), null);
    });

    test('Should invalidate workspace cache', () => {
        const workspaceId = 'test-workspace';
        const analysis = { test: 'analysis' };
        
        cacheService.cacheWorkspaceAnalysis(workspaceId, analysis);
        assert.deepStrictEqual(cacheService.getCachedWorkspaceAnalysis(workspaceId), analysis);
        
        cacheService.invalidateWorkspaceCache();
        assert.strictEqual(cacheService.getCachedWorkspaceAnalysis(workspaceId), null);
    });

    test('Should get cache statistics', () => {
        // Add some cache entries
        cacheService.cacheCompletion('prompt1', 'completion1');
        cacheService.cacheContext('context1', { data: 'test' });
        
        const stats = cacheService.getCacheStats();
        
        assert.ok(stats.completions.size >= 1);
        assert.ok(stats.context.size >= 1);
        assert.ok(stats.memoryUsage);
        assert.ok(typeof stats.memoryUsage === 'string');
    });

    test('Should clear all caches', () => {
        cacheService.cacheCompletion('prompt', 'completion');
        cacheService.cacheContext('context', { data: 'test' });
        
        cacheService.clearAll();
        
        assert.strictEqual(cacheService.getCachedCompletion('prompt'), null);
        assert.strictEqual(cacheService.getCachedContext('context'), null);
        
        const stats = cacheService.getCacheStats();
        assert.strictEqual(stats.completions.size, 0);
        assert.strictEqual(stats.context.size, 0);
    });

    test('Should handle concurrent cache operations', () => {
        const operations = [];
        
        // Add multiple cache operations
        for (let i = 0; i < 100; i++) {
            operations.push(
                cacheService.cacheCompletion(`prompt${i}`, `completion${i}`)
            );
        }
        
        // Verify all cached
        for (let i = 0; i < 100; i++) {
            const result = cacheService.getCachedCompletion(`prompt${i}`);
            assert.strictEqual(result, `completion${i}`);
        }
    });

    test('Should normalize prompts for consistent hashing', () => {
        const prompt1 = '  Test  Prompt  ';
        const prompt2 = 'test prompt';
        const completion = 'test completion';
        
        cacheService.cacheCompletion(prompt1, completion);
        const result = cacheService.getCachedCompletion(prompt2);
        
        // Should retrieve same completion due to normalization
        assert.strictEqual(result, completion);
    });
});