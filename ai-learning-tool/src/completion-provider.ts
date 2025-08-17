import * as vscode from 'vscode';
import { getAiCompletion } from './ai-service';
import { ContextService } from './context-service';

export class AiCompletionProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimer: NodeJS.Timeout | undefined;
    private contextService: ContextService;
    private readonly debounceMs = 500;
    private readonly minTriggerLength = 3;
    private isProcessing = false;

    constructor() {
        this.contextService = ContextService.getInstance();
    }

    public async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | undefined> {

        // Don't trigger if already processing
        if (this.isProcessing) {
            return undefined;
        }

        // Check if we should trigger completion
        if (!this.shouldTriggerCompletion(document, position)) {
            return undefined;
        }

        // Debounce the request
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        return new Promise((resolve) => {
            this.debounceTimer = setTimeout(async () => {
                try {
                    this.isProcessing = true;
                    
                    // Check if request was cancelled
                    if (token.isCancellationRequested) {
                        resolve(undefined);
                        return;
                    }

                    const completion = await this.generateCompletion(document, position);
                    
                    if (completion && !token.isCancellationRequested) {
                        resolve([{
                            insertText: completion,
                            range: new vscode.Range(position, position)
                        }]);
                    } else {
                        resolve(undefined);
                    }
                } catch (error) {
                    console.error('Completion provider error:', error);
                    resolve(undefined);
                } finally {
                    this.isProcessing = false;
                }
            }, this.debounceMs);
        });
    }

    private shouldTriggerCompletion(document: vscode.TextDocument, position: vscode.Position): boolean {
        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);
        const textAfterCursor = line.text.substring(position.character);

        // Don't trigger if there's text after cursor on same line
        if (textAfterCursor.trim().length > 0) {
            return false;
        }

        // Don't trigger in strings or comments (simple detection)
        if (this.isInStringOrComment(textBeforeCursor, document.languageId)) {
            return false;
        }

        // Trigger patterns based on context
        const triggerPatterns = this.getTriggerPatterns(document.languageId);
        
        return triggerPatterns.some(pattern => pattern.test(textBeforeCursor));
    }

    private getTriggerPatterns(languageId: string): RegExp[] {
        const commonPatterns = [
            /function\s+\w+\s*\([^)]*\)\s*{\s*$/,  // Function declaration
            /=>\s*{\s*$/,                          // Arrow function body
            /if\s*\([^)]+\)\s*{\s*$/,              // If statement
            /else\s*{\s*$/,                        // Else block
            /for\s*\([^)]+\)\s*{\s*$/,             // For loop
            /while\s*\([^)]+\)\s*{\s*$/,           // While loop
            /try\s*{\s*$/,                         // Try block
            /catch\s*\([^)]*\)\s*{\s*$/,           // Catch block
            /\/\/\s*TODO:/i,                       // TODO comment
            /\/\/\s*FIXME:/i,                      // FIXME comment
            /\/\/\s*.+$/,                          // Any comment
            /^\s*$/,                               // Empty line (in certain contexts)
            /\.\s*$/,                              // After dot (method chaining)
            /\w+\(\s*$/,                           // Function call opening
        ];

        const languageSpecificPatterns: Record<string, RegExp[]> = {
            'javascript': [
                /const\s+\w+\s*=\s*$/,
                /let\s+\w+\s*=\s*$/,
                /export\s+(?:default\s+)?$/,
                /import\s+.*from\s*$/,
                /\.then\s*\(\s*$/,
                /\.catch\s*\(\s*$/,
                /async\s+function\s*\w*\s*\([^)]*\)\s*{\s*$/,
            ],
            'typescript': [
                /const\s+\w+:\s*\w*\s*=\s*$/,
                /interface\s+\w+\s*{\s*$/,
                /type\s+\w+\s*=\s*$/,
                /class\s+\w+\s*{\s*$/,
                /private\s+\w+\s*:\s*$/,
                /public\s+\w+\s*:\s*$/,
            ],
            'python': [
                /def\s+\w+\([^)]*\):\s*$/,
                /class\s+\w+(?:\([^)]*\))?:\s*$/,
                /if\s+.+:\s*$/,
                /elif\s+.+:\s*$/,
                /else:\s*$/,
                /for\s+\w+\s+in\s+.+:\s*$/,
                /while\s+.+:\s*$/,
                /try:\s*$/,
                /except\s*(?:\w+)?:\s*$/,
                /with\s+.+:\s*$/,
                /#\s*TODO:/i,
            ],
            'java': [
                /public\s+(?:static\s+)?(?:void|[\w<>]+)\s+\w+\s*\([^)]*\)\s*{\s*$/,
                /private\s+(?:static\s+)?(?:void|[\w<>]+)\s+\w+\s*\([^)]*\)\s*{\s*$/,
                /if\s*\([^)]+\)\s*{\s*$/,
                /for\s*\([^)]+\)\s*{\s*$/,
                /while\s*\([^)]+\)\s*{\s*$/,
                /try\s*{\s*$/,
                /catch\s*\([^)]+\)\s*{\s*$/,
            ]
        };

        return [
            ...commonPatterns,
            ...(languageSpecificPatterns[languageId] || [])
        ];
    }

    private isInStringOrComment(text: string, languageId: string): boolean {
        // Simple string/comment detection
        const lastChar = text.trim().slice(-1);
        const hasOpenString = (text.match(/"/g) || []).length % 2 === 1 ||
                             (text.match(/'/g) || []).length % 2 === 1 ||
                             (text.match(/`/g) || []).length % 2 === 1;
        
        const inComment = text.trim().startsWith('//') || 
                         text.trim().startsWith('#') ||
                         text.includes('/*') && !text.includes('*/');
        
        return hasOpenString || inComment;
    }

    private async generateCompletion(document: vscode.TextDocument, position: vscode.Position): Promise<string> {
        try {
            // Get workspace context
            const workspaceContext = await this.contextService.buildWorkspaceContext();
            
            // Build prompt with context
            const prompt = await this.buildCompletionPrompt(document, position, workspaceContext);
            
            // Get AI completion
            const completion = await getAiCompletion(prompt);
            
            // Post-process the completion
            return this.postProcessCompletion(completion, document, position);
            
        } catch (error) {
            console.error('Error generating completion:', error);
            return '';
        }
    }

    private async buildCompletionPrompt(
        document: vscode.TextDocument, 
        position: vscode.Position,
        workspaceContext: any
    ): Promise<string> {
        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);
        const precedingLines = this.getPrecedingLines(document, position, 10);
        const followingLines = this.getFollowingLines(document, position, 5);

        // Format context
        const contextInfo = this.contextService.formatContextForPrompt(workspaceContext, false);

        let prompt = `You are an expert ${document.languageId} developer. Complete the code based on the context.

${contextInfo}

Current code context:
\`\`\`${document.languageId}
${precedingLines}
${textBeforeCursor}<CURSOR>
${followingLines}
\`\`\`

Instructions:
- Complete the code naturally and idiomatically
- Follow the existing code style and patterns
- Keep completions concise and focused
- Don't include the cursor marker in your response
- Only provide the completion text, no explanations
- Ensure the completion makes semantic sense in context

Completion:`;

        return prompt;
    }

    private getPrecedingLines(document: vscode.TextDocument, position: vscode.Position, count: number): string {
        const startLine = Math.max(0, position.line - count);
        const lines: string[] = [];
        
        for (let i = startLine; i < position.line; i++) {
            lines.push(document.lineAt(i).text);
        }
        
        return lines.join('\n');
    }

    private getFollowingLines(document: vscode.TextDocument, position: vscode.Position, count: number): string {
        const endLine = Math.min(document.lineCount - 1, position.line + count);
        const lines: string[] = [];
        
        for (let i = position.line + 1; i <= endLine; i++) {
            lines.push(document.lineAt(i).text);
        }
        
        return lines.join('\n');
    }

    private postProcessCompletion(completion: string, document: vscode.TextDocument, position: vscode.Position): string {
        if (!completion) {
            return '';
        }

        // Clean up the completion
        let processed = completion.trim();
        
        // Remove markdown code blocks if present
        processed = processed.replace(/^```[\w]*\n?/, '');
        processed = processed.replace(/\n?```$/, '');
        
        // Remove any explanation text (keep only code)
        const lines = processed.split('\n');
        const codeLines: string[] = [];
        let inCodeBlock = false;
        
        for (const line of lines) {
            // Skip explanatory text
            if (line.match(/^(Here|This|The|Note|Explanation)/i)) {
                continue;
            }
            
            // Keep lines that look like code
            if (this.looksLikeCode(line, document.languageId) || line.trim() === '') {
                codeLines.push(line);
            }
        }
        
        processed = codeLines.join('\n').trim();
        
        // Limit completion length
        const maxLines = 10;
        const limitedLines = processed.split('\n').slice(0, maxLines);
        processed = limitedLines.join('\n');
        
        // Ensure proper indentation
        const currentLine = document.lineAt(position.line);
        const indentation = this.getIndentation(currentLine.text);
        
        if (processed.includes('\n')) {
            const indentedLines = processed.split('\n').map((line, index) => {
                if (index === 0) return line; // First line keeps original indentation
                return line.trim() ? indentation + line : line;
            });
            processed = indentedLines.join('\n');
        }
        
        return processed;
    }

    private looksLikeCode(line: string, languageId: string): boolean {
        const trimmed = line.trim();
        
        if (!trimmed) return true; // Empty lines are fine
        
        // Common code patterns
        const codePatterns = [
            /^[a-zA-Z_$][\w$]*\s*[=:]/,          // Variable assignment
            /^(if|else|for|while|try|catch|function|class|def|import|export)/,
            /[{}();,]$/,                          // Ends with code punctuation
            /^\s*(\/\/|#|\*)/,                    // Comments
            /^[a-zA-Z_$][\w$]*\s*\(/,             // Function call
            /^\s*\./,                             // Method chaining
            /^\s*return\s/,                       // Return statement
            /^\s*(const|let|var|public|private|protected)\s/,
        ];
        
        return codePatterns.some(pattern => pattern.test(trimmed));
    }

    private getIndentation(line: string): string {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.contextService.clearCache();
    }
}