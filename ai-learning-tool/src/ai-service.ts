import axios from 'axios';
import * as vscode from 'vscode';
import { CacheService } from './cache-service';
import { ContextService, WorkspaceContext } from './context-service';

export type AIProvider = 'openai' | 'claude' | 'local' | 'cursor';

export interface AIResponse {
    text: string;
    error?: string;
}

export interface AIRequestOptions {
    useCache?: boolean;
    includeContext?: boolean;
    maxTokens?: number;
    temperature?: number;
    contextWindow?: number;
}

interface ProviderConfig {
    apiKey?: string;
    apiUrl: string;
    model: string;
    headers: Record<string, string>;
    formatRequest: (prompt: string) => any;
    parseResponse: (response: any) => string;
}

export async function getAiCompletion(prompt: string, options: AIRequestOptions = {}): Promise<string> {
    const config = vscode.workspace.getConfiguration('ai-learning-tool');
    const provider = config.get<AIProvider>('provider', 'openai');
    const cacheService = CacheService.getInstance();
    const contextService = ContextService.getInstance();
    
    // Check cache first if enabled
    if (options.useCache !== false) {
        const cached = cacheService.getCachedProviderResponse(provider, prompt);
        if (cached) {
            return cached;
        }
    }
    
    // Check if running in Cursor and provider is set to cursor
    if (provider === 'cursor') {
        return await handleCursorIntegration(prompt);
    }

    const providerConfig = getProviderConfig(provider, config);
    
    if (!providerConfig) {
        vscode.window.showErrorMessage(`Invalid provider configuration for: ${provider}`);
        return '';
    }

    // Enhance prompt with context if enabled
    let enhancedPrompt = prompt;
    if (options.includeContext !== false) {
        try {
            const workspaceContext = await contextService.buildWorkspaceContext();
            enhancedPrompt = await enhancePromptWithContext(prompt, workspaceContext, provider, options);
        } catch (error) {
            console.warn('Failed to add context to prompt:', error);
            // Continue with original prompt
        }
    }

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `${provider.toUpperCase()} is thinking...`,
        cancellable: false
    }, async (progress) => {
        progress.report({ increment: 0 });

        try {
            progress.report({ increment: 30 });
            
            // Apply provider-specific optimizations
            const requestData = await optimizeRequestForProvider(
                enhancedPrompt, 
                provider, 
                providerConfig, 
                options
            );
            
            const response = await axios.post(
                providerConfig.apiUrl,
                requestData,
                {
                    headers: providerConfig.headers,
                    timeout: options.contextWindow ? 45000 : 30000 // Longer timeout for context-heavy requests
                }
            );

            progress.report({ increment: 80 });
            const result = providerConfig.parseResponse(response.data);
            progress.report({ increment: 100 });
            
            // Cache the result
            if (options.useCache !== false && result) {
                cacheService.cacheProviderResponse(provider, prompt, result);
            }
            
            return result;

        } catch (error: any) {
            console.error(`${provider} AI Service Error:`, error);
            
            let errorMessage = await generateContextualErrorMessage(error, provider, options);

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

/**
 * Enhance prompt with workspace context and provider-specific optimizations
 */
async function enhancePromptWithContext(
    originalPrompt: string, 
    context: WorkspaceContext, 
    provider: AIProvider, 
    options: AIRequestOptions
): Promise<string> {
    const contextService = ContextService.getInstance();
    
    // Format context based on provider capabilities
    const contextInfo = contextService.formatContextForPrompt(context, false);
    
    // Provider-specific prompt templates
    const templates = {
        claude: {
            system: "You are an expert software engineer specialized in code analysis and generation.",
            structure: `${contextInfo}

User Request: ${originalPrompt}

Instructions:
- Provide concise, high-quality code solutions
- Follow the project's existing patterns and conventions
- Consider the workspace context when making suggestions
- Keep responses focused and actionable`
        },
        openai: {
            system: "You are a skilled programmer helping with code development.",
            structure: `Context:
${contextInfo}

Task: ${originalPrompt}

Please provide a clear, well-structured response that considers the project context.`
        },
        local: {
            system: "You are a coding assistant.",
            structure: `Project: ${context.workspaceName}
Language: ${context.currentFile?.language || 'unknown'}

${originalPrompt}

Response:`
        }
    };
    
    const template = templates[provider as keyof typeof templates] || templates.openai;
    return template.structure;
}

/**
 * Optimize request parameters based on provider and context
 */
async function optimizeRequestForProvider(
    prompt: string,
    provider: AIProvider,
    providerConfig: ProviderConfig,
    options: AIRequestOptions
): Promise<any> {
    const baseRequest = providerConfig.formatRequest(prompt);
    
    // Apply provider-specific optimizations
    switch (provider) {
        case 'claude':
            return {
                ...baseRequest,
                max_tokens: options.maxTokens || (options.includeContext ? 2000 : 1000),
                temperature: options.temperature || 0.3 // Lower temperature for code
            };
            
        case 'openai':
            return {
                ...baseRequest,
                max_tokens: options.maxTokens || (options.includeContext ? 1500 : 1000),
                temperature: options.temperature || 0.4,
                top_p: 0.9,
                frequency_penalty: 0.1 // Reduce repetition
            };
            
        case 'local':
            return {
                ...baseRequest,
                options: {
                    temperature: options.temperature || 0.3,
                    top_p: 0.9,
                    repeat_penalty: 1.1
                }
            };
            
        default:
            return baseRequest;
    }
}

/**
 * Generate contextual error messages based on the error and provider
 */
async function generateContextualErrorMessage(
    error: any, 
    provider: AIProvider, 
    options: AIRequestOptions
): Promise<string> {
    let errorMessage = `Failed to get completion from ${provider}.`;
    
    if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;
        
        switch (status) {
            case 401:
                errorMessage = `Invalid API key for ${provider}. Please check your configuration.`;
                break;
            case 429:
                const providerSuggestions = {
                    claude: "Consider using Claude Haiku model for lower costs",
                    openai: "Consider upgrading your OpenAI plan or try local AI",
                    local: "Local AI shouldn't have rate limits - check your setup"
                };
                const suggestion = providerSuggestions[provider as keyof typeof providerSuggestions] || "";
                errorMessage = `Rate limit exceeded for ${provider}. ${suggestion}. Please try again later.`;
                break;
            case 500:
                errorMessage = `${provider} service is temporarily unavailable. Try switching to another provider.`;
                break;
            case 413:
                errorMessage = `Request too large for ${provider}. Try reducing context or prompt length.`;
                break;
            default:
                const errorDetail = responseData?.error?.message || responseData?.message || 'Unknown error';
                errorMessage = `${provider} API Error (${status}): ${errorDetail}`;
        }
    } else if (error.code === 'ECONNABORTED') {
        errorMessage = `Request timed out. ${options.includeContext ? 'Try reducing context size or ' : ''}please try again.`;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        const networkHelp = {
            local: "Make sure Ollama is running (ollama serve)",
            claude: "Check your internet connection",
            openai: "Check your internet connection"
        };
        const help = networkHelp[provider as keyof typeof networkHelp] || "Check your connection";
        errorMessage = `Cannot connect to ${provider} service. ${help}.`;
    }
    
    return errorMessage;
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