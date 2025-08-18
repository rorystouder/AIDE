import * as vscode from 'vscode';
import * as sinon from 'sinon';

/**
 * Test utilities and mocks for the AI Learning Tool tests
 */

export class TestUtils {
    /**
     * Creates a mock VS Code TextDocument
     */
    static createMockDocument(
        content: string[], 
        languageId: string = 'javascript',
        fileName: string = '/test.js'
    ): vscode.TextDocument {
        return {
            uri: vscode.Uri.file(fileName),
            fileName,
            languageId,
            version: 1,
            lineCount: content.length,
            isClosed: false,
            isDirty: false,
            isUntitled: false,
            eol: vscode.EndOfLine.LF,
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
            
            getWordRangeAtPosition: (position: vscode.Position) => {
                const line = content[position.line];
                if (!line) return undefined;
                
                const wordMatch = line.match(/\w+/);
                if (!wordMatch) return undefined;
                
                const start = wordMatch.index || 0;
                const end = start + wordMatch[0].length;
                
                return new vscode.Range(
                    position.line, start,
                    position.line, end
                );
            },
            
            validateRange: (range: vscode.Range) => range,
            validatePosition: (position: vscode.Position) => position,
            offsetAt: (position: vscode.Position) => 0,
            positionAt: (offset: number) => new vscode.Position(0, 0),
            save: () => Promise.resolve(true)
        } as vscode.TextDocument;
    }

    /**
     * Creates a mock VS Code workspace configuration
     */
    static createMockConfiguration(configValues: Record<string, any>): vscode.WorkspaceConfiguration {
        return {
            get: <T>(section: string, defaultValue?: T): T => {
                return configValues[section] !== undefined ? configValues[section] : (defaultValue as T);
            },
            
            has: (section: string): boolean => {
                return configValues.hasOwnProperty(section);
            },
            
            inspect: <T>(section: string) => {
                return {
                    key: section,
                    defaultValue: undefined,
                    globalValue: configValues[section],
                    workspaceValue: undefined,
                    workspaceFolderValue: undefined,
                    defaultLanguageValue: undefined,
                    globalLanguageValue: undefined,
                    workspaceLanguageValue: undefined,
                    workspaceFolderLanguageValue: undefined,
                    languageIds: undefined
                };
            },
            
            update: sinon.stub().resolves(),
            
            [Symbol.iterator]: function* () {
                for (const [key, value] of Object.entries(configValues)) {
                    yield [key, value];
                }
            }
        } as vscode.WorkspaceConfiguration;
    }

    /**
     * Creates a mock VS Code cancellation token
     */
    static createMockCancellationToken(cancelled: boolean = false): vscode.CancellationToken {
        return {
            isCancellationRequested: cancelled,
            onCancellationRequested: sinon.stub().returns({ dispose: sinon.stub() })
        };
    }

    /**
     * Creates a mock VS Code Uri
     */
    static createMockUri(path: string): vscode.Uri {
        return {
            scheme: 'file',
            authority: '',
            path: path,
            query: '',
            fragment: '',
            fsPath: path,
            with: sinon.stub(),
            toString: () => `file://${path}`,
            toJSON: () => ({ scheme: 'file', path })
        } as vscode.Uri;
    }

    /**
     * Creates a mock progress object for withProgress calls
     */
    static createMockProgress(): any {
        return {
            report: sinon.stub()
        };
    }

    /**
     * Creates a mock output channel
     */
    static createMockOutputChannel(name: string = 'Test Channel'): sinon.SinonStubbedInstance<vscode.OutputChannel> {
        return {
            name,
            append: sinon.stub(),
            appendLine: sinon.stub(),
            clear: sinon.stub(),
            show: sinon.stub() as any,
            hide: sinon.stub(),
            dispose: sinon.stub(),
            replace: sinon.stub()
        };
    }

    /**
     * Creates a mock workspace folder
     */
    static createMockWorkspaceFolder(name: string, path: string): vscode.WorkspaceFolder {
        return {
            uri: TestUtils.createMockUri(path),
            name,
            index: 0
        };
    }

    /**
     * Stubs common VS Code APIs for testing
     */
    static stubVSCodeAPIs() {
        const stubs = {
            showInformationMessage: sinon.stub(vscode.window, 'showInformationMessage'),
            showWarningMessage: sinon.stub(vscode.window, 'showWarningMessage'),
            showErrorMessage: sinon.stub(vscode.window, 'showErrorMessage'),
            showInputBox: sinon.stub(vscode.window, 'showInputBox'),
            showQuickPick: sinon.stub(vscode.window, 'showQuickPick'),
            createOutputChannel: sinon.stub(vscode.window, 'createOutputChannel'),
            withProgress: sinon.stub(vscode.window, 'withProgress'),
            executeCommand: sinon.stub(vscode.commands, 'executeCommand'),
            getConfiguration: sinon.stub(vscode.workspace, 'getConfiguration'),
            createWebviewPanel: sinon.stub(vscode.window, 'createWebviewPanel'),
            registerCommand: sinon.stub(vscode.commands, 'registerCommand')
        };

        // Setup default behaviors
        stubs.withProgress.callsFake(async (options, task) => {
            const progress = TestUtils.createMockProgress();
            return await task(progress, {} as any);
        });

        stubs.createOutputChannel.callsFake((name: string) => {
            return TestUtils.createMockOutputChannel(name) as any;
        });

        stubs.executeCommand.resolves();
        stubs.registerCommand.returns({ dispose: sinon.stub() });

        return stubs;
    }

