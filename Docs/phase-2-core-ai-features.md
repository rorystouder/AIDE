# Phase 2: Core AI Feature Implementation (2-4 Weeks)
<!-- PHASE: 2, TITLE: Core AI Feature Implementation, DURATION: 2-4 Weeks, GOAL: Integrate the AI model and build the primary user interface. -->

## Goal
Integrate the AI model and build the primary user interface.

## 1. Choose and Integrate an AI Model
<!-- STEP: 2.1, TASK: Integrate with a third-party AI service. -->

### 1.1 Isolate API Logic
<!-- SUB_STEP: 2.1.1, DETAIL: Create a dedicated service file for AI communication. -->
For better organization, create a new file `src/ai-service.ts`. This file will contain all functions related to communicating with the AI API, keeping your main `extension.ts` file clean and focused on VS Code integration.

### 1.2 Install HTTP Client and Configure Settings
<!-- SUB_STEP: 2.1.2, DETAIL: Add dependencies and user settings. -->

Install axios for making HTTP requests:
```bash
npm install axios
```

Add a configuration setting in `package.json` to allow users to securely enter their own API key:

```json
{
  "contributes": {
    "configuration": {
      "title": "AI Plugin",
      "properties": {
        "ai-plugin.apiKey": {
          "type": "string",
          "default": "",
          "description": "Your API Key for the AI service. Stored securely by VS Code."
        }
      }
    }
  }
}
```

### 1.3 Implement the API Call Function
<!-- SUB_STEP: 2.1.3, DETAIL: Write the function to communicate with the AI model. -->

Create an async function in `src/ai-service.ts` that:
- Reads the user's API key
- Constructs the request
- Sends it to the AI endpoint
- Handles responses and errors gracefully

```typescript
// src/ai-service.ts
import axios from 'axios';
import * as vscode from 'vscode';

// Primary interface for getting code completions
export async function getAiCompletion(prompt: string): Promise<string> {
    // VSCODE_API: vscode.workspace.getConfiguration
    // Reads settings from the user's VS Code configuration
    const config = vscode.workspace.getConfiguration('ai-plugin');
    const apiKey = config.get<string>('apiKey');

    if (!apiKey) {
        vscode.window.showErrorMessage('AI API key not set. Please go to Settings and search for "AI Plugin API Key".');
        return '';
    }

    try {
        // API_ENDPOINT: Replace with your chosen AI provider's completion API
        const response = await axios.post('https://api.example.com/v1/completions', {
            model: "text-davinci-003", // Or your model of choice
            prompt: prompt,
            max_tokens: 500
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        // Parse the response - exact path varies by API provider
        return response.data.choices[0].text;
    } catch (error) {
        console.error(error);
        vscode.window.showErrorMessage('Failed to get completion from AI service. Check the developer console for details.');
        return '';
    }
}
```

## 2. Create a User Interface (UI)
<!-- STEP: 2.2, TASK: Build a webview-based UI for user interaction. -->

### 2.1 Register the Webview Command
<!-- SUB_STEP: 2.2.1, DETAIL: Create a command that opens the webview panel. -->

In `extension.ts`, use `vscode.commands.registerCommand` to create a new command that creates and shows the webview:

```typescript
// In src/extension.ts activate function
let webviewCommand = vscode.commands.registerCommand('ai-plugin.openChat', () => {
    // VSCODE_API: vscode.window.createWebviewPanel
    const panel = vscode.window.createWebviewPanel(
        'aiChat',                   // Internal ID for the webview
        'AI Chat',                  // Title shown to the user
        vscode.ViewColumn.One,      // Show in the main editor column
        { enableScripts: true }     // Allow JavaScript to run in the webview
    );
    panel.webview.html = getWebviewContent();
    // Message handling will be added next
});
context.subscriptions.push(webviewCommand);
```

### 2.2 Implement Two-Way Communication
<!-- SUB_STEP: 2.2.2, DETAIL: Set up message passing between the extension and the webview. -->

- **Extension to Webview**: Use `panel.webview.postMessage()`
- **Webview to Extension**: Use `acquireVsCodeApi()` and its `postMessage()` method

Add message handling to the webview command:

