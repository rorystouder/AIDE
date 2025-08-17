# Phase 3: Advanced Features and User Experience (3-6 Weeks)
<!-- PHASE: 3, TITLE: Advanced Features, DURATION: 3-6 Weeks, GOAL: Refine the plugin with sophisticated, integrated features for coding assistance and learning. -->

## Goal
Refine the plugin with sophisticated, integrated features for coding assistance and learning.

## 1. Context Awareness
<!-- STEP: 3.1, TASK: Enhance AI prompts with broader workspace context. -->

### 1.1 Gather Richer Context
<!-- SUB_STEP: 3.1.1, DETAIL: Collect code from the active editor and other relevant open files. -->

The goal is to provide the AI with more than just the current line. Create a helper function that gathers:

1. Full content of the active text document
2. User's current cursor position
3. Content from other open tabs that might be relevant (imported modules, related components)

Structure this information clearly in the prompt sent to the AI, indicating file paths and the user's current location.

### 1.2 Implement Workspace-Wide Search
<!-- SUB_STEP: 3.1.2, DETAIL: Use VS Code API to find and read relevant files across the entire workspace. -->

Use `vscode.workspace.findFiles` to search for files likely related to the user's current task:
- Files with similar names
- Files in the same directory
- Project configuration files (package.json, tsconfig.json, etc.)

This allows the AI to understand project dependencies and overall architecture for more accurate suggestions.

```typescript
// Example: A function to build a context string for the AI prompt
async function buildContextString(): Promise<string> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return '';

    let context = `Current file: ${editor.document.fileName}\n---\n${editor.document.getText()}\n---\n`;

    // Add content from other visible editors
    for (const tab of vscode.window.tabGroups.all.flatMap(group => group.tabs)) {
        if (tab.input instanceof vscode.TabInputText && tab.input.uri.fsPath !== editor.document.uri.fsPath) {
            const doc = await vscode.workspace.openTextDocument(tab.input.uri);
            context += `\nRelevant file: ${doc.fileName}\n---\n${doc.getText().substring(0, 1000)}\n---\n`;
        }
    }
    return context;
}
```

## 2. Real-time Suggestions (Tab-to-Complete)
<!-- STEP: 3.2, TASK: Implement proactive, inline code suggestions. -->

### 2.1 Implement the InlineCompletionItemProvider
<!-- SUB_STEP: 3.2.1, DETAIL: Create a class that provides inline completion items. -->

Create a new file, `src/completionProvider.ts`, to house the `AiCompletionProvider` class:
- Must implement the `provideInlineCompletionItems` method
- Register provider in `extension.ts` 
- Use `{ pattern: '**' }` glob pattern to activate for all files

### 2.2 Develop Intelligent Trigger Logic
<!-- SUB_STEP: 3.2.2, DETAIL: Move beyond simple triggers to proactive, context-based suggestions. -->

The `provideInlineCompletionItems` method should not trigger on every keystroke:

**Implement Debouncing**: Use a timer to ensure API calls only occur after user pauses typing (e.g., 300-500ms)

**Analyze Code Context**: Trigger when the user:
- Finishes writing a function signature (`function myFunction() {`)
- Writes a comment describing intent (`// Now, fetch the user data`)
- Is on a new, empty line inside a function or class body

### 2.3 Refine the Provider Implementation
<!-- SUB_STEP: 3.2.3, DETAIL: Write the code for the completion provider, including performance optimizations. -->

The provider will gather context, send to AI, and format response as an `InlineCompletionItem`:

```typescript
// src/completionProvider.ts
import * as vscode from 'vscode';
import { getAiCompletion } from './ai-service';

export class AiCompletionProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimer: NodeJS.Timeout | undefined;

    public async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | undefined> {

        // Simple check to see if we should trigger (should be more sophisticated)
        const line = document.lineAt(position.line);
        if (line.isEmptyOrWhitespace) {
            // Debounce the request
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            return new Promise((resolve) => {
                this.debounceTimer = setTimeout(async () => {
                    const prompt = await this.buildPrompt(document, position);
                    const completion = await getAiCompletion(prompt);
                    if (completion && !token.isCancellationRequested) {
                        resolve([{ insertText: completion }]);
                    } else {
                        resolve(undefined);
                    }
                }, 500); // 500ms delay
            });
        }
        return undefined;
    }

    private async buildPrompt(document: vscode.TextDocument, position: vscode.Position): Promise<string> {
        // Use advanced context gathering logic from Step 3.1
        return document.getText();
    }
}
```

Register the provider in `extension.ts`:

```typescript
// In src/extension.ts activate function:
// VSCODE_API: vscode.languages.registerInlineCompletionItemProvider
vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' }, 
    new AiCompletionProvider()
);
```

## 3. Advanced Context Features

### 3.1 Symbol Recognition
Use VS Code's symbol provider API to understand code structure:

```typescript
// Get all symbols in the current document
const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    document.uri
);
```

### 3.2 Language-Specific Context
Implement language-specific context gathering:

