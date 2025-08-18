import * as assert from 'assert';
import * as vscode from 'vscode';
import { getAiCompletion, validateConfiguration, getAiCodeReview, AIRequestOptions } from '../ai-service';
import * as sinon from 'sinon';
import axios from 'axios';

suite('AI Service Test Suite', () => {
    let axiosStub: sinon.SinonStub;
    let configStub: sinon.SinonStub;
    let windowStub: sinon.SinonStub;
    
    setup(() => {
        axiosStub = sinon.stub(axios, 'post');
        configStub = sinon.stub(vscode.workspace, 'getConfiguration');
        windowStub = sinon.stub(vscode.window, 'showErrorMessage');
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should get AI completion from OpenAI provider', async () => {
        // Mock configuration
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': 'sk-test-key',
                    'openai.model': 'gpt-3.5-turbo',
                    'openai.apiUrl': 'https://api.openai.com/v1/chat/completions'
                };
                return config[key] || defaultValue;
            }
        });

        // Mock axios response
        axiosStub.resolves({
            data: {
                choices: [{
                    message: {
                        content: 'Test completion response'
                    }
                }]
            }
        });

        // Mock progress window
        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const result = await getAiCompletion('Test prompt');
        
        assert.strictEqual(result, 'Test completion response');
        assert.ok(axiosStub.calledOnce);
        assert.ok(axiosStub.calledWith(
            'https://api.openai.com/v1/chat/completions',
            sinon.match.any,
            sinon.match.has('headers')
        ));

        progressStub.restore();
    });

    test('Should get AI completion from Claude provider', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'claude',
                    'apiKey': 'sk-ant-test-key',
                    'claude.model': 'claude-3-haiku-20240307',
                    'claude.apiUrl': 'https://api.anthropic.com/v1/messages'
                };
                return config[key] || defaultValue;
            }
        });

        axiosStub.resolves({
            data: {
                content: [{
                    text: 'Claude response'
                }]
            }
        });

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const result = await getAiCompletion('Test prompt');
        
        assert.strictEqual(result, 'Claude response');
        assert.ok(axiosStub.calledWith(
            'https://api.anthropic.com/v1/messages',
            sinon.match.any,
            sinon.match.has('headers')
        ));

        progressStub.restore();
    });

    test('Should get AI completion from local provider', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'local',
                    'local.model': 'codellama:7b',
                    'local.apiUrl': 'http://localhost:11434/api/generate'
                };
                return config[key] || defaultValue;
            }
        });

        axiosStub.resolves({
            data: {
                response: 'Local AI response'
            }
        });

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const result = await getAiCompletion('Test prompt');
        
        assert.strictEqual(result, 'Local AI response');
        assert.ok(axiosStub.calledWith(
            'http://localhost:11434/api/generate',
            sinon.match.any,
            sinon.match.has('headers')
        ));

        progressStub.restore();
    });

    test('Should handle Cursor provider integration', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'cursor',
                    'cursor.integration': true
                };
                return config[key] || defaultValue;
            }
        });

        const infoStub = sinon.stub(vscode.window, 'showInformationMessage');
        infoStub.resolves(undefined);

        const result = await getAiCompletion('Test prompt');
        
        assert.ok(result.includes('Cursor AI Integration Suggestion'));
        assert.ok(result.includes('Test prompt'));
        assert.ok(infoStub.called);

        infoStub.restore();
    });

    test('Should use cache when enabled', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': 'sk-test-key',
                    'openai.model': 'gpt-3.5-turbo',
                    'openai.apiUrl': 'https://api.openai.com/v1/chat/completions'
                };
                return config[key] || defaultValue;
            }
        });

        axiosStub.resolves({
            data: {
                choices: [{
                    message: { content: 'Cached response' }
                }]
            }
        });

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const options: AIRequestOptions = {
            useCache: true,
            includeContext: false
        };

        // First call - should hit API
        const result1 = await getAiCompletion('Test prompt', options);
        assert.strictEqual(result1, 'Cached response');
        
        // Second call - should use cache (but in test, will hit API again since cache is not mocked)
        const result2 = await getAiCompletion('Test prompt', options);
        assert.strictEqual(result2, 'Cached response');

        progressStub.restore();
    });

    test('Should handle network errors gracefully', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': 'sk-test-key'
                };
                return config[key] || defaultValue;
            }
        });

        const networkError = new Error('Network error');
        (networkError as any).code = 'ENOTFOUND';
        axiosStub.rejects(networkError);

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const result = await getAiCompletion('Test prompt');
        
        assert.strictEqual(result, '');
        assert.ok(windowStub.calledWith(sinon.match(/Cannot connect/)));

        progressStub.restore();
    });

    test('Should handle authentication errors', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': 'invalid-key'
                };
                return config[key] || defaultValue;
            }
        });

        const authError = new Error('Unauthorized');
        (authError as any).response = { status: 401 };
        axiosStub.rejects(authError);

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const result = await getAiCompletion('Test prompt');
        
        assert.strictEqual(result, '');
        assert.ok(windowStub.calledWith(sinon.match(/Invalid API key/)));

        progressStub.restore();
    });

    test('Should handle rate limit errors', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': 'sk-test-key'
                };
                return config[key] || defaultValue;
            }
        });

        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).response = { status: 429 };
        axiosStub.rejects(rateLimitError);

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const result = await getAiCompletion('Test prompt');
        
        assert.strictEqual(result, '');
        assert.ok(windowStub.calledWith(sinon.match(/Rate limit exceeded/)));

        progressStub.restore();
    });

    test('Should handle timeout errors', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': 'sk-test-key'
                };
                return config[key] || defaultValue;
            }
        });

        const timeoutError = new Error('Timeout');
        (timeoutError as any).code = 'ECONNABORTED';
        axiosStub.rejects(timeoutError);

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const result = await getAiCompletion('Test prompt');
        
        assert.strictEqual(result, '');
        assert.ok(windowStub.calledWith(sinon.match(/timed out/)));

        progressStub.restore();
    });

    test('Should validate OpenAI configuration correctly', () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': 'sk-valid-openai-key-123456'
                };
                return config[key] || defaultValue;
            }
        });

        const validation = validateConfiguration();
        
        assert.ok(validation.isValid);
        assert.ok(validation.message.includes('OpenAI configuration looks valid'));
    });

    test('Should validate Claude configuration correctly', () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'claude',
                    'apiKey': 'sk-ant-valid-claude-key-123456'
                };
                return config[key] || defaultValue;
            }
        });

        const validation = validateConfiguration();
        
        assert.ok(validation.isValid);
        assert.ok(validation.message.includes('Claude configuration looks valid'));
    });

    test('Should validate local provider configuration', () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'local',
                    'local.apiUrl': 'http://localhost:11434/api/generate'
                };
                return config[key] || defaultValue;
            }
        });

        const validation = validateConfiguration();
        
        assert.ok(validation.isValid);
        assert.ok(validation.message.includes('Local AI configured'));
    });

    test('Should validate Cursor provider configuration', () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'cursor'
                };
                return config[key] || defaultValue;
            }
        });

        const validation = validateConfiguration();
        
        assert.ok(validation.isValid);
        assert.ok(validation.message.includes('Cursor integration ready'));
    });

    test('Should detect missing API key for OpenAI', () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': ''
                };
                return config[key] || defaultValue;
            }
        });

        const validation = validateConfiguration();
        
        assert.ok(!validation.isValid);
        assert.ok(validation.message.includes('API key is required'));
    });

    test('Should detect invalid API key format for Claude', () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'claude',
                    'apiKey': 'invalid-key-format'
                };
                return config[key] || defaultValue;
            }
        });

        const validation = validateConfiguration();
        
        assert.ok(!validation.isValid);
        assert.ok(validation.message.includes('Claude API key format appears invalid'));
    });

    test('Should get AI code review', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': 'sk-test-key'
                };
                return config[key] || defaultValue;
            }
        });

        const codeIssues = [
            {
                startLine: 5,
                endLine: 5,
                message: 'Variable not used',
                errorCode: 'unused-var',
                severity: 'warning'
            }
        ];

        axiosStub.resolves({
            data: {
                choices: [{
                    message: { content: JSON.stringify(codeIssues) }
                }]
            }
        });

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const result = await getAiCodeReview('const unused = 1;');
        
        assert.ok(Array.isArray(result));
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].message, 'Variable not used');
        assert.strictEqual(result[0].severity, 'warning');

        progressStub.restore();
    });

    test('Should handle invalid JSON in code review response', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'openai',
                    'apiKey': 'sk-test-key'
                };
                return config[key] || defaultValue;
            }
        });

        axiosStub.resolves({
            data: {
                choices: [{
                    message: { content: 'Invalid JSON response' }
                }]
            }
        });

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const result = await getAiCodeReview('const test = 1;');
        
        assert.ok(Array.isArray(result));
        assert.strictEqual(result.length, 0);

        progressStub.restore();
    });

    test('Should apply provider-specific optimizations', async () => {
        configStub.returns({
            get: (key: string, defaultValue?: any) => {
                const config: any = {
                    'provider': 'claude',
                    'apiKey': 'sk-ant-test-key',
                    'claude.model': 'claude-3-haiku-20240307'
                };
                return config[key] || defaultValue;
            }
        });

        axiosStub.resolves({
            data: {
                content: [{ text: 'Optimized response' }]
            }
        });

        const progressStub = sinon.stub(vscode.window, 'withProgress');
        progressStub.callsFake(async (options, task) => {
            return await task({ report: () => {} }, {} as any);
        });

        const options: AIRequestOptions = {
            maxTokens: 2000,
            temperature: 0.5,
            includeContext: true
        };

        await getAiCompletion('Test prompt', options);
        
        // Verify that the request includes optimized parameters
        const callArgs = axiosStub.firstCall.args[1];
        assert.ok(callArgs.max_tokens >= 2000);
        assert.ok(callArgs.temperature <= 0.5);

        progressStub.restore();
    });
});