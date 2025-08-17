import axios from 'axios';
import * as vscode from 'vscode';

export type AIProvider = 'openai' | 'claude' | 'local' | 'cursor';

export interface AIResponse {
    text: string;
    error?: string;
}

interface ProviderConfig {
    apiKey?: string;
    apiUrl: string;
    model: string;
    headers: Record<string, string>;
    formatRequest: (prompt: string) => any;
    parseResponse: (response: any) => string;
}

export async function getAiCompletion(prompt: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('ai-learning-tool');
    const provider = config.get<AIProvider>('provider', 'openai');
    
    // Check if running in Cursor and provider is set to cursor
    if (provider === 'cursor') {
        return await handleCursorIntegration(prompt);
    }

    const providerConfig = getProviderConfig(provider, config);
    
    if (!providerConfig) {
        vscode.window.showErrorMessage(`Invalid provider configuration for: ${provider}`);
        return '';
    }

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `${provider.toUpperCase()} is thinking...`,
        cancellable: false
    }, async (progress) => {
        progress.report({ increment: 0 });

        try {
            progress.report({ increment: 30 });
            
            const response = await axios.post(
                providerConfig.apiUrl,
                providerConfig.formatRequest(prompt),
                {
                    headers: providerConfig.headers,
                    timeout: 30000
                }
            );

            progress.report({ increment: 80 });
            const result = providerConfig.parseResponse(response.data);
            progress.report({ increment: 100 });
            
            return result;

        } catch (error: any) {
            console.error(`${provider} AI Service Error:`, error);
            
            let errorMessage = `Failed to get completion from ${provider}.`;
            
            if (error.response) {
                if (error.response.status === 401) {
                    errorMessage = `Invalid API key for ${provider}. Please check your configuration.`;
                } else if (error.response.status === 429) {
                    errorMessage = `Rate limit exceeded for ${provider}. Please try again later.`;
                } else if (error.response.status === 500) {
                    errorMessage = `${provider} service is temporarily unavailable.`;
                } else {
                    errorMessage = `${provider} API Error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`;
                }
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timed out. Please try again.';
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                errorMessage = `Cannot connect to ${provider} service. Please check your internet connection.`;
            }

            vscode.window.showErrorMessage(errorMessage);
            return '';
        }
    });
}

function getProviderConfig(provider: AIProvider, config: vscode.WorkspaceConfiguration): ProviderConfig | null {
    const apiKey = config.get<string>('apiKey', '');
    
    switch (provider) {
        case 'openai':
            return {
                apiKey,
                apiUrl: config.get<string>('openai.apiUrl', 'https://api.openai.com/v1/chat/completions'),
                model: config.get<string>('openai.model', 'gpt-3.5-turbo'),
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                formatRequest: (prompt: string) => ({
                    model: config.get<string>('openai.model', 'gpt-3.5-turbo'),
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1000,
                    temperature: 0.7
                }),
                parseResponse: (data: any) => {
                    return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
                }
            };

        case 'claude':
            return {
                apiKey,
                apiUrl: config.get<string>('claude.apiUrl', 'https://api.anthropic.com/v1/messages'),
                model: config.get<string>('claude.model', 'claude-3-haiku-20240307'),
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                formatRequest: (prompt: string) => ({
                    model: config.get<string>('claude.model', 'claude-3-haiku-20240307'),
                    max_tokens: 1000,
                    messages: [{ role: 'user', content: prompt }]
                }),
                parseResponse: (data: any) => {
                    return data.content?.[0]?.text || '';
                }
            };

        case 'local':
            return {
                apiUrl: config.get<string>('local.apiUrl', 'http://localhost:11434/api/generate'),
                model: config.get<string>('local.model', 'codellama:7b'),
                headers: {
                    'Content-Type': 'application/json'
                },
                formatRequest: (prompt: string) => ({
                    model: config.get<string>('local.model', 'codellama:7b'),
                    prompt: prompt,
                    stream: false
                }),
                parseResponse: (data: any) => {
                    return data.response || data.text || '';
                }
            };

        default:
            return null;
    }
}

