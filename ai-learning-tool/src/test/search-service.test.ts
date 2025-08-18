import * as assert from 'assert';
import * as vscode from 'vscode';
import { SearchService, SearchResult } from '../search-service';

suite('SearchService Test Suite', () => {
    let searchService: SearchService;

    setup(() => {
        searchService = SearchService.getInstance();
    });

    test('Should build search regex correctly', () => {
        // Test regular text search
        let regex = (searchService as any).buildSearchRegex('test', { useRegex: false });
        assert.ok(regex.test('this is a test'));
        assert.ok(!regex.test('this is a TEST')); // Case sensitive by default

        // Test case insensitive
        regex = (searchService as any).buildSearchRegex('test', { caseSensitive: false });
        assert.ok(regex.test('this is a TEST'));

        // Test whole word
        regex = (searchService as any).buildSearchRegex('test', { wholeWord: true });
        assert.ok(regex.test('test function'));
        assert.ok(!regex.test('testing function'));

        // Test regex mode
        regex = (searchService as any).buildSearchRegex('te.*st', { useRegex: true });
        assert.ok(regex.test('test'));
        assert.ok(regex.test('tempest'));
        assert.ok(!regex.test('tst'));
    });

    test('Should get definition patterns for JavaScript', () => {
        const patterns = (searchService as any).getDefinitionPatterns('myFunction', 'javascript');
        
        assert.ok(patterns.some((p: string) => p.includes('function\\s+myFunction')));
        assert.ok(patterns.some((p: string) => p.includes('const\\s+myFunction')));
        assert.ok(patterns.some((p: string) => p.includes('class\\s+myFunction')));
        assert.ok(patterns.some((p: string) => p.includes('export')));
    });

    test('Should get definition patterns for Python', () => {
        const patterns = (searchService as any).getDefinitionPatterns('my_function', 'python');
        
        assert.ok(patterns.some((p: string) => p.includes('def\\s+my_function')));
        assert.ok(patterns.some((p: string) => p.includes('class\\s+my_function')));
        assert.ok(patterns.some((p: string) => p.includes('lambda')));
    });

    test('Should get definition patterns for Java', () => {
        const patterns = (searchService as any).getDefinitionPatterns('MyClass', 'java');
        
        assert.ok(patterns.some((p: string) => p.includes('class\\s+MyClass')));
        assert.ok(patterns.some((p: string) => p.includes('interface\\s+MyClass')));
        assert.ok(patterns.some((p: string) => p.includes('public')));
    });

    test('Should extract code keywords correctly', () => {
        const code = `
            function calculateTotal(items) {
                const total = items.reduce((sum, item) => sum + item.price, 0);
                return total;
            }
        `;
        
        const keywords = (searchService as any).extractCodeKeywords(code, 'javascript');
        
        assert.ok(keywords.includes('calculateTotal'));
        assert.ok(keywords.includes('items'));
        assert.ok(keywords.includes('total'));
        assert.ok(keywords.includes('sum'));
        assert.ok(keywords.includes('item'));
        assert.ok(keywords.includes('price'));
        
        // Should not include language keywords
        assert.ok(!keywords.includes('function'));
        assert.ok(!keywords.includes('const'));
        assert.ok(!keywords.includes('return'));
    });

    test('Should identify language keywords correctly', () => {
        // JavaScript keywords
        assert.ok((searchService as any).isLanguageKeyword('function', 'javascript'));
        assert.ok((searchService as any).isLanguageKeyword('const', 'javascript'));
        assert.ok(!(searchService as any).isLanguageKeyword('myVariable', 'javascript'));

        // Python keywords
        assert.ok((searchService as any).isLanguageKeyword('def', 'python'));
        assert.ok((searchService as any).isLanguageKeyword('class', 'python'));
        assert.ok(!(searchService as any).isLanguageKeyword('my_function', 'python'));

        // Java keywords
        assert.ok((searchService as any).isLanguageKeyword('public', 'java'));
        assert.ok((searchService as any).isLanguageKeyword('class', 'java'));
        assert.ok(!(searchService as any).isLanguageKeyword('MyClass', 'java'));
    });

    test('Should calculate relevance score correctly', () => {
        // Exact match should have high score
        let score = (searchService as any).calculateRelevanceScore('test', 'test', 'test.js', 'function test() {}');
        assert.ok(score > 10);

        // File name match should add score
        score = (searchService as any).calculateRelevanceScore('helper', 'helper', 'helper.js', 'const x = 1;');
        assert.ok(score > 5);

        // Context keywords should add score
        score = (searchService as any).calculateRelevanceScore('test', 'test', 'file.js', 'function test() {}');
        assert.ok(score > 0);
    });

    test('Should detect if match is in string or comment', () => {
        // In comment
        assert.ok(!(searchService as any).shouldIncludeMatch('// test comment', 5, { includeComments: false }));
        assert.ok((searchService as any).shouldIncludeMatch('// test comment', 5, { includeComments: true }));

        // In string
        assert.ok(!(searchService as any).shouldIncludeMatch('"test string"', 5, { includeStrings: false }));
        assert.ok((searchService as any).shouldIncludeMatch('"test string"', 5, { includeStrings: true }));

        // Not in string or comment
        assert.ok((searchService as any).shouldIncludeMatch('const test = 1;', 6, { includeComments: false, includeStrings: false }));
    });

    test('Should get context lines correctly', () => {
        const lines = ['line1', 'line2', 'line3', 'line4', 'line5'];
        
        // Get lines before
        let context = (searchService as any).getContextLines(lines, 2, 2, 'before');
        assert.deepStrictEqual(context, ['line1', 'line2']);

        // Get lines after
        context = (searchService as any).getContextLines(lines, 2, 2, 'after');
        assert.deepStrictEqual(context, ['line4', 'line5']);

        // Handle edge cases
        context = (searchService as any).getContextLines(lines, 0, 2, 'before');
        assert.deepStrictEqual(context, []);

        context = (searchService as any).getContextLines(lines, 4, 2, 'after');
        assert.deepStrictEqual(context, []);
    });

    test('Should get file types for language correctly', () => {
        let types = (searchService as any).getFileTypesForLanguage('javascript');
        assert.ok(types.includes('**/*.js'));
        assert.ok(types.includes('**/*.jsx'));

        types = (searchService as any).getFileTypesForLanguage('typescript');
        assert.ok(types.includes('**/*.ts'));
        assert.ok(types.includes('**/*.tsx'));

        types = (searchService as any).getFileTypesForLanguage('python');
        assert.ok(types.includes('**/*.py'));

        types = (searchService as any).getFileTypesForLanguage('unknown');
        assert.deepStrictEqual(types, ['**/*']);
    });

    test('Should normalize search options correctly', () => {
        const options = (searchService as any).normalizeSearchOptions({});
        
        assert.strictEqual(options.includeComments, true);
        assert.strictEqual(options.includeStrings, true);
        assert.strictEqual(options.caseSensitive, false);
        assert.strictEqual(options.wholeWord, false);
        assert.strictEqual(options.useRegex, false);
        assert.strictEqual(options.maxResults, 50);
        assert.strictEqual(options.contextLines, 2);
        assert.ok(Array.isArray(options.fileTypes));
        assert.ok(Array.isArray(options.excludePatterns));
    });

    test('Should build include pattern correctly', () => {
        let pattern = (searchService as any).buildIncludePattern(['**/*.js', '**/*.ts']);
        assert.strictEqual(pattern, '{**/*.js,**/*.ts}');

        pattern = (searchService as any).buildIncludePattern([]);
        assert.strictEqual(pattern, '**/*');

        pattern = (searchService as any).buildIncludePattern(undefined);
        assert.strictEqual(pattern, '**/*');
    });

    test('Should build exclude pattern correctly', () => {
        let pattern = (searchService as any).buildExcludePattern(['node_modules/**', 'dist/**']);
        assert.strictEqual(pattern, '{node_modules/**,dist/**}');

        // Should use defaults when not provided
        pattern = (searchService as any).buildExcludePattern(undefined);
        assert.ok(pattern.includes('node_modules'));
        assert.ok(pattern.includes('dist'));
        assert.ok(pattern.includes('.git'));
    });

    test('Should deduplicate search results', () => {
        const results: SearchResult[] = [
            {
                uri: vscode.Uri.file('/test/file1.js'),
                fileName: 'file1.js',
                relativePath: 'file1.js',
                lineNumber: 10,
                lineText: 'test',
                matchText: 'test',
                contextBefore: [],
                contextAfter: [],
                relevanceScore: 10
            },
            {
                uri: vscode.Uri.file('/test/file1.js'),
                fileName: 'file1.js',
                relativePath: 'file1.js',
                lineNumber: 10, // Same file and line
                lineText: 'test',
                matchText: 'test',
                contextBefore: [],
                contextAfter: [],
                relevanceScore: 8
            },
            {
                uri: vscode.Uri.file('/test/file1.js'),
                fileName: 'file1.js',
                relativePath: 'file1.js',
                lineNumber: 20, // Different line
                lineText: 'another test',
                matchText: 'test',
                contextBefore: [],
                contextAfter: [],
                relevanceScore: 5
            }
        ];

        const deduplicated = (searchService as any).deduplicateResults(results);
        
        assert.strictEqual(deduplicated.length, 2);
        assert.ok(deduplicated.some((r: SearchResult) => r.lineNumber === 10));
        assert.ok(deduplicated.some((r: SearchResult) => r.lineNumber === 20));
    });

    test('Should find matches in line correctly', () => {
        const line = 'This is a test line with test word';
        const regex = /test/g;
        
        const matches = (searchService as any).findMatches(line, regex, {});
        
        assert.strictEqual(matches.length, 2);
        assert.strictEqual(matches[0].text, 'test');
        assert.strictEqual(matches[0].index, 10);
        assert.strictEqual(matches[1].text, 'test');
        assert.strictEqual(matches[1].index, 26);
    });
});