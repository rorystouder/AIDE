import * as vscode from 'vscode';
import { getAiCompletion, validateConfiguration } from './ai-service';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    
    console.log('Congratulations, your extension "ai-learning-tool" is now active!');

    // Register Hello World command
    let helloWorldCommand = vscode.commands.registerCommand('ai-learning-tool.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from AI Learning Tool!');
    });

    // Register Open Chat command
    let openChatCommand = vscode.commands.registerCommand('ai-learning-tool.openChat', () => {
        createWebviewPanel(context);
    });

    // Register Generate Code command
    let generateCodeCommand = vscode.commands.registerCommand('ai-learning-tool.generateCode', async () => {
        await generateCodeFromSelection();
    });

    // Register Switch Provider command
    let switchProviderCommand = vscode.commands.registerCommand('ai-learning-tool.switchProvider', async () => {
        await switchAIProvider();
    });

    // Register all commands
    context.subscriptions.push(helloWorldCommand, openChatCommand, generateCodeCommand, switchProviderCommand);
}

function createWebviewPanel(context: vscode.ExtensionContext) {
    // Create and show webview panel
    const panel = vscode.window.createWebviewPanel(
        'aiChat',                    // Internal ID
        'AI Chat',                   // Title
        vscode.ViewColumn.One,       // Editor column
        {
            enableScripts: true,     // Allow JavaScript
            retainContextWhenHidden: true
        }
    );

    // Set the webview's HTML content
    panel.webview.html = getWebviewContent();

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        async message => {
            switch (message.command) {
                case 'submitPrompt':
                    if (message.text && message.text.trim()) {
                        const completion = await getAiCompletion(message.text);
                        panel.webview.postMessage({ 
                            command: 'showCompletion', 
                            text: completion,
                            originalPrompt: message.text
                        });
                    }
                    break;
                case 'checkConfig':
                    const validation = validateConfiguration();
                    const config = vscode.workspace.getConfiguration('ai-learning-tool');
                    const provider = config.get<string>('provider', 'openai');
                    
                    panel.webview.postMessage({
                        command: 'configStatus',
                        isValid: validation.isValid,
                        message: validation.message,
                        provider: provider
                    });
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'ai-learning-tool');
                    break;
            }
        },
        undefined,
        context.subscriptions
    );
}

async function generateCodeFromSelection() {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
        vscode.window.showInformationMessage('No active editor found. Please open a file first.');
        return;
    }

    const selectedText = editor.document.getText(editor.selection);
    
    if (!selectedText || selectedText.trim() === '') {
        vscode.window.showInformationMessage('Please select text to use as a prompt for code generation.');
        return;
    }

    // Enhanced prompt with context
    const languageId = editor.document.languageId;
    const fileName = editor.document.fileName;
    const contextPrompt = `
Language: ${languageId}
File: ${fileName}
Context: Generate code based on the following description/comment.

Request: ${selectedText}

Please provide clean, well-commented code that follows best practices for ${languageId}.`;

    const completion = await getAiCompletion(contextPrompt);
    
    if (completion && completion.trim()) {
        // Insert the completion at the end of the selection
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.end, '\n' + completion);
        });
        
        vscode.window.showInformationMessage('Code generated successfully!');
    }
}