```typescript
function getLanguageContext(document: vscode.TextDocument): string {
    const language = document.languageId;
    
    switch(language) {
        case 'javascript':
        case 'typescript':
            return gatherJSContext(document);
        case 'python':
            return gatherPythonContext(document);
        case 'java':
            return gatherJavaContext(document);
        default:
            return document.getText();
    }
}
```

### 3.3 Import/Dependency Analysis
Parse imports to understand dependencies:

```typescript
function analyzeImports(documentText: string, language: string): string[] {
    const imports: string[] = [];
    
    if (language === 'javascript' || language === 'typescript') {
        // Match ES6 imports
        const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
        let match;
        while ((match = importRegex.exec(documentText)) !== null) {
            imports.push(match[1]);
        }
    }
    
    return imports;
}
```

## 4. Performance Optimizations

### 4.1 Caching Strategy
Implement intelligent caching to reduce API calls:

```typescript
class CompletionCache {
    private cache = new Map<string, { completion: string; timestamp: number }>();
    private readonly CACHE_DURATION = 60000; // 1 minute

    set(key: string, completion: string): void {
        this.cache.set(key, { 
            completion, 
            timestamp: Date.now() 
        });
    }

    get(key: string): string | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.completion;
    }
}
```

### 4.2 Request Cancellation
Implement proper cancellation for in-flight requests:

```typescript
class RequestManager {
    private currentRequest: AbortController | null = null;

    async makeRequest(prompt: string): Promise<string> {
        // Cancel previous request if it exists
        if (this.currentRequest) {
            this.currentRequest.abort();
        }

        this.currentRequest = new AbortController();
        
        try {
            const response = await fetch(apiUrl, {
                signal: this.currentRequest.signal,
                // ... other options
            });
            return await response.text();
        } finally {
            this.currentRequest = null;
        }
    }
}
```

### 4.3 Smart Triggering
Implement sophisticated trigger detection:

```typescript
function shouldTriggerCompletion(
    document: vscode.TextDocument, 
    position: vscode.Position
): boolean {
    const line = document.lineAt(position.line);
    const textBeforeCursor = line.text.substring(0, position.character);
    
    // Trigger patterns
    const triggers = [
        /function\s+\w+\s*\([^)]*\)\s*{\s*$/,  // Function declaration
        /if\s*\([^)]+\)\s*{\s*$/,              // If statement
        /for\s*\([^)]+\)\s*{\s*$/,             // For loop
        /\/\/\s*TODO:/i,                        // TODO comment
        /\/\/\s*\w+.*$/,                        // Any comment
        /^\s*$/                                 // Empty line
    ];
    
    return triggers.some(pattern => pattern.test(textBeforeCursor));
}
```

## 5. User Experience Enhancements

### 5.1 Status Bar Integration
Add status bar item to show AI status:

```typescript
const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
);

statusBarItem.text = "$(sparkle) AI Ready";
statusBarItem.tooltip = "AI Assistant is ready";
statusBarItem.show();

// Update during API calls
statusBarItem.text = "$(loading~spin) AI Thinking...";
```

### 5.2 Progress Notifications
Show progress for long-running operations:

```typescript
vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "AI Processing",
    cancellable: true
}, async (progress, token) => {
    progress.report({ increment: 0, message: "Analyzing code..." });
    
    token.onCancellationRequested(() => {
        // Handle cancellation
    });
    
    const result = await getAiCompletion(prompt);
    
    progress.report({ increment: 100, message: "Complete!" });
    return result;
});
```

### 5.3 Quick Actions
Add code actions for common AI operations:

```typescript
class AiCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];
        
        // Add "Explain this code" action
        const explainAction = new vscode.CodeAction(
            'Explain this code',
            vscode.CodeActionKind.Empty
        );
        explainAction.command = {
            command: 'ai-plugin.explainCode',
            arguments: [document, range]
        };
        actions.push(explainAction);
        
        // Add "Optimize this code" action
        const optimizeAction = new vscode.CodeAction(
            'Optimize this code',
            vscode.CodeActionKind.RefactorRewrite
        );
        optimizeAction.command = {
            command: 'ai-plugin.optimizeCode',
            arguments: [document, range]
        };
        actions.push(optimizeAction);
        
        return actions;
    }
}

// Register the provider
vscode.languages.registerCodeActionsProvider(
    { pattern: '**' },
    new AiCodeActionProvider()
);
```

## Testing Checklist

### Context Awareness
- [ ] Verify multi-file context gathering works
- [ ] Test with different project structures
- [ ] Ensure performance with large files

### Real-time Suggestions
- [ ] Test debouncing mechanism
- [ ] Verify suggestions appear at appropriate times
- [ ] Check cancellation works properly
- [ ] Test with different languages

### Performance
- [ ] Monitor API call frequency
- [ ] Check cache effectiveness
- [ ] Verify no memory leaks
- [ ] Test with slow network conditions

### User Experience
- [ ] Status bar updates correctly
- [ ] Progress notifications appear/disappear properly
- [ ] Quick actions work as expected
- [ ] Error messages are helpful

## Next Steps
With advanced features implemented, proceed to [Phase 4: Testing, Deployment, and Maintenance](phase-4-testing-deployment.md)