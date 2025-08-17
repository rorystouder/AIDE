import * as vscode from 'vscode';
import * as path from 'path';

export interface SearchResult {
    uri: vscode.Uri;
    fileName: string;
    relativePath: string;
    lineNumber: number;
    lineText: string;
    matchText: string;
    contextBefore: string[];
    contextAfter: string[];
    relevanceScore: number;
}

export interface SearchOptions {
    includeComments?: boolean;
    includeStrings?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
    fileTypes?: string[];
    excludePatterns?: string[];
    maxResults?: number;
    contextLines?: number;
}

export class SearchService {
    private static instance: SearchService;
    private readonly defaultExcludePatterns = [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '**/.git/**',
        '**/*.min.js',
        '**/*.map',
        '**/coverage/**'
    ];

    public static getInstance(): SearchService {
        if (!SearchService.instance) {
            SearchService.instance = new SearchService();
        }
        return SearchService.instance;
    }

    /**
     * Search for text patterns across the workspace
     */
    async searchWorkspace(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return [];
        }

        const searchOptions = this.normalizeSearchOptions(options);
        const results: SearchResult[] = [];

        for (const folder of workspaceFolders) {
            const folderResults = await this.searchFolder(folder, query, searchOptions);
            results.push(...folderResults);
        }

        // Sort by relevance score and limit results
        return results
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, searchOptions.maxResults);
    }

    /**
     * Search for function/class definitions
     */
    async searchDefinitions(identifier: string, language?: string): Promise<SearchResult[]> {
        const patterns = this.getDefinitionPatterns(identifier, language);
        const results: SearchResult[] = [];

        for (const pattern of patterns) {
            const patternResults = await this.searchWorkspace(pattern, {
                useRegex: true,
                caseSensitive: false,
                maxResults: 50,
                contextLines: 3
            });
            results.push(...patternResults);
        }

        return this.deduplicateResults(results);
    }

    /**
     * Search for references/usages of an identifier
     */
    async searchReferences(identifier: string, language?: string): Promise<SearchResult[]> {
        const options: SearchOptions = {
            caseSensitive: true,
            wholeWord: true,
            maxResults: 100,
            contextLines: 2,
            includeComments: false
        };

        if (language) {
            options.fileTypes = this.getFileTypesForLanguage(language);
        }

        return await this.searchWorkspace(identifier, options);
    }

    /**
     * Search for similar code patterns
     */
    async searchSimilarCode(codeSnippet: string, language: string): Promise<SearchResult[]> {
        // Extract keywords and significant tokens from the code
        const keywords = this.extractCodeKeywords(codeSnippet, language);
        const results: SearchResult[] = [];

        for (const keyword of keywords) {
            const keywordResults = await this.searchWorkspace(keyword, {
                fileTypes: this.getFileTypesForLanguage(language),
                maxResults: 20,
                contextLines: 5,
                includeComments: false
            });
            results.push(...keywordResults);
        }

        // Score results based on keyword frequency and context similarity
        return this.rankSimilarityResults(results, codeSnippet);
    }

    /**
     * Search for TODO comments and fixmes
     */
    async searchTodos(): Promise<SearchResult[]> {
        const todoPatterns = [
            'TODO:?\\s*(.+)',
            'FIXME:?\\s*(.+)',
            'HACK:?\\s*(.+)',
            'NOTE:?\\s*(.+)',
            'BUG:?\\s*(.+)',
            'REVIEW:?\\s*(.+)'
        ];

        const results: SearchResult[] = [];
        
        for (const pattern of todoPatterns) {
            const patternResults = await this.searchWorkspace(pattern, {
                useRegex: true,
                includeComments: true,
                maxResults: 100,
                contextLines: 1
            });
            results.push(...patternResults);
        }

        return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    }

    /**
     * Search for specific file types or patterns
     */
    async searchFiles(pattern: string): Promise<vscode.Uri[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const excludePattern = new vscode.RelativePattern(
            workspaceFolders[0],
            `{${this.defaultExcludePatterns.join(',')}}`
        );

        return await vscode.workspace.findFiles(
            new vscode.RelativePattern(workspaceFolders[0], pattern),
            excludePattern,
            1000
        );
    }

    private async searchFolder(
        folder: vscode.WorkspaceFolder,
        query: string,
        options: SearchOptions
    ): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const includePattern = this.buildIncludePattern(options.fileTypes);
        const excludePattern = this.buildExcludePattern(options.excludePatterns);

        try {
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, includePattern),
                new vscode.RelativePattern(folder, excludePattern),
                1000
            );

            for (const file of files) {
                try {
                    const fileResults = await this.searchFile(file, query, options, folder);
                    results.push(...fileResults);
                } catch (error) {
                    console.warn(`Failed to search file ${file.fsPath}:`, error);
                    continue;
                }
            }
        } catch (error) {
            console.error(`Failed to search folder ${folder.uri.fsPath}:`, error);
        }

        return results;
    }

    private async searchFile(
        uri: vscode.Uri,
        query: string,
        options: SearchOptions,
        workspaceFolder: vscode.WorkspaceFolder
    ): Promise<SearchResult[]> {
        const document = await vscode.workspace.openTextDocument(uri);
        const text = document.getText();
        const lines = text.split('\n');
        const results: SearchResult[] = [];

        const searchRegex = this.buildSearchRegex(query, options);
        const fileName = path.basename(uri.fsPath);
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const matches = this.findMatches(line, searchRegex, options);

            for (const match of matches) {
                // Skip if this is a comment/string and we don't want those
                if (!this.shouldIncludeMatch(line, match.index, options)) {
                    continue;
                }

                const result: SearchResult = {
                    uri,
                    fileName,
                    relativePath,
                    lineNumber: i + 1,
                    lineText: line,
                    matchText: match.text,
                    contextBefore: this.getContextLines(lines, i, options.contextLines || 1, 'before'),
                    contextAfter: this.getContextLines(lines, i, options.contextLines || 1, 'after'),
                    relevanceScore: this.calculateRelevanceScore(match.text, query, fileName, line)
                };

                results.push(result);
            }
        }

        return results;
    }

    private buildSearchRegex(query: string, options: SearchOptions): RegExp {
        let pattern = query;
        
        if (!options.useRegex) {
            // Escape special regex characters
            pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        if (options.wholeWord) {
            pattern = `\\b${pattern}\\b`;
        }

        const flags = options.caseSensitive ? 'g' : 'gi';
        return new RegExp(pattern, flags);
    }

    private findMatches(line: string, regex: RegExp, options: SearchOptions): Array<{text: string, index: number}> {
        const matches: Array<{text: string, index: number}> = [];
        let match;

        // Reset regex lastIndex to ensure we find all matches
        regex.lastIndex = 0;

        while ((match = regex.exec(line)) !== null) {
            matches.push({
                text: match[0],
                index: match.index
            });

            // Prevent infinite loop on zero-width matches
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
        }

        return matches;
    }

    private shouldIncludeMatch(line: string, matchIndex: number, options: SearchOptions): boolean {
        const trimmedLine = line.trim();
        
        // Check if it's a comment
        if (!options.includeComments) {
            if (trimmedLine.startsWith('//') || 
                trimmedLine.startsWith('#') || 
                trimmedLine.startsWith('/*') ||
                line.includes('*/')) {
                return false;
            }
        }

        // Check if it's in a string (basic detection)
        if (!options.includeStrings) {
            const beforeMatch = line.substring(0, matchIndex);
            const singleQuotes = (beforeMatch.match(/'/g) || []).length;
            const doubleQuotes = (beforeMatch.match(/"/g) || []).length;
            const backticks = (beforeMatch.match(/`/g) || []).length;

            if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) {
                return false;
            }
        }

        return true;
    }

    private getContextLines(lines: string[], currentLine: number, contextSize: number, direction: 'before' | 'after'): string[] {
        if (direction === 'before') {
            const start = Math.max(0, currentLine - contextSize);
            return lines.slice(start, currentLine);
        } else {
            const end = Math.min(lines.length, currentLine + contextSize + 1);
            return lines.slice(currentLine + 1, end);
        }
    }

    private calculateRelevanceScore(matchText: string, query: string, fileName: string, line: string): number {
        let score = 0;

        // Exact match bonus
        if (matchText.toLowerCase() === query.toLowerCase()) {
            score += 10;
        }

        // File name relevance
        if (fileName.toLowerCase().includes(query.toLowerCase())) {
            score += 5;
        }

        // Line context relevance (keywords around the match)
        const contextKeywords = ['function', 'class', 'interface', 'export', 'import', 'const', 'let', 'var'];
        for (const keyword of contextKeywords) {
            if (line.toLowerCase().includes(keyword)) {
                score += 2;
            }
        }

        // Length bonus (shorter matches are often more relevant)
        score += Math.max(0, 10 - matchText.length / 10);

        return score;
    }

    private getDefinitionPatterns(identifier: string, language?: string): string[] {
        const escapedId = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns: string[] = [];

        if (!language || language === 'typescript' || language === 'javascript') {
            patterns.push(
                `function\\s+${escapedId}\\s*\\(`,
                `const\\s+${escapedId}\\s*=`,
                `let\\s+${escapedId}\\s*=`,
                `class\\s+${escapedId}\\s*{`,
                `interface\\s+${escapedId}\\s*{`,
                `type\\s+${escapedId}\\s*=`,
                `export\\s+(?:const|let|function|class|interface|type)\\s+${escapedId}`
            );
        }

        if (!language || language === 'python') {
            patterns.push(
                `def\\s+${escapedId}\\s*\\(`,
                `class\\s+${escapedId}\\s*[\\(:]`,
                `${escapedId}\\s*=\\s*lambda`
            );
        }

        if (!language || language === 'java') {
            patterns.push(
                `(?:public|private|protected)?\\s*(?:static)?\\s*\\w+\\s+${escapedId}\\s*\\(`,
                `(?:public|private|protected)?\\s*class\\s+${escapedId}\\s*{`,
                `(?:public|private|protected)?\\s*interface\\s+${escapedId}\\s*{`
            );
        }

        return patterns;
    }

    private extractCodeKeywords(code: string, language: string): string[] {
        const keywords: string[] = [];
        
        // Remove comments and strings for better keyword extraction
        let cleanCode = code;
        
        // Remove line comments
        cleanCode = cleanCode.replace(/\/\/.*$/gm, '');
        // Remove block comments
        cleanCode = cleanCode.replace(/\/\*[\s\S]*?\*\//g, '');
        // Remove strings
        cleanCode = cleanCode.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '');

        // Extract identifiers (words starting with letter or underscore)
        const identifierRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
        let match;
        
        while ((match = identifierRegex.exec(cleanCode)) !== null) {
            const word = match[0];
            if (word.length > 2 && !this.isLanguageKeyword(word, language)) {
                keywords.push(word);
            }
        }

        // Return unique keywords sorted by length (longer ones first)
        return [...new Set(keywords)].sort((a, b) => b.length - a.length);
    }

    private isLanguageKeyword(word: string, language: string): boolean {
        const keywords: Record<string, string[]> = {
            javascript: ['var', 'let', 'const', 'function', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined'],
            typescript: ['var', 'let', 'const', 'function', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum'],
            python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'True', 'False', 'None', 'import', 'from'],
            java: ['public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null']
        };

        return keywords[language]?.includes(word) || false;
    }

    private rankSimilarityResults(results: SearchResult[], originalCode: string): SearchResult[] {
        const originalKeywords = this.extractCodeKeywords(originalCode, 'javascript');
        
        return results.map(result => {
            const resultKeywords = this.extractCodeKeywords(result.lineText, 'javascript');
            const commonKeywords = originalKeywords.filter(k => resultKeywords.includes(k));
            
            // Boost relevance score based on keyword similarity
            result.relevanceScore += commonKeywords.length * 3;
            
            return result;
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    private deduplicateResults(results: SearchResult[]): SearchResult[] {
        const seen = new Set<string>();
        return results.filter(result => {
            const key = `${result.uri.toString()}:${result.lineNumber}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    private normalizeSearchOptions(options: SearchOptions): Required<SearchOptions> {
        return {
            includeComments: options.includeComments ?? true,
            includeStrings: options.includeStrings ?? true,
            caseSensitive: options.caseSensitive ?? false,
            wholeWord: options.wholeWord ?? false,
            useRegex: options.useRegex ?? false,
            fileTypes: options.fileTypes ?? ['**/*'],
            excludePatterns: options.excludePatterns ?? this.defaultExcludePatterns,
            maxResults: options.maxResults ?? 50,
            contextLines: options.contextLines ?? 2
        };
    }

    private buildIncludePattern(fileTypes?: string[]): string {
        if (!fileTypes || fileTypes.length === 0) {
            return '**/*';
        }
        return `{${fileTypes.join(',')}}`;
    }

    private buildExcludePattern(excludePatterns?: string[]): string {
        const patterns = excludePatterns || this.defaultExcludePatterns;
        return `{${patterns.join(',')}}`;
    }

    private getFileTypesForLanguage(language: string): string[] {
        const typeMap: Record<string, string[]> = {
            javascript: ['**/*.js', '**/*.jsx', '**/*.mjs'],
            typescript: ['**/*.ts', '**/*.tsx'],
            python: ['**/*.py', '**/*.pyw'],
            java: ['**/*.java'],
            cpp: ['**/*.cpp', '**/*.cc', '**/*.cxx', '**/*.h', '**/*.hpp'],
            c: ['**/*.c', '**/*.h'],
            rust: ['**/*.rs'],
            go: ['**/*.go'],
            php: ['**/*.php'],
            ruby: ['**/*.rb'],
            swift: ['**/*.swift'],
            kotlin: ['**/*.kt'],
            scala: ['**/*.scala']
        };

        return typeMap[language] || ['**/*'];
    }
}