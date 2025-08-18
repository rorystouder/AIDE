import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { AiCompletionProvider } from '../completion-provider';

suite('Completion Provider Test Suite', () => {
    let provider: AiCompletionProvider;
    let mockDocument: vscode.TextDocument;
    let mockPosition: vscode.Position;
    let mockContext: vscode.InlineCompletionContext;
    let mockToken: vscode.CancellationToken;

    setup(() => {
        provider = new AiCompletionProvider();
        
        // Mock position
        mockPosition = new vscode.Position(5, 10);
        
        // Mock context
        mockContext = {
            triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
            selectedCompletionInfo: undefined
        };
        
        // Mock cancellation token
        mockToken = {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: () => {} })
        };
    });

    teardown(() => {
        provider.dispose();
        sinon.restore();
    });

    function createMockDocument(content: string[], languageId: string = 'javascript'): vscode.TextDocument {
        return {
            uri: vscode.Uri.file('/test.js'),
            fileName: '/test.js',
            languageId,
            version: 1,
            encoding: 'utf8',
            getText: (range?: vscode.Range) => {
                if (!range) {
                    return content.join('\n');
                }
                return content.slice(range.start.line, range.end.line + 1).join('\n');
            },
            lineAt: (line: number | vscode.Position) => {
                const lineNum = typeof line === 'number' ? line : line.line;
                return {
                    lineNumber: lineNum,
                    text: content[lineNum] || '',
                    range: new vscode.Range(lineNum, 0, lineNum, (content[lineNum] || '').length),
                    rangeIncludingLineBreak: new vscode.Range(lineNum, 0, lineNum + 1, 0),
                    firstNonWhitespaceCharacterIndex: 0,
                    isEmptyOrWhitespace: !(content[lineNum] || '').trim()
                };
            },
            lineCount: content.length,
            isClosed: false,
            isDirty: false,
            isUntitled: false,
            save: () => Promise.resolve(true),
            eol: vscode.EndOfLine.LF,
            getWordRangeAtPosition: () => undefined,
            validateRange: (range: vscode.Range) => range,
            validatePosition: (position: vscode.Position) => position,
            offsetAt: () => 0,
            positionAt: () => new vscode.Position(0, 0)
        } as vscode.TextDocument;
    }

    test('Should trigger completion for function declaration', async () => {
        const content = [
            'function myFunction() {',
            '    ',
            '}'
        ];
        mockDocument = createMockDocument(content);
        
        // Position at the empty line inside function
        mockPosition = new vscode.Position(1, 4);
        
        const shouldTrigger = (provider as any).shouldTriggerCompletion(mockDocument, mockPosition);
        assert.ok(shouldTrigger, 'Should trigger completion inside function body');
    });

    test('Should not trigger completion with text after cursor', async () => {
        const content = [
            'const x = 1; // comment'
        ];
        mockDocument = createMockDocument(content);
        
        // Position in middle of line with text after
        mockPosition = new vscode.Position(0, 8);
        
        const shouldTrigger = (provider as any).shouldTriggerCompletion(mockDocument, mockPosition);
        assert.ok(!shouldTrigger, 'Should not trigger with text after cursor');
    });

    test('Should not trigger completion in comments', async () => {
        const content = [
            '// This is a comment'
        ];
        mockDocument = createMockDocument(content);
        
        mockPosition = new vscode.Position(0, 10);
        
        const shouldTrigger = (provider as any).shouldTriggerCompletion(mockDocument, mockPosition);
        assert.ok(!shouldTrigger, 'Should not trigger in comments');
    });

    test('Should get trigger patterns for JavaScript', () => {
        const patterns = (provider as any).getTriggerPatterns('javascript');
        
        assert.ok(patterns.length > 0);
        assert.ok(patterns.some((p: RegExp) => p.test('function test() {')));
        assert.ok(patterns.some((p: RegExp) => p.test('const x = ')));
        assert.ok(patterns.some((p: RegExp) => p.test('// TODO:')));
    });

    test('Should get trigger patterns for TypeScript', () => {
        const patterns = (provider as any).getTriggerPatterns('typescript');
        
        assert.ok(patterns.length > 0);
        assert.ok(patterns.some((p: RegExp) => p.test('interface Test {')));
        assert.ok(patterns.some((p: RegExp) => p.test('type MyType = ')));
        assert.ok(patterns.some((p: RegExp) => p.test('class TestClass {')));
    });

    test('Should get trigger patterns for Python', () => {
        const patterns = (provider as any).getTriggerPatterns('python');
        
        assert.ok(patterns.length > 0);
        assert.ok(patterns.some((p: RegExp) => p.test('def test():')));
        assert.ok(patterns.some((p: RegExp) => p.test('class TestClass:')));
        assert.ok(patterns.some((p: RegExp) => p.test('# TODO:')));
    });

    test('Should detect strings and comments correctly', () => {
        // String detection
        assert.ok((provider as any).isInStringOrComment('"hello', 'javascript'));
        assert.ok((provider as any).isInStringOrComment("'hello", 'javascript'));
        assert.ok((provider as any).isInStringOrComment("`hello", 'javascript'));
        
        // Comment detection
        assert.ok((provider as any).isInStringOrComment('// comment', 'javascript'));
        assert.ok((provider as any).isInStringOrComment('# comment', 'python'));
        assert.ok((provider as any).isInStringOrComment('/* comment', 'javascript'));
        
        // Normal code
        assert.ok(!(provider as any).isInStringOrComment('const x = 1', 'javascript'));
    });

    test('Should get preceding lines correctly', () => {
        const content = [
            'line 0',
            'line 1', 
            'line 2',
            'line 3',
            'line 4',
            'line 5'
        ];
        mockDocument = createMockDocument(content);
        
        const precedingLines = (provider as any).getPrecedingLines(mockDocument, mockPosition, 3);
        
        assert.strictEqual(precedingLines, 'line 2\nline 3\nline 4');
    });

    test('Should get following lines correctly', () => {
        const content = [
            'line 0',
            'line 1',
            'line 2',
            'line 3',
            'line 4',
            'line 5'
        ];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(2, 0); // At line 2
        
        const followingLines = (provider as any).getFollowingLines(mockDocument, mockPosition, 2);
        
        assert.strictEqual(followingLines, 'line 3\nline 4');
    });

    test('Should post-process completion correctly', () => {
        const rawCompletion = `
        \`\`\`javascript
        const result = processData(input);
        return result;
        \`\`\`
        `;
        
        const content = ['function test() {'];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(0, 18);
        
        const processed = (provider as any).postProcessCompletion(rawCompletion, mockDocument, mockPosition);
        
        assert.ok(processed.includes('const result = processData(input)'));
        assert.ok(processed.includes('return result'));
        assert.ok(!processed.includes('```'));
    });

    test('Should remove explanatory text from completion', () => {
        const rawCompletion = `Here is the code you requested:
        const x = 1;
        console.log(x);
        
        This code creates a variable and logs it.`;
        
        const content = [''];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(0, 0);
        
        const processed = (provider as any).postProcessCompletion(rawCompletion, mockDocument, mockPosition);
        
        assert.ok(processed.includes('const x = 1'));
        assert.ok(processed.includes('console.log(x)'));
        assert.ok(!processed.includes('Here is the code'));
        assert.ok(!processed.includes('This code creates'));
    });

    test('Should detect code-like lines correctly', () => {
        assert.ok((provider as any).looksLikeCode('const x = 1;', 'javascript'));
        assert.ok((provider as any).looksLikeCode('function test() {}', 'javascript'));
        assert.ok((provider as any).looksLikeCode('if (condition) {', 'javascript'));
        assert.ok((provider as any).looksLikeCode('// comment', 'javascript'));
        assert.ok((provider as any).looksLikeCode('', 'javascript')); // Empty lines are fine
        
        // Should not look like code
        assert.ok(!(provider as any).looksLikeCode('This is just text', 'javascript'));
        assert.ok(!(provider as any).looksLikeCode('Here is some explanation', 'javascript'));
    });

    test('Should get indentation correctly', () => {
        assert.strictEqual((provider as any).getIndentation('    const x = 1;'), '    ');
        assert.strictEqual((provider as any).getIndentation('\t\tfunction test() {}'), '\t\t');
        assert.strictEqual((provider as any).getIndentation('no indentation'), '');
        assert.strictEqual((provider as any).getIndentation('  \t  mixed'), '  \t  ');
    });

    test('Should limit completion length', () => {
        const longCompletion = Array(20).fill('console.log("line");').join('\n');
        
        const content = [''];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(0, 0);
        
        const processed = (provider as any).postProcessCompletion(longCompletion, mockDocument, mockPosition);
        const lines = processed.split('\n');
        
        assert.ok(lines.length <= 10, 'Should limit completion to 10 lines');
    });

    test('Should apply proper indentation to multiline completions', () => {
        const completion = 'if (condition) {\nconsole.log("test");\n}';
        
        const content = ['function test() {', '    '];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(1, 4); // At indented position
        
        const processed = (provider as any).postProcessCompletion(completion, mockDocument, mockPosition);
        const lines = processed.split('\n');
        
        // First line should not be indented (continuation of current line)
        // Subsequent lines should be indented
        assert.ok(!lines[0].startsWith('    '), 'First line should not have added indentation');
        if (lines.length > 1) {
            assert.ok(lines[1].startsWith('    '), 'Second line should have indentation');
        }
    });

    test('Should not trigger when already processing', async () => {
        // Set processing flag
        (provider as any).isProcessing = true;
        
        const content = ['function test() {'];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(0, 18);
        
        const result = await provider.provideInlineCompletionItems(
            mockDocument,
            mockPosition,
            mockContext,
            mockToken
        );
        
        assert.strictEqual(result, undefined, 'Should not provide completions when already processing');
        
        // Reset processing flag
        (provider as any).isProcessing = false;
    });

    test('Should handle cancellation token', async () => {
        const content = ['function test() {'];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(0, 18);
        
        // Mock cancelled token
        const cancelledToken = {
            isCancellationRequested: true,
            onCancellationRequested: () => ({ dispose: () => {} })
        };
        
        const result = await provider.provideInlineCompletionItems(
            mockDocument,
            mockPosition,
            mockContext,
            cancelledToken
        );
        
        assert.strictEqual(result, undefined, 'Should return undefined when cancelled');
    });

    test('Should debounce completion requests', async () => {
        const content = ['function test() {'];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(0, 18);
        
        // Mock the debounce timer
        let timerCallback: (() => void) | null = null;
        const setTimeoutStub = sinon.stub(global, 'setTimeout').callsFake((callback, delay) => {
            timerCallback = callback as () => void;
            return 123 as any; // Mock timer ID
        });
        
        const clearTimeoutStub = sinon.stub(global, 'clearTimeout');
        
        // Start first completion request
        const promise = provider.provideInlineCompletionItems(
            mockDocument,
            mockPosition,
            mockContext,
            mockToken
        );
        
        // Verify setTimeout was called with debounce delay
        assert.ok(setTimeoutStub.calledOnce);
        assert.strictEqual(setTimeoutStub.firstCall.args[1], (provider as any).debounceMs);
        
        // Call completion again - should clear previous timer
        provider.provideInlineCompletionItems(
            mockDocument,
            mockPosition,
            mockContext,
            mockToken
        );
        
        assert.ok(clearTimeoutStub.calledOnce);
        
        setTimeoutStub.restore();
        clearTimeoutStub.restore();
    });

    test('Should build completion prompt correctly', async () => {
        const content = [
            '// Helper function',
            'function processData(data) {',
            '    ',
            '}'
        ];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(2, 4);
        
        const mockContext = { test: 'context' };
        
        // Mock ContextService
        const contextServiceStub = {
            formatContextForPrompt: sinon.stub().returns('Mocked context info')
        };
        
        (provider as any).contextService = contextServiceStub;
        
        const prompt = await (provider as any).buildCompletionPrompt(mockDocument, mockPosition, mockContext);
        
        assert.ok(prompt.includes('javascript developer'));
        assert.ok(prompt.includes('Mocked context info'));
        assert.ok(prompt.includes('processData(data)'));
        assert.ok(prompt.includes('<CURSOR>'));
        assert.ok(contextServiceStub.formatContextForPrompt.calledWith(mockContext, false));
    });

    test('Should handle errors gracefully during completion generation', async () => {
        const content = ['function test() {'];
        mockDocument = createMockDocument(content);
        mockPosition = new vscode.Position(0, 18);
        
        // Mock ContextService to throw error
        const contextServiceStub = {
            buildWorkspaceContext: sinon.stub().rejects(new Error('Context error'))
        };
        
        (provider as any).contextService = contextServiceStub;
        
        const consoleStub = sinon.stub(console, 'error');
        
        const completion = await (provider as any).generateCompletion(mockDocument, mockPosition);
        
        assert.strictEqual(completion, '');
        assert.ok(consoleStub.calledWith(sinon.match('Error generating completion')));
        
        consoleStub.restore();
    });

    test('Should dispose resources correctly', () => {
        const clearTimeoutStub = sinon.stub(global, 'clearTimeout');
        
        // Set a mock timer
        (provider as any).debounceTimer = 123;
        
        provider.dispose();
        
        assert.ok(clearTimeoutStub.calledWith(123));
        
        clearTimeoutStub.restore();
    });
});