async function handleCursorIntegration(prompt: string): Promise<string> {
    // For Cursor integration, we'll provide helpful guidance
    // Since we can't directly access Cursor's AI, we suggest the user use built-in features
    
    const config = vscode.workspace.getConfiguration('ai-learning-tool');
    const cursorIntegration = config.get<boolean>('cursor.integration', true);
    
    if (!cursorIntegration) {
        vscode.window.showInformationMessage('Cursor integration is disabled. Please select a different AI provider.');
        return '';
    }

    // Provide Cursor-specific guidance
    const guidance = `
🎯 Cursor AI Integration Suggestion:

For the prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"

💡 Try these Cursor features instead:
• Cmd/Ctrl + K: Open Cursor's AI chat
• Cmd/Ctrl + L: AI code generation
• Select code + Cmd/Ctrl + K: Context-aware AI help

This extension works best with OpenAI, Claude API, or local models.
To use those providers, change the AI provider in settings.
    `;

    // Show a nice notification with options
    const choice = await vscode.window.showInformationMessage(
        'Cursor provider selected. Use Cursor\'s built-in AI or switch providers?',
        'Open Cursor AI',
        'Switch Provider',
        'Configure Extension'
    );

    if (choice === 'Open Cursor AI') {
        // Try to trigger Cursor's AI chat
        vscode.commands.executeCommand('workbench.action.quickOpen').then(() => {
            vscode.commands.executeCommand('workbench.action.quickOpenNavigateNext');
        });
    } else if (choice === 'Switch Provider') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'ai-learning-tool.provider');
    } else if (choice === 'Configure Extension') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'ai-learning-tool');
    }

    return guidance;
}

export async function getAiCodeReview(code: string): Promise<CodeIssue[]> {
    const prompt = `You are an expert code reviewer. Analyze the following code and identify any issues related to performance, security, or best practices. 

For each issue, provide a concise message, the starting and ending line numbers, and a unique error code.

Respond ONLY with a JSON array of objects in the format:
[{ "startLine": number, "endLine": number, "message": string, "errorCode": string, "severity": "error"|"warning"|"info" }]

Code to review:
${code}`;

    const response = await getAiCompletion(prompt);
    
    try {
        const issues = JSON.parse(response);
        return Array.isArray(issues) ? issues : [];
    } catch (error) {
        console.error('Failed to parse AI code review response:', error);
        return [];
    }
}

export interface CodeIssue {
    startLine: number;
    endLine: number;
    message: string;
    errorCode: string;
    severity: 'error' | 'warning' | 'info';
}

// Helper function to validate API configuration
export function validateConfiguration(): { isValid: boolean; message: string } {
    const config = vscode.workspace.getConfiguration('ai-learning-tool');
    const provider = config.get<AIProvider>('provider', 'openai');
    const apiKey = config.get<string>('apiKey', '');
    
    // Cursor and local providers don't need API keys
    if (provider === 'cursor') {
        return {
            isValid: true,
            message: 'Cursor integration ready. Use Cursor\'s built-in AI features.'
        };
    }
    
    if (provider === 'local') {
        const localUrl = config.get<string>('local.apiUrl', '');
        return {
            isValid: true,
            message: `Local AI configured: ${localUrl}`
        };
    }
    
    // OpenAI and Claude require API keys
    if (!apiKey || apiKey.trim() === '') {
        return {
            isValid: false,
            message: `${provider.toUpperCase()} API key is required. Please configure it in settings.`
        };
    }
    
    // Validate API key formats
    switch (provider) {
        case 'openai':
            if (apiKey.startsWith('sk-') && apiKey.length > 20) {
                return { isValid: true, message: 'OpenAI configuration looks valid.' };
            }
            return {
                isValid: false,
                message: 'OpenAI API key format appears invalid. Should start with "sk-".'
            };
            
        case 'claude':
            if (apiKey.startsWith('sk-ant-') && apiKey.length > 20) {
                return { isValid: true, message: 'Claude configuration looks valid.' };
            }
            return {
                isValid: false,
                message: 'Claude API key format appears invalid. Should start with "sk-ant-".'
            };
            
        default:
            return {
                isValid: false,
                message: `Unknown provider: ${provider}`
            };
    }
}