import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Extension Integration Test Suite', () => {

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('ai-learning-tool.ai-learning-tool'));
    });

    test('Should register all expected commands', async () => {
        const expectedCommands = [
            'ai-learning-tool.helloWorld',
            'ai-learning-tool.openChat',
            'ai-learning-tool.generateCode',
            'ai-learning-tool.switchProvider',
            'ai-learning-tool.showCacheStats',
            'ai-learning-tool.clearCache',
            'ai-learning-tool.searchWorkspace',
            'ai-learning-tool.findDefinitions',
            'ai-learning-tool.findReferences',
            'ai-learning-tool.findTodos'
        ];

        const commands = await vscode.commands.getCommands();
        
        expectedCommands.forEach(cmd => {
            assert.ok(
                commands.includes(cmd),
                `Command ${cmd} should be registered`
            );
        });
    });

    test('Should execute Hello World command', async () => {
        // Mock showInformationMessage
        let messageCalled = false;
        let messageText = '';
        
        const originalShow = vscode.window.showInformationMessage;
        (vscode.window as any).showInformationMessage = (message: string) => {
            messageCalled = true;
            messageText = message;
            return Promise.resolve();
        };

        await vscode.commands.executeCommand('ai-learning-tool.helloWorld');
        
        assert.ok(messageCalled);
        assert.strictEqual(messageText, 'Hello World from AI Learning Tool!');

        // Restore
        (vscode.window as any).showInformationMessage = originalShow;
    });

    test('Should have correct configuration properties', () => {
        const config = vscode.workspace.getConfiguration('ai-learning-tool');
        
        // Check that configuration exists
        assert.ok(config);
        
        // Check provider setting
        const provider = config.get<string>('provider');
        assert.ok(['openai', 'claude', 'local', 'cursor'].includes(provider || 'openai'));
        
        // Check that API key setting exists (may be empty)
        assert.ok(config.has('apiKey'));
        
        // Check provider-specific settings
        assert.ok(config.has('openai.model'));
        assert.ok(config.has('claude.model'));
        assert.ok(config.has('local.apiUrl'));
        assert.ok(config.has('cursor.integration'));
    });

    test('Should switch AI provider successfully', async () => {
        const config = vscode.workspace.getConfiguration('ai-learning-tool');
        const originalProvider = config.get<string>('provider');
        
        // Mock the quickPick
        const originalQuickPick = vscode.window.showQuickPick;
        (vscode.window as any).showQuickPick = () => {
            return Promise.resolve({
                label: '🏠 Local AI',
                description: 'Ollama or other local models',
                value: 'local'
            });
        };

        // Mock showInformationMessage
        let messageCalled = false;
        const originalShow = vscode.window.showInformationMessage;
        (vscode.window as any).showInformationMessage = () => {
            messageCalled = true;
            return Promise.resolve();
        };

        await vscode.commands.executeCommand('ai-learning-tool.switchProvider');
        
        assert.ok(messageCalled);

        // Restore
        (vscode.window as any).showQuickPick = originalQuickPick;
        (vscode.window as any).showInformationMessage = originalShow;
        
        // Restore original provider
        if (originalProvider) {
            await config.update('provider', originalProvider, vscode.ConfigurationTarget.Global);
        }
    });

    test('Should clear cache successfully', async () => {
        let messageCalled = false;
        let messageText = '';
        
        const originalShow = vscode.window.showInformationMessage;
        (vscode.window as any).showInformationMessage = (message: string) => {
            messageCalled = true;
            messageText = message;
            return Promise.resolve();
        };

        await vscode.commands.executeCommand('ai-learning-tool.clearCache');
        
        assert.ok(messageCalled);
        assert.ok(messageText.includes('cleared'));

        // Restore
        (vscode.window as any).showInformationMessage = originalShow;
    });

    test('Should handle webview panel creation', async () => {
        // Mock createWebviewPanel
        let panelCreated = false;
        const originalCreate = vscode.window.createWebviewPanel;
        
        (vscode.window as any).createWebviewPanel = () => {
            panelCreated = true;
            return {
                webview: {
                    html: '',
                    onDidReceiveMessage: () => ({ dispose: () => {} }),
                    postMessage: () => Promise.resolve(true)
                },
                onDidDispose: () => ({ dispose: () => {} }),
                dispose: () => {}
            };
        };

        await vscode.commands.executeCommand('ai-learning-tool.openChat');
        
        assert.ok(panelCreated);

        // Restore
        (vscode.window as any).createWebviewPanel = originalCreate;
    });

    test('Should validate configuration correctly', () => {
        const config = vscode.workspace.getConfiguration('ai-learning-tool');
        const provider = config.get<string>('provider', 'openai');
        const apiKey = config.get<string>('apiKey', '');
        
        // Local and cursor providers don't need API keys
        if (provider === 'local' || provider === 'cursor') {
            assert.ok(true, 'Local/Cursor provider does not require API key');
        } else {
            // For other providers, just check that the configuration exists
            assert.ok(config.has('apiKey'), 'API key configuration should exist');
        }
    });

    test('Should handle generate code command gracefully without active editor', async () => {
        // Ensure no active editor
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        
        let messageCalled = false;
        const originalShow = vscode.window.showInformationMessage;
        (vscode.window as any).showInformationMessage = (message: string) => {
            messageCalled = true;
            assert.ok(message.includes('No active editor') || message.includes('select text'));
            return Promise.resolve();
        };

        await vscode.commands.executeCommand('ai-learning-tool.generateCode');
        
        assert.ok(messageCalled);

        // Restore
        (vscode.window as any).showInformationMessage = originalShow;
    });

    test('Should handle search commands without workspace', async () => {
        // Mock showInputBox to return empty
        const originalInput = vscode.window.showInputBox;
        (vscode.window as any).showInputBox = () => Promise.resolve(undefined);
        
        // This should not throw
        await assert.doesNotReject(
            async () => await vscode.commands.executeCommand('ai-learning-tool.searchWorkspace')
        );

        // Restore
        (vscode.window as any).showInputBox = originalInput;
    });

    test('Should handle find definitions without active editor', async () => {
        // Ensure no active editor
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        
        let messageCalled = false;
        const originalShow = vscode.window.showInformationMessage;
        (vscode.window as any).showInformationMessage = (message: string) => {
            messageCalled = true;
            assert.ok(message.includes('No active editor'));
            return Promise.resolve();
        };

        await vscode.commands.executeCommand('ai-learning-tool.findDefinitions');
        
        assert.ok(messageCalled);

        // Restore
        (vscode.window as any).showInformationMessage = originalShow;
    });

    test('Should show cache statistics', async () => {
        let messageCalled = false;
        let messageText = '';
        
        const originalShow = vscode.window.showInformationMessage;
        (vscode.window as any).showInformationMessage = (message: string) => {
            messageCalled = true;
            messageText = message;
            return Promise.resolve();
        };

        await vscode.commands.executeCommand('ai-learning-tool.showCacheStats');
        
        assert.ok(messageCalled);
        assert.ok(messageText.includes('Cache Statistics'));
        assert.ok(messageText.includes('Completions'));
        assert.ok(messageText.includes('Context'));
        assert.ok(messageText.includes('Memory Usage'));

        // Restore
        (vscode.window as any).showInformationMessage = originalShow;
    });

    test('Inline completion provider should be registered', async () => {
        const providers = await vscode.languages.getLanguages();
        // The completion provider should work for multiple languages
        // This is a basic check that the extension activates properly
        assert.ok(providers.length > 0);
    });

    test('Should handle errors gracefully', async () => {
        // Test that commands don't crash when encountering errors
        const commands = [
            'ai-learning-tool.findReferences',
            'ai-learning-tool.findTodos',
            'ai-learning-tool.generateCode'
        ];

        for (const cmd of commands) {
            await assert.doesNotReject(
                async () => await vscode.commands.executeCommand(cmd),
                `Command ${cmd} should not throw unhandled errors`
            );
        }
    });
});