    /**
     * Restores all sinon stubs
     */
    static restoreAllStubs() {
        sinon.restore();
    }

    /**
     * Creates a test workspace context for context service tests
     */
    static createTestWorkspaceContext(): any {
        return {
            currentFile: {
                uri: TestUtils.createMockUri('/test/current.js'),
                fileName: 'current.js',
                relativePath: 'current.js',
                content: 'const test = "hello";',
                language: 'javascript',
                isOpen: true,
                relevanceScore: 1.0
            },
            relatedFiles: [
                {
                    uri: TestUtils.createMockUri('/test/related.js'),
                    fileName: 'related.js',
                    relativePath: 'related.js',
                    content: 'export function helper() {}',
                    language: 'javascript',
                    isOpen: false,
                    relevanceScore: 0.8
                }
            ],
            imports: ['lodash', './helper'],
            projectType: 'node',
            workspaceName: 'test-project'
        };
    }

    /**
     * Creates test search results for search service tests
     */
    static createTestSearchResults(count: number = 3): any[] {
        const results = [];
        
        for (let i = 0; i < count; i++) {
            results.push({
                uri: TestUtils.createMockUri(`/test/file${i}.js`),
                fileName: `file${i}.js`,
                relativePath: `src/file${i}.js`,
                lineNumber: i + 1,
                lineText: `console.log("test ${i}");`,
                matchText: 'test',
                contextBefore: [`// Before line ${i}`],
                contextAfter: [`// After line ${i}`],
                relevanceScore: 10 - i
            });
        }
        
        return results;
    }

    /**
     * Creates a mock axios response for AI service tests
     */
    static createMockAxiosResponse(provider: string, content: string): any {
        switch (provider) {
            case 'openai':
                return {
                    data: {
                        choices: [{
                            message: { content }
                        }]
                    }
                };
            
            case 'claude':
                return {
                    data: {
                        content: [{ text: content }]
                    }
                };
            
            case 'local':
                return {
                    data: {
                        response: content
                    }
                };
            
            default:
                return { data: { text: content } };
        }
    }

    /**
     * Creates a mock axios error for testing error scenarios
     */
    static createMockAxiosError(
        statusCode?: number, 
        errorCode?: string, 
        message: string = 'Mock error'
    ): any {
        const error = new Error(message);
        
        if (statusCode) {
            (error as any).response = {
                status: statusCode,
                data: {
                    error: { message }
                }
            };
        }
        
        if (errorCode) {
            (error as any).code = errorCode;
        }
        
        return error;
    }

    /**
     * Creates a delay for testing async operations
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Asserts that a stub was called with a partial match
     */
    static assertCalledWithPartial(stub: sinon.SinonStub, expectedArgs: any[]) {
        const calls = stub.getCalls();
        const found = calls.some(call => {
            return expectedArgs.every((expectedArg, index) => {
                const actualArg = call.args[index];
                if (typeof expectedArg === 'string' && typeof actualArg === 'string') {
                    return actualArg.includes(expectedArg);
                }
                return sinon.match(expectedArg).test(actualArg);
            });
        });
        
        if (!found) {
            throw new Error(
                `Expected stub to be called with partial match of ${JSON.stringify(expectedArgs)}, ` +
                `but was called with: ${calls.map(c => JSON.stringify(c.args)).join(', ')}`
            );
        }
    }

    /**
     * Creates a mock file system for testing file operations
     */
    static createMockFileSystem(): Map<string, string> {
        return new Map([
            ['/test/package.json', '{"name": "test", "dependencies": {}}'],
            ['/test/src/index.js', 'console.log("Hello World");'],
            ['/test/src/utils.js', 'export function helper() {}'],
            ['/test/README.md', '# Test Project'],
            ['/test/.gitignore', 'node_modules/\n*.log']
        ]);
    }
}

/**
 * Custom assertion helpers
 */
export class TestAssertions {
    /**
     * Asserts that a string contains all specified substrings
     */
    static containsAll(actual: string, expected: string[], message?: string) {
        const missing = expected.filter(exp => !actual.includes(exp));
        if (missing.length > 0) {
            throw new Error(
                message || `String does not contain all expected substrings. Missing: ${missing.join(', ')}`
            );
        }
    }

    /**
     * Asserts that an array contains objects with specified properties
     */
    static containsObjectsWithProperties(actual: any[], expectedProperties: Record<string, any>[], message?: string) {
        for (const expectedProp of expectedProperties) {
            const found = actual.some(item => {
                return Object.entries(expectedProp).every(([key, value]) => {
                    return item[key] === value;
                });
            });
            
            if (!found) {
                throw new Error(
                    message || `Array does not contain object with properties: ${JSON.stringify(expectedProp)}`
                );
            }
        }
    }

    /**
     * Asserts that a function eventually returns a truthy value
     */
    static async eventually(
        condition: () => boolean | Promise<boolean>, 
        timeout: number = 1000,
        message?: string
    ) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return;
            }
            await TestUtils.delay(10);
        }
        
        throw new Error(message || `Condition was not met within ${timeout}ms`);
    }
}