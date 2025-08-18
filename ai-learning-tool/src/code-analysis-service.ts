import * as vscode from 'vscode';
import { getAiCompletion, AIRequestOptions } from './ai-service';

export interface CodeIssue {
    type: 'performance' | 'security' | 'maintainability' | 'style';
    severity: 'error' | 'warning' | 'info' | 'suggestion';
    message: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    suggestion?: string;
    autoFixAvailable?: boolean;
}

export interface RefactoringOpportunity {
    type: 'extract_function' | 'optimize_loop' | 'async_refactor' | 'security_fix';
    description: string;
    line: number;
    endLine: number;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    suggestedCode?: string;
}

export class CodeAnalysisService {
    private static instance: CodeAnalysisService;

    public static getInstance(): CodeAnalysisService {
        if (!CodeAnalysisService.instance) {
            CodeAnalysisService.instance = new CodeAnalysisService();
        }
        return CodeAnalysisService.instance;
    }

    /**
     * Analyze code for performance, security, and maintainability issues
     */
    async analyzeCode(code: string, language: string): Promise<CodeIssue[]> {
        const prompt = `As an expert code analyst, analyze the following ${language} code for issues.

Focus on:
1. Performance bottlenecks (O(n²) algorithms, memory leaks, synchronous operations)
2. Security vulnerabilities (SQL injection, XSS, hardcoded secrets)
3. Maintainability issues (code duplication, complex functions, poor naming)
4. Style and best practices

Return ONLY a JSON array of issues in this format:
[{
  "type": "performance|security|maintainability|style",
  "severity": "error|warning|info|suggestion", 
  "message": "Clear description of the issue",
  "line": number,
  "column": number,
  "suggestion": "How to fix it (optional)"
}]

Code to analyze:
\`\`\`${language}
${code}
\`\`\``;

        const options: AIRequestOptions = {
            useCache: true,
            includeContext: false,
            maxTokens: 2000,
            temperature: 0.2 // Lower temperature for consistent analysis
        };

        try {
            const response = await getAiCompletion(prompt, options);
            const issues = JSON.parse(response);
            return Array.isArray(issues) ? issues : [];
        } catch (error) {
            console.error('Code analysis failed:', error);
            return [];
        }
    }

    /**
     * Find refactoring opportunities in the code
     */
    async findRefactoringOpportunities(code: string, language: string): Promise<RefactoringOpportunity[]> {
        const prompt = `As a refactoring expert, identify improvement opportunities in this ${language} code.

Look for:
1. Functions that can be extracted from large methods
2. Loops that can be optimized (use map/filter instead of for loops)
3. Synchronous code that should be asynchronous
4. Security improvements (parameterized queries, input validation)
5. Code duplication that can be eliminated

Return ONLY a JSON array in this format:
[{
  "type": "extract_function|optimize_loop|async_refactor|security_fix",
  "description": "What should be refactored",
  "line": number,
  "endLine": number,
  "effort": "low|medium|high",
  "impact": "low|medium|high",
  "suggestedCode": "Improved code snippet (optional)"
}]

Code:
\`\`\`${language}
${code}
\`\`\``;

        const options: AIRequestOptions = {
            useCache: true,
            maxTokens: 2500,
            temperature: 0.3
        };

        try {
            const response = await getAiCompletion(prompt, options);
            const opportunities = JSON.parse(response);
            return Array.isArray(opportunities) ? opportunities : [];
        } catch (error) {
            console.error('Refactoring analysis failed:', error);
            return [];
        }
    }

