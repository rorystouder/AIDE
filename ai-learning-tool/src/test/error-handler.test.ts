import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ErrorHandler, ErrorSeverity } from '../error-handler';

suite('Error Handler Test Suite', () => {
    let errorHandler: ErrorHandler;
    let windowStub: sinon.SinonStub;
    let commandStub: sinon.SinonStub;
    let outputChannelStub: sinon.SinonStubbedInstance<vscode.OutputChannel>;

    setup(() => {
        errorHandler = ErrorHandler.getInstance();
        windowStub = sinon.stub(vscode.window, 'showErrorMessage');
        commandStub = sinon.stub(vscode.commands, 'executeCommand');
        
        // Mock output channel
        outputChannelStub = {
            appendLine: sinon.stub(),
            show: sinon.stub() as any,
            clear: sinon.stub(),
            dispose: sinon.stub(),
            name: 'AI Learning Tool',
            append: sinon.stub(),
            replace: sinon.stub(),
            hide: sinon.stub()
        };
        
        // Replace the output channel
        (errorHandler as any).outputChannel = outputChannelStub;
        
        // Clear error log
        errorHandler.clearErrorLog();
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should handle network errors with retry option', async () => {
        const networkError = new Error('Network connection failed');
        (networkError as any).code = 'ENOTFOUND';
        
        windowStub.resolves('Retry');
        
        const context = {
            operation: 'AI completion',
            provider: 'openai'
        };
        
        await errorHandler.handleError(networkError, ErrorSeverity.ERROR, context);
        
        assert.ok(windowStub.calledWith(
            sinon.match(/Network error during AI completion/),
            'Retry',
            'Cancel'
        ));
    });

    test('Should handle rate limit errors with provider switching', async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).response = { status: 429 };
        
        windowStub.resolves('Switch Provider');
        
        const context = {
            operation: 'code generation',
            provider: 'claude'
        };
        
        await errorHandler.handleError(rateLimitError, ErrorSeverity.WARNING, context);
        
        assert.ok(windowStub.calledWith(
            sinon.match(/Rate limit exceeded for claude/),
            'Switch Provider',
            'Wait'
        ));
        
        assert.ok(commandStub.calledWith('ai-learning-tool.switchProvider'));
    });

    test('Should handle authentication errors with configuration prompt', async () => {
        const authError = new Error('Invalid API key');
        (authError as any).response = { status: 401 };
        
        windowStub.resolves('Open Settings');
        
        const context = {
            operation: 'AI chat',
            provider: 'openai'
        };
        
        await errorHandler.handleError(authError, ErrorSeverity.ERROR, context);
        
        assert.ok(windowStub.calledWith(
            sinon.match(/Invalid API key for openai/),
            'Open Settings',
            'Cancel'
        ));
        
        assert.ok(commandStub.calledWith('workbench.action.openSettings', 'ai-learning-tool.apiKey'));
    });

    test('Should handle file not found errors', async () => {
        const fileError = new Error('File not found');
        (fileError as any).code = 'ENOENT';
        
        const warningStub = sinon.stub(vscode.window, 'showWarningMessage');
        
        const context = {
            operation: 'file read',
            file: '/path/to/missing/file.js'
        };
        
        await errorHandler.handleError(fileError, ErrorSeverity.WARNING, context);
        
        assert.ok(warningStub.calledWith(
            sinon.match(/File not found: \/path\/to\/missing\/file.js/)
        ));
        
        warningStub.restore();
    });

    test('Should handle cache corruption with clear cache option', async () => {
        const cacheError = new Error('Cache corruption detected');
        
        const warningStub = sinon.stub(vscode.window, 'showWarningMessage');
        warningStub.resolves('Clear Cache' as any);
        
        const context = {
            operation: 'cache read'
        };
        
        await errorHandler.handleError(cacheError, ErrorSeverity.WARNING, context);
        
        assert.ok(warningStub.calledWith(
            sinon.match(/Cache may be corrupted/),
            sinon.match('Clear Cache'),
            sinon.match('Ignore')
        ));
        
        assert.ok(commandStub.calledWith('ai-learning-tool.clearCache'));
        
        warningStub.restore();
    });

    test('Should handle timeout errors', async () => {
        const timeoutError = new Error('Request timeout');
        (timeoutError as any).code = 'ECONNABORTED';
        
        const warningStub = sinon.stub(vscode.window, 'showWarningMessage');
        
        const context = {
            operation: 'API request',
            provider: 'claude'
        };
        
        await errorHandler.handleError(timeoutError, ErrorSeverity.WARNING, context);
        
        assert.ok(warningStub.calledWith(
            sinon.match(/Request to claude timed out/)
        ));
        
        warningStub.restore();
    });

    test('Should detect network error types correctly', () => {
        const networkErrors = [
            { code: 'ENOTFOUND' },
            { code: 'ECONNREFUSED' },
            { code: 'ECONNRESET' },
            { code: 'ETIMEDOUT' },
            { message: 'network error occurred' }
        ];
        
        networkErrors.forEach(error => {
            assert.ok(
                (errorHandler as any).isNetworkError(error),
                `Should detect ${JSON.stringify(error)} as network error`
            );
        });
    });

    test('Should detect rate limit errors correctly', () => {
        const rateLimitErrors = [
            { response: { status: 429 } },
            { message: 'rate limit exceeded' }
        ];
        
        rateLimitErrors.forEach(error => {
            assert.ok(
                (errorHandler as any).isRateLimitError(error),
                `Should detect ${JSON.stringify(error)} as rate limit error`
            );
        });
    });

    test('Should detect authentication errors correctly', () => {
        const authErrors = [
            { response: { status: 401 } },
            { response: { status: 403 } },
            { message: 'unauthorized access' },
            { message: 'invalid api key' },
            { message: 'authentication failed' }
        ];
        
        authErrors.forEach(error => {
            assert.ok(
                (errorHandler as any).isAuthError(error),
                `Should detect ${JSON.stringify(error)} as auth error`
            );
        });
    });

    test('Should detect timeout errors correctly', () => {
        const timeoutErrors = [
            { code: 'ECONNABORTED' },
            { code: 'ETIMEDOUT' },
            { message: 'request timeout occurred' }
        ];
        
        timeoutErrors.forEach(error => {
            assert.ok(
                (errorHandler as any).isTimeoutError(error),
                `Should detect ${JSON.stringify(error)} as timeout error`
            );
        });
    });

    test('Should detect file not found errors correctly', () => {
        const fileErrors = [
            { code: 'ENOENT' },
            { message: 'file not found' }
        ];
        
        fileErrors.forEach(error => {
            assert.ok(
                (errorHandler as any).isFileNotFoundError(error),
                `Should detect ${JSON.stringify(error)} as file not found error`
            );
        });
    });

    test('Should detect cache errors correctly', () => {
        const cacheErrors = [
            { message: 'cache corruption' },
            { message: 'cache error occurred' }
        ];
        
        cacheErrors.forEach(error => {
            assert.ok(
                (errorHandler as any).isCacheError(error),
                `Should detect ${JSON.stringify(error)} as cache error`
            );
        });
    });

    test('Should format error messages correctly', () => {
        const error = new Error('Test error message');
        const context = {
            operation: 'test operation',
            provider: 'test-provider'
        };
        
        const message = (errorHandler as any).formatErrorMessage(error, context);
        
        assert.ok(message.includes('test operation'));
        assert.ok(message.includes('test-provider'));
        assert.ok(message.includes('Test error message'));
    });

    test('Should get suggested actions based on error type', () => {
        const networkError = { code: 'ENOTFOUND' };
        const context = { operation: 'test', provider: 'openai' };
        
        const actions = (errorHandler as any).getSuggestedActions(networkError, context);
        
        assert.ok(actions.includes('Check Connection'));
        assert.ok(actions.includes('Switch Provider'));
        assert.ok(actions.includes('View Logs'));
    });

    test('Should execute suggested actions correctly', async () => {
        const envStub = sinon.stub(vscode.env, 'openExternal');
        
        // Test each action
        await (errorHandler as any).executeAction('Check Connection');
        assert.ok(envStub.calledOnce);
        
        await (errorHandler as any).executeAction('Configure API Key');
        assert.ok(commandStub.calledWith('workbench.action.openSettings', 'ai-learning-tool.apiKey'));
        
        await (errorHandler as any).executeAction('Switch Provider');
        assert.ok(commandStub.calledWith('ai-learning-tool.switchProvider'));
        
        await (errorHandler as any).executeAction('View Logs');
        assert.ok(outputChannelStub.show.calledOnce);
        
        envStub.restore();
    });

    test('Should log errors correctly', () => {
        const error = new Error('Test error');
        const context = {
            operation: 'test operation',
            provider: 'test-provider'
        };
        
        (errorHandler as any).logError(error, ErrorSeverity.ERROR, context);
        
        assert.ok(outputChannelStub.appendLine.calledOnce);
        
        const logMessage = outputChannelStub.appendLine.firstCall.args[0];
        assert.ok(logMessage.includes('ERROR'));
        assert.ok(logMessage.includes('test operation'));
        assert.ok(logMessage.includes('Test error'));
    });

    test('Should track error statistics', () => {
        const error1 = new Error('Error 1');
        const error2 = new Error('Error 2');
        const error3 = new Error('Error 3');
        
        const context = { operation: 'test' };
        
        (errorHandler as any).logError(error1, ErrorSeverity.ERROR, context);
        (errorHandler as any).logError(error2, ErrorSeverity.WARNING, context);
        (errorHandler as any).logError(error3, ErrorSeverity.INFO, context);
        
        const stats = errorHandler.getErrorStats();
        
        assert.strictEqual(stats.total, 3);
        assert.strictEqual(stats.bySeverity[ErrorSeverity.ERROR], 1);
        assert.strictEqual(stats.bySeverity[ErrorSeverity.WARNING], 1);
        assert.strictEqual(stats.bySeverity[ErrorSeverity.INFO], 1);
        assert.strictEqual(stats.recentErrors.length, 3);
    });

    test('Should limit error log size', () => {
        const context = { operation: 'test' };
        
        // Add more errors than maxLogSize
        const maxLogSize = (errorHandler as any).maxLogSize;
        for (let i = 0; i < maxLogSize + 10; i++) {
            const error = new Error(`Error ${i}`);
            (errorHandler as any).logError(error, ErrorSeverity.INFO, context);
        }
        
        const stats = errorHandler.getErrorStats();
        assert.strictEqual(stats.total, maxLogSize);
    });

    test('Should clear error log', () => {
        const error = new Error('Test error');
        const context = { operation: 'test' };
        
        (errorHandler as any).logError(error, ErrorSeverity.ERROR, context);
        
        let stats = errorHandler.getErrorStats();
        assert.strictEqual(stats.total, 1);
        
        errorHandler.clearErrorLog();
        
        stats = errorHandler.getErrorStats();
        assert.strictEqual(stats.total, 0);
        assert.ok(outputChannelStub.clear.calledOnce);
    });

    test('Should export error log', () => {
        const error1 = new Error('Error 1');
        const error2 = new Error('Error 2');
        const context = { operation: 'test' };
        
        (errorHandler as any).logError(error1, ErrorSeverity.ERROR, context);
        (errorHandler as any).logError(error2, ErrorSeverity.WARNING, context);
        
        const exported = errorHandler.exportErrorLog();
        
        assert.ok(exported.includes('Error 1'));
        assert.ok(exported.includes('Error 2'));
        assert.ok(exported.includes('ERROR'));
        assert.ok(exported.includes('WARNING'));
    });

    test('Should show appropriate notifications based on severity', async () => {
        const error = new Error('Test error');
        const context = { operation: 'test' };
        
        const infoStub = sinon.stub(vscode.window, 'showInformationMessage');
        const warningStub = sinon.stub(vscode.window, 'showWarningMessage');
        
        // Test info notification
        await errorHandler.handleError(error, ErrorSeverity.INFO, context, true);
        assert.ok(infoStub.calledOnce);
        
        // Test warning notification
        await errorHandler.handleError(error, ErrorSeverity.WARNING, context, true);
        assert.ok(warningStub.calledOnce);
        
        // Test error notification (uses showErrorMessage which is already stubbed)
        await errorHandler.handleError(error, ErrorSeverity.ERROR, context, true);
        assert.ok(windowStub.calledOnce);
        
        infoStub.restore();
        warningStub.restore();
    });

    test('Should not show user notifications when showUser is false', async () => {
        const error = new Error('Test error');
        const context = { operation: 'test' };
        
        await errorHandler.handleError(error, ErrorSeverity.ERROR, context, false);
        
        // Should still log but not show notification
        assert.ok(outputChannelStub.appendLine.calledOnce);
        assert.ok(!windowStub.called);
    });

    test('Should handle errors without attempting recovery', async () => {
        const unknownError = new Error('Unknown error type');
        const context = { operation: 'test' };
        
        await errorHandler.handleError(unknownError, ErrorSeverity.ERROR, context);
        
        // Should show error message since no recovery was possible
        assert.ok(windowStub.calledWith(sinon.match(/Unknown error type/)));
    });

    test('Should dispose resources correctly', () => {
        errorHandler.dispose();
        
        assert.ok(outputChannelStub.dispose.calledOnce);
    });
});