async function switchAIProvider() {
    const providers = [
        { label: '🧠 Claude API', description: 'Anthropic\'s Claude (requires API key)', value: 'claude' },
        { label: '🤖 OpenAI', description: 'GPT models (requires API key)', value: 'openai' },
        { label: '🏠 Local AI', description: 'Ollama or other local models', value: 'local' },
        { label: '🎯 Cursor Integration', description: 'Use Cursor\'s built-in AI features', value: 'cursor' }
    ];

    const selection = await vscode.window.showQuickPick(providers, {
        placeHolder: 'Choose your AI provider',
        ignoreFocusOut: true
    });

    if (selection) {
        const config = vscode.workspace.getConfiguration('ai-learning-tool');
        await config.update('provider', selection.value, vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage(
            `AI provider switched to ${selection.label}. ${selection.value === 'cursor' ? '' : selection.value === 'local' ? 'Make sure your local AI service is running.' : 'Please configure your API key in settings.'}`
        );

        // If they selected a provider that needs configuration, open settings
        if ((selection.value === 'openai' || selection.value === 'claude') && !config.get<string>('apiKey')) {
            const openSettings = await vscode.window.showInformationMessage(
                'This provider requires an API key. Open settings to configure?',
                'Open Settings',
                'Later'
            );
            
            if (openSettings === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'ai-learning-tool.apiKey');
            }
        }
    }
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Chat</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                margin: 0;
            }
            
            .container {
                max-width: 800px;
                margin: 0 auto;
            }
            
            .header {
                border-bottom: 1px solid var(--vscode-widget-border);
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            
            .status-indicator, .provider-indicator {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                margin-left: 10px;
            }
            
            .provider-indicator {
                background-color: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                font-weight: bold;
            }
            
            .status-valid {
                background-color: var(--vscode-editorInfo-background);
                color: var(--vscode-editorInfo-foreground);
            }
            
            .status-invalid {
                background-color: var(--vscode-editorError-background);
                color: var(--vscode-editorError-foreground);
            }
            
            .chat-container {
                display: flex;
                flex-direction: column;
                height: 60vh;
                border: 1px solid var(--vscode-widget-border);
                border-radius: 6px;
            }
            
            .messages {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
                background-color: var(--vscode-editor-background);
            }
            
            .message {
                margin-bottom: 15px;
                padding: 10px;
                border-radius: 6px;
                max-width: 80%;
            }
            
            .user-message {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                margin-left: auto;
                text-align: right;
            }
            
            .ai-message {
                background-color: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
            }
            
            .input-container {
                display: flex;
                padding: 15px;
                border-top: 1px solid var(--vscode-widget-border);
                background-color: var(--vscode-input-background);
            }
            
            .prompt-input {
                flex: 1;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                padding: 10px;
                margin-right: 10px;
                min-height: 60px;
                resize: vertical;
                font-family: inherit;
            }
            
            .submit-button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                padding: 10px 20px;
                cursor: pointer;
                font-family: inherit;
            }
            
            .submit-button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            
            .submit-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .config-warning {
                background-color: var(--vscode-editorWarning-background);
                color: var(--vscode-editorWarning-foreground);
                border: 1px solid var(--vscode-editorWarning-border);
                border-radius: 4px;
                padding: 15px;
                margin-bottom: 20px;
            }
            
            .settings-link {
                color: var(--vscode-textLink-foreground);
                cursor: pointer;
                text-decoration: underline;
            }
            
            .settings-link:hover {
                color: var(--vscode-textLink-activeForeground);
            }
            
            pre {
                background-color: var(--vscode-textBlockQuote-background);
                border: 1px solid var(--vscode-textBlockQuote-border);
                border-radius: 4px;
                padding: 10px;
                overflow-x: auto;
                white-space: pre-wrap;
                font-family: var(--vscode-editor-font-family);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 AI Learning Assistant for Cursor</h1>
                <div style="margin-top: 8px;">
                    <span>Provider:</span>
                    <span id="provider-indicator" class="provider-indicator">Loading...</span>
                    <span style="margin-left: 15px;">Status:</span>
                    <span id="status-indicator" class="status-indicator">Checking...</span>
                </div>
            </div>
            
            <div id="config-warning" class="config-warning" style="display: none;">
                <strong>Configuration Required:</strong>
                <span id="config-message"></span>
                <br><br>
                <span class="settings-link" onclick="openSettings()">Open Extension Settings</span>
            </div>
            
            <div class="chat-container">
                <div id="messages" class="messages">
                    <div class="message ai-message">
                        <strong>AI Learning Assistant:</strong> Welcome to your AI Learning companion for Cursor! 🎯
                        <br><br>
                        I support multiple AI providers:
                        <br>• <strong>Claude API</strong> - Anthropic's powerful AI (requires API key)
                        <br>• <strong>OpenAI</strong> - GPT models (requires API key) 
                        <br>• <strong>Local AI</strong> - Ollama and other local models
                        <br>• <strong>Cursor</strong> - Integration guidance for Cursor's built-in AI
                        
                        <br><br><strong>💡 Pro Tips:</strong>
                        <br>• Select text in your editor → "Generate Code" for context-aware help
                        <br>• Use Cursor's Cmd/Ctrl+K for built-in AI chat
                        <br>• Configure your preferred AI provider in settings
                        
                        <br><br>Ask me anything about coding, request examples, or describe what you'd like to build!
                    </div>
                </div>
                
                <div class="input-container">
                    <textarea 
                        id="prompt-input" 
                        class="prompt-input" 
                        placeholder="Ask me anything about coding, request examples, or describe what you want to build..."
                        rows="3"
                    ></textarea>
                    <button id="submit-button" class="submit-button" onclick="submitPrompt()">Send</button>
                </div>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            let isProcessing = false;

            // Check configuration on load
            window.addEventListener('load', () => {
                vscode.postMessage({ command: 'checkConfig' });
            });

            function submitPrompt() {
                const input = document.getElementById('prompt-input');
                const text = input.value.trim();
                
                if (!text || isProcessing) return;
                
                // Add user message to chat
                addMessage(text, 'user');
                
                // Clear input and disable button
                input.value = '';
                isProcessing = true;
                updateSubmitButton();
                
                // Send to extension
                vscode.postMessage({ command: 'submitPrompt', text: text });
            }

            function addMessage(text, sender) {
                const messagesDiv = document.getElementById('messages');
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${sender}-message\`;
                
                if (sender === 'user') {
                    messageDiv.innerHTML = \`<strong>You:</strong> \${text}\`;
                } else {
                    messageDiv.innerHTML = \`<strong>AI Assistant:</strong> <pre>\${text}</pre>\`;
                }
                
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }

            function updateSubmitButton() {
                const button = document.getElementById('submit-button');
                button.disabled = isProcessing;
                button.textContent = isProcessing ? 'Thinking...' : 'Send';
            }

            function openSettings() {
                vscode.postMessage({ command: 'openSettings' });
            }

            // Handle Enter key in textarea
            document.getElementById('prompt-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitPrompt();
                }
            });

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.command) {
                    case 'showCompletion':
                        addMessage(message.text, 'ai');
                        isProcessing = false;
                        updateSubmitButton();
                        break;
                        
                    case 'configStatus':
                        const indicator = document.getElementById('status-indicator');
                        const providerIndicator = document.getElementById('provider-indicator');
                        const warning = document.getElementById('config-warning');
                        const configMessage = document.getElementById('config-message');
                        
                        // Update provider indicator
                        providerIndicator.textContent = message.provider.toUpperCase();
                        
                        // Update status indicator
                        if (message.isValid) {
                            indicator.className = 'status-indicator status-valid';
                            indicator.textContent = 'Ready';
                            warning.style.display = 'none';
                        } else {
                            indicator.className = 'status-indicator status-invalid';
                            indicator.textContent = 'Configuration Required';
                            warning.style.display = 'block';
                            configMessage.textContent = message.message;
                        }
                        break;
                }
            });
        </script>
    </body>
    </html>`;
}

// This method is called when your extension is deactivated
export function deactivate() {}