    /**
     * Generate performance optimization suggestions
     */
    async analyzePerformance(code: string, language: string): Promise<{
        score: number;
        bottlenecks: Array<{
            description: string;
            line: number;
            severity: 'high' | 'medium' | 'low';
            optimization: string;
        }>;
        memoryUsage: {
            potential_leaks: string[];
            optimization_tips: string[];
        };
    }> {
        const prompt = `Analyze this ${language} code for performance issues and provide a performance score (0-100).

Identify:
1. Algorithm complexity issues (nested loops, inefficient searches)
2. Memory usage problems (potential leaks, large object creation)
3. Synchronous operations that block the event loop
4. Inefficient data structures or operations

Return ONLY a JSON object in this format:
{
  "score": number (0-100, where 100 is optimal),
  "bottlenecks": [
    {
      "description": "What's causing the bottleneck",
      "line": number,
      "severity": "high|medium|low",
      "optimization": "How to fix it"
    }
  ],
  "memoryUsage": {
    "potential_leaks": ["Description of potential memory leaks"],
    "optimization_tips": ["Memory optimization suggestions"]
  }
}

Code:
\`\`\`${language}
${code}
\`\`\``;

        const options: AIRequestOptions = {
            useCache: true,
            maxTokens: 2000,
            temperature: 0.2
        };

        try {
            const response = await getAiCompletion(prompt, options);
            return JSON.parse(response);
        } catch (error) {
            console.error('Performance analysis failed:', error);
            return {
                score: 75,
                bottlenecks: [],
                memoryUsage: { potential_leaks: [], optimization_tips: [] }
            };
        }
    }

    /**
     * Security vulnerability analysis
     */
    async analyzeSecurity(code: string, language: string): Promise<{
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        vulnerabilities: Array<{
            type: string;
            description: string;
            line: number;
            severity: 'low' | 'medium' | 'high' | 'critical';
            fix: string;
            cwe?: string; // Common Weakness Enumeration ID
        }>;
        recommendations: string[];
    }> {
        const prompt = `Perform a security analysis on this ${language} code.

Check for:
1. SQL injection vulnerabilities
2. XSS (Cross-Site Scripting) risks
3. Hardcoded secrets or credentials
4. Insecure authentication/authorization
5. Input validation issues
6. Cryptographic weaknesses
7. Path traversal vulnerabilities

Return ONLY a JSON object:
{
  "riskLevel": "low|medium|high|critical",
  "vulnerabilities": [
    {
      "type": "SQL Injection|XSS|Hardcoded Secret|etc",
      "description": "Detailed description of the vulnerability",
      "line": number,
      "severity": "low|medium|high|critical",
      "fix": "How to remediate this vulnerability",
      "cwe": "CWE-XXX (if applicable)"
    }
  ],
  "recommendations": ["General security improvement suggestions"]
}

Code:
\`\`\`${language}
${code}
\`\`\``;

        const options: AIRequestOptions = {
            useCache: true,
            maxTokens: 2500,
            temperature: 0.1 // Very low temperature for security analysis
        };

        try {
            const response = await getAiCompletion(prompt, options);
            return JSON.parse(response);
        } catch (error) {
            console.error('Security analysis failed:', error);
            return {
                riskLevel: 'low',
                vulnerabilities: [],
                recommendations: []
            };
        }
    }

    /**
     * Generate code improvement suggestions with before/after examples
     */
    async generateImprovementSuggestions(code: string, language: string): Promise<Array<{
        title: string;
        description: string;
        category: 'performance' | 'readability' | 'maintainability' | 'security';
        before: string;
        after: string;
        explanation: string;
    }>> {
        const prompt = `As a senior developer, suggest specific code improvements for this ${language} code.

Provide 3-5 concrete improvements with before/after examples.

Return ONLY a JSON array:
[{
  "title": "Brief improvement title",
  "description": "What this improvement does",
  "category": "performance|readability|maintainability|security",
  "before": "Original code snippet",
  "after": "Improved code snippet", 
  "explanation": "Why this improvement is better"
}]

Code:
\`\`\`${language}
${code}
\`\`\``;

        const options: AIRequestOptions = {
            useCache: true,
            maxTokens: 3000,
            temperature: 0.4
        };

        try {
            const response = await getAiCompletion(prompt, options);
            const suggestions = JSON.parse(response);
            return Array.isArray(suggestions) ? suggestions : [];
        } catch (error) {
            console.error('Improvement suggestions failed:', error);
            return [];
        }
    }

    dispose() {
        // Cleanup if needed
    }
}