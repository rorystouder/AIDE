import * as vscode from 'vscode';
import * as path from 'path';

export interface FileContext {
    uri: vscode.Uri;
    fileName: string;
    relativePath: string;
    content: string;
    language: string;
    isOpen: boolean;
    relevanceScore: number;
}

export interface WorkspaceContext {
    currentFile: FileContext | null;
    relatedFiles: FileContext[];
    imports: string[];
    projectType: string;
    workspaceName: string;
}

export class ContextService {
    private static instance: ContextService;
    private contextCache = new Map<string, WorkspaceContext>();
    private readonly maxRelatedFiles = 5;
    private readonly maxFileSize = 50000; // 50KB limit for context files

    public static getInstance(): ContextService {
        if (!ContextService.instance) {
            ContextService.instance = new ContextService();
        }
        return ContextService.instance;
    }

    /**
     * Build comprehensive context for the current workspace and file
     */
    async buildWorkspaceContext(): Promise<WorkspaceContext> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return this.getEmptyContext();
        }

        const currentFileUri = editor.document.uri.toString();
        
        // Check cache first
        if (this.contextCache.has(currentFileUri)) {
            const cached = this.contextCache.get(currentFileUri)!;
            // Return cached if file hasn't changed
            if (cached.currentFile?.content === editor.document.getText()) {
                return cached;
            }
        }

        const context = await this.buildFreshContext(editor);
        
        // Cache the result
        this.contextCache.set(currentFileUri, context);
        
        return context;
    }

    private async buildFreshContext(editor: vscode.TextEditor): Promise<WorkspaceContext> {
        const currentFile = await this.getCurrentFileContext(editor);
        const relatedFiles = await this.findRelatedFiles(currentFile);
        const imports = this.extractImports(currentFile.content, currentFile.language);
        const projectType = await this.detectProjectType();
        const workspaceName = this.getWorkspaceName();

        return {
            currentFile,
            relatedFiles,
            imports,
            projectType,
            workspaceName
        };
    }

    private async getCurrentFileContext(editor: vscode.TextEditor): Promise<FileContext> {
        const document = editor.document;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const relativePath = workspaceFolder 
            ? path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)
            : document.fileName;

        return {
            uri: document.uri,
            fileName: path.basename(document.fileName),
            relativePath,
            content: document.getText(),
            language: document.languageId,
            isOpen: true,
            relevanceScore: 1.0 // Current file always has highest relevance
        };
    }

    /**
     * Find files related to the current file based on various criteria
     */
    private async findRelatedFiles(currentFile: FileContext): Promise<FileContext[]> {
        const relatedFiles: FileContext[] = [];
        
        // Get open editors first (highest priority)
        const openFiles = await this.getOpenEditorFiles(currentFile);
        relatedFiles.push(...openFiles);

        // Find files in the same directory
        const sameDirectoryFiles = await this.findSameDirectoryFiles(currentFile);
        relatedFiles.push(...sameDirectoryFiles);

        // Find files mentioned in imports
        const importedFiles = await this.findImportedFiles(currentFile);
        relatedFiles.push(...importedFiles);

        // Find files with similar names or patterns
        const similarFiles = await this.findSimilarFiles(currentFile);
        relatedFiles.push(...similarFiles);

        // Remove duplicates and sort by relevance
        const uniqueFiles = this.deduplicateFiles(relatedFiles);
        const sortedFiles = uniqueFiles
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, this.maxRelatedFiles);

        return sortedFiles;
    }

    private async getOpenEditorFiles(currentFile: FileContext): Promise<FileContext[]> {
        const openFiles: FileContext[] = [];
        
        for (const tabGroup of vscode.window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                if (tab.input instanceof vscode.TabInputText) {
                    const uri = tab.input.uri;
                    
                    // Skip current file
                    if (uri.toString() === currentFile.uri.toString()) {
                        continue;
                    }

                    try {
                        const document = await vscode.workspace.openTextDocument(uri);
                        if (document.getText().length > this.maxFileSize) {
                            continue;
                        }

                        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
                        const relativePath = workspaceFolder 
                            ? path.relative(workspaceFolder.uri.fsPath, uri.fsPath)
                            : uri.fsPath;

                        openFiles.push({
                            uri,
                            fileName: path.basename(uri.fsPath),
                            relativePath,
                            content: document.getText(),
                            language: document.languageId,
                            isOpen: true,
                            relevanceScore: 0.8 // High relevance for open files
                        });
                    } catch (error) {
                        // Skip files that can't be read
                        continue;
                    }
                }
            }
        }

        return openFiles;
    }

    private async findSameDirectoryFiles(currentFile: FileContext): Promise<FileContext[]> {
        const currentDir = path.dirname(currentFile.uri.fsPath);
        const files: FileContext[] = [];

        try {
            const dirUri = vscode.Uri.file(currentDir);
            const dirContents = await vscode.workspace.fs.readDirectory(dirUri);

            for (const [fileName, fileType] of dirContents) {
                if (fileType === vscode.FileType.File) {
                    const fileUri = vscode.Uri.joinPath(dirUri, fileName);
                    
                    // Skip current file and non-code files
                    if (fileUri.toString() === currentFile.uri.toString() || 
                        !this.isCodeFile(fileName)) {
                        continue;
                    }

                    try {
                        const document = await vscode.workspace.openTextDocument(fileUri);
                        if (document.getText().length > this.maxFileSize) {
                            continue;
                        }

                        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
                        const relativePath = workspaceFolder 
                            ? path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath)
                            : fileUri.fsPath;

                        files.push({
                            uri: fileUri,
                            fileName,
                            relativePath,
                            content: document.getText(),
                            language: document.languageId,
                            isOpen: false,
                            relevanceScore: 0.6 // Moderate relevance for same directory
                        });
                    } catch (error) {
                        continue;
                    }
                }
            }
        } catch (error) {
            // Directory read failed, skip
        }

        return files;
    }

    private async findImportedFiles(currentFile: FileContext): Promise<FileContext[]> {
        const imports = this.extractImports(currentFile.content, currentFile.language);
        const files: FileContext[] = [];

        for (const importPath of imports) {
            try {
                const resolvedUri = await this.resolveImportPath(importPath, currentFile.uri);
                if (resolvedUri) {
                    const document = await vscode.workspace.openTextDocument(resolvedUri);
                    if (document.getText().length > this.maxFileSize) {
                        continue;
                    }

                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(resolvedUri);
                    const relativePath = workspaceFolder 
                        ? path.relative(workspaceFolder.uri.fsPath, resolvedUri.fsPath)
                        : resolvedUri.fsPath;

                    files.push({
                        uri: resolvedUri,
                        fileName: path.basename(resolvedUri.fsPath),
                        relativePath,
                        content: document.getText(),
                        language: document.languageId,
                        isOpen: false,
                        relevanceScore: 0.7 // High relevance for imported files
                    });
                }
            } catch (error) {
                continue;
            }
        }

        return files;
    }

    private async findSimilarFiles(currentFile: FileContext): Promise<FileContext[]> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentFile.uri);
        if (!workspaceFolder) {
            return [];
        }

        const files: FileContext[] = [];
        const currentBaseName = path.parse(currentFile.fileName).name;
        
        // Search for files with similar names
        const searchPattern = `**/*{${currentBaseName}*,*${currentBaseName}*}*`;
        
        try {
            const foundFiles = await vscode.workspace.findFiles(
                new vscode.RelativePattern(workspaceFolder, searchPattern),
                '**/node_modules/**',
                10 // Limit results
            );

            for (const uri of foundFiles) {
                if (uri.toString() === currentFile.uri.toString() || 
                    !this.isCodeFile(uri.fsPath)) {
                    continue;
                }

                try {
                    const document = await vscode.workspace.openTextDocument(uri);
                    if (document.getText().length > this.maxFileSize) {
                        continue;
                    }

                    const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);

                    files.push({
                        uri,
                        fileName: path.basename(uri.fsPath),
                        relativePath,
                        content: document.getText(),
                        language: document.languageId,
                        isOpen: false,
                        relevanceScore: 0.4 // Lower relevance for similar names
                    });
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            // Search failed, skip
        }

        return files;
    }

    /**
     * Extract import statements from code
     */
    private extractImports(content: string, language: string): string[] {
        const imports: string[] = [];

        switch (language) {
            case 'javascript':
            case 'typescript':
            case 'javascriptreact':
            case 'typescriptreact':
                // ES6 imports
                const es6ImportRegex = /import\s+(?:(?:\w+(?:\s*,\s*)?)|(?:\{[^}]*\}(?:\s*,\s*)?)|(?:\*\s+as\s+\w+(?:\s*,\s*)?))?\s*from\s+['"`]([^'"`]+)['"`]/g;
                // CommonJS requires
                const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
                
                let match;
                while ((match = es6ImportRegex.exec(content)) !== null) {
                    imports.push(match[1]);
                }
                while ((match = requireRegex.exec(content)) !== null) {
                    imports.push(match[1]);
                }
                break;

            case 'python':
                const pythonImportRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
                let pyMatch;
                while ((pyMatch = pythonImportRegex.exec(content)) !== null) {
                    imports.push(pyMatch[1] || pyMatch[2]);
                }
                break;

            case 'java':
                const javaImportRegex = /import\s+(?:static\s+)?([^;]+);/g;
                let javaMatch;
                while ((javaMatch = javaImportRegex.exec(content)) !== null) {
                    imports.push(javaMatch[1]);
                }
                break;
        }

        return imports.filter(imp => imp && !imp.startsWith('.') && !imp.includes('node_modules'));
    }

    private async resolveImportPath(importPath: string, currentFileUri: vscode.Uri): Promise<vscode.Uri | null> {
        // Simple resolution for relative imports
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const currentDir = path.dirname(currentFileUri.fsPath);
            const resolvedPath = path.resolve(currentDir, importPath);
            
            // Try different extensions
            const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java'];
            for (const ext of extensions) {
                try {
                    const withExt = resolvedPath + ext;
                    const uri = vscode.Uri.file(withExt);
                    await vscode.workspace.fs.stat(uri);
                    return uri;
                } catch {
                    continue;
                }
            }
        }

        return null;
    }

    private async detectProjectType(): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return 'unknown';
        }

        const rootFolder = workspaceFolders[0];
        
        // Check for common project files
        const projectFiles = [
            { file: 'package.json', type: 'node' },
            { file: 'requirements.txt', type: 'python' },
            { file: 'pom.xml', type: 'java-maven' },
            { file: 'build.gradle', type: 'java-gradle' },
            { file: 'Cargo.toml', type: 'rust' },
            { file: 'go.mod', type: 'go' },
            { file: '.csproj', type: 'dotnet' }
        ];

        for (const { file, type } of projectFiles) {
            try {
                const fileUri = vscode.Uri.joinPath(rootFolder.uri, file);
                await vscode.workspace.fs.stat(fileUri);
                return type;
            } catch {
                continue;
            }
        }

        return 'unknown';
    }

    private getWorkspaceName(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return path.basename(workspaceFolders[0].uri.fsPath);
        }
        return 'unknown';
    }

    private isCodeFile(fileName: string): boolean {
        const codeExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.cpp', '.c', '.h',
            '.rs', '.go', '.php', '.rb', '.swift', '.kt', '.scala', '.clj', '.fs',
            '.vue', '.svelte', '.html', '.css', '.scss', '.less', '.json', '.xml',
            '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'
        ];
        
        const ext = path.extname(fileName).toLowerCase();
        return codeExtensions.includes(ext);
    }

    private deduplicateFiles(files: FileContext[]): FileContext[] {
        const seen = new Set<string>();
        return files.filter(file => {
            const key = file.uri.toString();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    private getEmptyContext(): WorkspaceContext {
        return {
            currentFile: null,
            relatedFiles: [],
            imports: [],
            projectType: 'unknown',
            workspaceName: 'unknown'
        };
    }

    /**
     * Format context for AI prompts
     */
    formatContextForPrompt(context: WorkspaceContext, includeFullContent = false): string {
        let prompt = '';

        // Project information
        prompt += `Project: ${context.workspaceName} (${context.projectType})\n\n`;

        // Current file
        if (context.currentFile) {
            prompt += `Current file: ${context.currentFile.relativePath}\n`;
            prompt += `Language: ${context.currentFile.language}\n`;
            if (includeFullContent) {
                prompt += `Content:\n\`\`\`${context.currentFile.language}\n${context.currentFile.content}\n\`\`\`\n\n`;
            }
        }

        // Related files
        if (context.relatedFiles.length > 0) {
            prompt += `Related files:\n`;
            context.relatedFiles.forEach(file => {
                prompt += `- ${file.relativePath} (${file.language}${file.isOpen ? ', open' : ''})\n`;
                if (includeFullContent && file.content.length < 1000) {
                    prompt += `  \`\`\`${file.language}\n${file.content}\n\`\`\`\n`;
                }
            });
            prompt += '\n';
        }

        // Imports
        if (context.imports.length > 0) {
            prompt += `Dependencies: ${context.imports.join(', ')}\n\n`;
        }

        return prompt;
    }

    /**
     * Clear context cache
     */
    clearCache(): void {
        this.contextCache.clear();
    }
}