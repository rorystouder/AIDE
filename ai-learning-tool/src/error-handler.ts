import * as vscode from 'vscode';

export enum ErrorSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export interface ErrorContext {
    operation: string;
    provider?: string;
    file?: string;
    details?: any;
}

export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorLog: Array<{
        timestamp: Date;
        severity: ErrorSeverity;
        message: string;
        context?: ErrorContext;
        error?: Error;
    }> = [];
    
    private readonly maxLogSize = 100;
    private outputChannel: vscode.OutputChannel;

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('AI Learning Tool');
    }

    /**
     * Handle errors with recovery strategies
     */
    async handleError(
        error: Error | any,
        severity: ErrorSeverity,
        context: ErrorContext,
        showUser: boolean = true
    ): Promise<void> {
        // Log the error
        this.logError(error, severity, context);

        // Apply recovery strategy
        const recovered = await this.attemptRecovery(error, context);
        
        if (!recovered && showUser) {
            this.showUserNotification(error, severity, context);
        }
    }

    /**
     * Attempt to recover from known error types
     */
    private async attemptRecovery(error: any, context: ErrorContext): Promise<boolean> {
        // Network errors - suggest retry
        if (this.isNetworkError(error)) {
            const retry = await vscode.window.showWarningMessage(
                `Network error during ${context.operation}. Would you like to retry?`,
                'Retry',
                'Cancel'
            );
            
            if (retry === 'Retry') {
                vscode.window.showInformationMessage('Retrying operation...');
                return true; // Caller should retry
            }
        }

        // API rate limit - suggest provider switch
        if (this.isRateLimitError(error)) {
            const switchProvider = await vscode.window.showWarningMessage(
                `Rate limit exceeded for ${context.provider}. Switch to a different provider?`,
                'Switch Provider',
                'Wait'
            );
            
            if (switchProvider === 'Switch Provider') {
                await vscode.commands.executeCommand('ai-learning-tool.switchProvider');
                return true;
            }
        }

        // Invalid API key - prompt for configuration
        if (this.isAuthError(error)) {
            const configure = await vscode.window.showErrorMessage(
                `Invalid API key for ${context.provider}. Open settings to configure?`,
                'Open Settings',
                'Cancel'
            );
            
            if (configure === 'Open Settings') {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'ai-learning-tool.apiKey');
                return true;
            }
        }

        // File not found - suggest alternatives
        if (this.isFileNotFoundError(error) && context.file) {
            const message = `File not found: ${context.file}. The file may have been moved or deleted.`;
            vscode.window.showWarningMessage(message);
            return false;
        }

        // Cache corruption - clear cache
        if (this.isCacheError(error)) {
            const clearCache = await vscode.window.showWarningMessage(
                'Cache may be corrupted. Clear cache and retry?',
                'Clear Cache',
                'Ignore'
            );
            
            if (clearCache === 'Clear Cache') {
                await vscode.commands.executeCommand('ai-learning-tool.clearCache');
                return true;
            }
        }

        // Timeout errors - increase timeout or reduce context
        if (this.isTimeoutError(error)) {
            const message = context.provider 
                ? `Request to ${context.provider} timed out. Try reducing the context size or switching to a faster provider.`
                : `Operation timed out. This may be due to a large workspace or slow network.`;
            
            vscode.window.showWarningMessage(message);
            return false;
        }

        return false;
    }

    /**
     * Show appropriate notification to user based on severity
     */
    private showUserNotification(error: any, severity: ErrorSeverity, context: ErrorContext): void {
        const message = this.formatErrorMessage(error, context);
        
        switch (severity) {
            case ErrorSeverity.INFO:
                vscode.window.showInformationMessage(message);
                break;
            case ErrorSeverity.WARNING:
                vscode.window.showWarningMessage(message);
                break;
            case ErrorSeverity.ERROR:
            case ErrorSeverity.CRITICAL:
                const actions = this.getSuggestedActions(error, context);
                if (actions.length > 0) {
                    vscode.window.showErrorMessage(message, ...actions).then(action => {
                        if (action) {
                            this.executeAction(action);
                        }
                    });
                } else {
                    vscode.window.showErrorMessage(message);
                }
                break;
        }
    }

    /**
     * Get suggested actions based on error type
     */
    private getSuggestedActions(error: any, context: ErrorContext): string[] {
        const actions: string[] = [];
        
        if (this.isNetworkError(error)) {
            actions.push('Check Connection');
        }
        
        if (this.isAuthError(error)) {
            actions.push('Configure API Key');
        }
        
        if (context.provider) {
            actions.push('Switch Provider');
        }
        
        actions.push('View Logs');
        
        return actions;
    }

    /**
     * Execute suggested action
     */
    private async executeAction(action: string): Promise<void> {
        switch (action) {
            case 'Check Connection':
                vscode.env.openExternal(vscode.Uri.parse('https://www.google.com'));
                break;
            case 'Configure API Key':
                await vscode.commands.executeCommand('workbench.action.openSettings', 'ai-learning-tool.apiKey');
                break;
            case 'Switch Provider':
                await vscode.commands.executeCommand('ai-learning-tool.switchProvider');
                break;
            case 'View Logs':
                this.outputChannel.show();
                break;
        }
    }

    /**
     * Format error message for user display
     */
    private formatErrorMessage(error: any, context: ErrorContext): string {
        let message = `Error during ${context.operation}`;
        
        if (context.provider) {
            message += ` (${context.provider})`;
        }
        
        message += ': ';
        
        if (error.message) {
            message += error.message;
        } else if (typeof error === 'string') {
            message += error;
        } else {
            message += 'An unexpected error occurred';
        }
        
        return message;
    }

    /**
     * Log error to output channel and internal log
     */
    private logError(error: any, severity: ErrorSeverity, context: ErrorContext): void {
        const entry = {
            timestamp: new Date(),
            severity,
            message: error.message || String(error),
            context,
            error: error instanceof Error ? error : undefined
        };
        
        // Add to internal log
        this.errorLog.push(entry);
        
        // Trim log if too large
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
        
        // Write to output channel
        const logMessage = this.formatLogEntry(entry);
        this.outputChannel.appendLine(logMessage);
        
        // Also log to console for debugging
        if (severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL) {
            console.error(`[AI Learning Tool] ${logMessage}`, error);
        } else {
            console.log(`[AI Learning Tool] ${logMessage}`);
        }
    }

    /**
     * Format log entry for output
     */
    private formatLogEntry(entry: any): string {
        const timestamp = entry.timestamp.toISOString();
        const severity = entry.severity.toUpperCase();
        const operation = entry.context?.operation || 'Unknown';
        
        let log = `[${timestamp}] [${severity}] ${operation}: ${entry.message}`;
        
        if (entry.context?.provider) {
            log += ` (Provider: ${entry.context.provider})`;
        }
        
        if (entry.context?.file) {
            log += ` (File: ${entry.context.file})`;
        }
        
        if (entry.error?.stack) {
            log += `\nStack trace:\n${entry.error.stack}`;
        }
        
        return log;
    }

    /**
     * Error type detection methods
     */
    private isNetworkError(error: any): boolean {
        return error.code === 'ENOTFOUND' || 
               error.code === 'ECONNREFUSED' || 
               error.code === 'ECONNRESET' ||
               error.code === 'ETIMEDOUT' ||
               (error.message && error.message.toLowerCase().includes('network'));
    }

    private isRateLimitError(error: any): boolean {
        return (error.response?.status === 429) ||
               (error.message && error.message.toLowerCase().includes('rate limit'));
    }

    private isAuthError(error: any): boolean {
        return (error.response?.status === 401) ||
               (error.response?.status === 403) ||
               (error.message && (
                   error.message.toLowerCase().includes('unauthorized') ||
                   error.message.toLowerCase().includes('invalid api key') ||
                   error.message.toLowerCase().includes('authentication')
               ));
    }

    private isTimeoutError(error: any): boolean {
        return error.code === 'ECONNABORTED' ||
               error.code === 'ETIMEDOUT' ||
               (error.message && error.message.toLowerCase().includes('timeout'));
    }

    private isFileNotFoundError(error: any): boolean {
        return error.code === 'ENOENT' ||
               (error.message && error.message.toLowerCase().includes('file not found'));
    }

    private isCacheError(error: any): boolean {
        return error.message && (
            error.message.toLowerCase().includes('cache') ||
            error.message.toLowerCase().includes('corruption')
        );
    }

    /**
     * Get error statistics
     */
    getErrorStats(): {
        total: number;
        bySeverity: Record<ErrorSeverity, number>;
        recentErrors: Array<{ timestamp: Date; message: string; severity: ErrorSeverity }>;
    } {
        const stats = {
            total: this.errorLog.length,
            bySeverity: {
                [ErrorSeverity.INFO]: 0,
                [ErrorSeverity.WARNING]: 0,
                [ErrorSeverity.ERROR]: 0,
                [ErrorSeverity.CRITICAL]: 0
            },
            recentErrors: this.errorLog.slice(-10).map(e => ({
                timestamp: e.timestamp,
                message: e.message,
                severity: e.severity
            }))
        };
        
        for (const entry of this.errorLog) {
            stats.bySeverity[entry.severity]++;
        }
        
        return stats;
    }

    /**
     * Clear error log
     */
    clearErrorLog(): void {
        this.errorLog = [];
        this.outputChannel.clear();
    }

    /**
     * Export error log for debugging
     */
    exportErrorLog(): string {
        return this.errorLog.map(entry => this.formatLogEntry(entry)).join('\n\n');
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}