```typescript
// Inside the 'ai-plugin.openChat' command callback, after creating the panel:
// VSCODE_API: panel.webview.onDidReceiveMessage
panel.webview.onDidReceiveMessage(
    async message => {
        if (message.command === 'submitPrompt') {
            const completion = await getAiCompletion(message.text);
            // VSCODE_API: panel.webview.postMessage
            panel.webview.postMessage({ command: 'showCompletion', text: completion });
        }
    },
    undefined,
    context.subscriptions
);
```

### 2.3 Create the Webview HTML Content
<!-- SUB_STEP: 2.2.3, DETAIL: Write the HTML and JavaScript for the webview's content. -->

Create a function that returns the complete HTML for the webview:

```typescript
function getWebviewContent() {
    return `<!DOCTYPE html>
        <html lang="en">
        <body>
            <h1>AI Chat</h1>
            <textarea id="prompt-input" rows="4" cols="50"></textarea>
            <button id="submit-button">Submit</button>
            <div id="response-area"></div>
            <script>
                // Special function provided by VS Code to the webview
                const vscode = acquireVsCodeApi();
                
                document.getElementById('submit-button').addEventListener('click', () => {
                    const text = document.getElementById('prompt-input').value;
                    // Send a message to the extension
                    vscode.postMessage({ command: 'submitPrompt', text: text });
                });
                
                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    if (event.data.command === 'showCompletion') {
                        document.getElementById('response-area').innerText = event.data.text;
                    }
                });
            </script>
        </body>
        </html>`;
}
```

## 3. Implement Code Generation Logic
<!-- STEP: 2.3, TASK: Implement logic to insert AI-generated code into the editor. -->

### 3.1 Create the Code Generation Command
<!-- SUB_STEP: 2.3.1, DETAIL: Register a command to trigger code generation from the editor. -->

Register a new command `ai-plugin.generateCode` that will be context-aware, operating on the currently active text editor.

### 3.2 Access Editor and Selection
<!-- SUB_STEP: 2.3.2, DETAIL: Get the user's selected text to use as a prompt. -->

- Get reference to active editor using `vscode.window.activeTextEditor`
- Handle case where no editor is open
- Use `editor.selection` and `editor.document.getText()` to extract highlighted text

### 3.3 Insert AI Completion into Editor
<!-- SUB_STEP: 2.3.3, DETAIL: Use the editor API to insert the generated code. -->

After receiving AI response, use `editor.edit()` to modify the document. The editBuilder pattern ensures the modification is a single, undoable action:

```typescript
let generateCodeCommand = vscode.commands.registerCommand('ai-plugin.generateCode', async () => {
    // VSCODE_API: vscode.window.activeTextEditor
    const editor = vscode.window.activeTextEditor;
    if (!editor) { 
        vscode.window.showInformationMessage('Cannot generate code, no active editor.');
        return; 
    }

    const selectedText = editor.document.getText(editor.selection);
    if (!selectedText) {
        vscode.window.showInformationMessage('Please select text to use as a prompt for code generation.');
        return;
    }

    const completion = await getAiCompletion(selectedText);

    if (completion) {
        // VSCODE_API: editor.edit
        // Performs text insertion as a single, atomic operation
        editor.edit(editBuilder => {
            // Insert completion at the end of user's selection
            editBuilder.insert(editor.selection.end, '\n' + completion);
        });
    }
});
context.subscriptions.push(generateCodeCommand);
```

## Key Implementation Points

### API Integration Best Practices
- Never hardcode API keys
- Implement proper error handling
- Add request timeouts
- Consider rate limiting
- Cache responses when appropriate

### Webview Security
- Always enable Content Security Policy (CSP)
- Sanitize user input
- Use `acquireVsCodeApi()` for communication
- Avoid inline scripts when possible

### User Experience
- Provide clear feedback during API calls
- Show loading indicators
- Handle errors gracefully with informative messages
- Ensure commands are discoverable

## Testing Your Implementation

1. **Test API Integration**
   - Verify API key configuration works
   - Test with invalid API keys
   - Test network error handling

2. **Test Webview**
   - Verify webview opens correctly
   - Test message passing both directions
   - Check for memory leaks on panel close

3. **Test Code Generation**
   - Try with various text selections
   - Test with no selection
   - Verify insertion at correct position
   - Check undo/redo functionality

## Next Steps
With core AI features implemented, proceed to [Phase 3: Advanced Features and User Experience](phase-3-advanced-features.md)