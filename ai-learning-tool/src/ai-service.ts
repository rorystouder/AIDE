import axios from 'axios';
import * as vscode from 'vscode';

export interface AIResponse {
    text: string;
    error?: string;
}

export async function getAiCompletion(prompt: string): Promise<string> {
    // Get configuration from VS Code settings
    const config = vscode.workspace.getConfiguration('ai-learning-tool');
    const apiKey = config.get<string>('apiKey');
    const apiUrl = config.get<string>('apiUrl', 'https://api.openai.com/v1/completions');
    const model = config.get<string>('model', 'gpt-3.5-turbo-instruct');

    if (!apiKey) {
        vscode.window.showErrorMessage(
            'AI API key not set. Please go to Settings and search for "AI Learning Tool API Key".'
        );
        return '';
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AI is thinking...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            
            // Simulate progress
            setTimeout(() => progress.report({ increment: 50 }), 500);
            
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    progress.report({ increment: 100 });
                    resolve();
                }, 1000);
            });
        });

        const response = await axios.post(apiUrl, {
            model: model,
            prompt: prompt,
            max_tokens: 500,
            temperature: 0.7,
            stop: null
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });

        // Handle different API response formats
        if (response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].text || response.data.choices[0].message?.content || '';
        } else if (response.data.content) {
            return response.data.content;
        } else {
            throw new Error('Unexpected API response format');
        }

    } catch (error: any) {
        console.error('AI Service Error:', error);
        
        let errorMessage = 'Failed to get completion from AI service.';
        
        if (error.response) {
            // API returned error response
            if (error.response.status === 401) {
                errorMessage = 'Invalid API key. Please check your configuration.';
            } else if (error.response.status === 429) {
                errorMessage = 'Rate limit exceeded. Please try again later.';
            } else if (error.response.status === 500) {
                errorMessage = 'AI service is temporarily unavailable.';
            } else {
                errorMessage = `API Error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`;
            }
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timed out. Please try again.';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to AI service. Please check your internet connection.';
        }

        vscode.window.showErrorMessage(errorMessage);
        return '';
    }
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
    const apiKey = config.get<string>('apiKey');
    
    if (!apiKey || apiKey.trim() === '') {
        return {
            isValid: false,
            message: 'API key is required. Please configure it in VS Code settings.'
        };
    }
    
    // Basic validation for OpenAI API key format
    if (apiKey.startsWith('sk-') && apiKey.length > 20) {
        return { isValid: true, message: 'Configuration looks valid.' };
    }
    
    return {
        isValid: false,
        message: 'API key format appears invalid. Please verify your key.'
    };
}