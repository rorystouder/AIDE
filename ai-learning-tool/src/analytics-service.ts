import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface UserCodingPattern {
    namingConvention: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case';
    functionStyle: 'arrow' | 'declaration' | 'expression';
    errorHandling: 'try-catch' | 'promises' | 'async-await';
    importStyle: 'destructured' | 'default' | 'namespace';
    indentationStyle: 'tabs' | 'spaces';
    indentSize: number;
    bracketStyle: 'same-line' | 'new-line';
    preferredLanguages: string[];
    complexityPreference: 'simple' | 'intermediate' | 'advanced';
}

export interface CompletionEvent {
    timestamp: number;
    action: 'accepted' | 'rejected' | 'modified' | 'ignored';
    suggestion: string;
    actualCode: string;
    context: {
        language: string;
        fileType: string;
        lineNumber: number;
        column: number;
        surroundingCode: string;
        suggestionType: 'completion' | 'refactor' | 'fix';
    };
    userModifications?: string;
    timeTaken: number; // milliseconds to accept/reject
}

export interface UsageAnalytics {
    totalCompletions: number;
    acceptanceRate: number;
    averageResponseTime: number;
    preferredSuggestionTypes: Record<string, number>;
    mostUsedLanguages: Record<string, number>;
    peakUsageTimes: Array<{ hour: number; count: number }>;
    codingPatterns: UserCodingPattern;
    improvementAreas: string[];
}

export class AnalyticsService {
    private static instance: AnalyticsService;
    private analyticsData: CompletionEvent[] = [];
    private userPatterns: UserCodingPattern | null = null;
    private analyticsFilePath: string;

    constructor() {
        // Store analytics in extension's global storage
        this.analyticsFilePath = path.join(__dirname, '..', '.analytics', 'user-data.json');
        this.loadAnalyticsData();
        this.analyzeUserPatterns();
    }

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    /**
     * Track a completion event for learning
     */
    trackCompletion(event: CompletionEvent): void {
        this.analyticsData.push(event);
        
        // Keep only last 1000 events to prevent unlimited growth
        if (this.analyticsData.length > 1000) {
            this.analyticsData = this.analyticsData.slice(-1000);
        }
        
        this.saveAnalyticsData();
        this.analyzeUserPatterns(); // Update patterns with new data
    }

    /**
     * Analyze user's coding patterns from their code
     */
    private async analyzeUserPatterns(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        try {
            // Analyze files in the workspace
            const files = await vscode.workspace.findFiles('**/*.{js,ts,py,java,cpp,c}', '**/node_modules/**', 100);
            
            const patterns: Partial<UserCodingPattern> = {
                preferredLanguages: [],
                complexityPreference: 'intermediate'
            };

            const languageCounts: Record<string, number> = {};
            let totalFunctions = 0;
            let arrowFunctions = 0;
            let camelCaseCount = 0;
            let snakeCaseCount = 0;

            for (const file of files.slice(0, 20)) { // Analyze first 20 files
                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();
                const language = document.languageId;

                // Count language usage
                languageCounts[language] = (languageCounts[language] || 0) + 1;

                // Analyze naming conventions
                const camelCaseMatches = text.match(/\b[a-z][a-zA-Z0-9]*\b/g);
                const snakeCaseMatches = text.match(/\b[a-z][a-z0-9_]*_[a-z0-9_]*\b/g);
                
                if (camelCaseMatches) camelCaseCount += camelCaseMatches.length;
                if (snakeCaseMatches) snakeCaseCount += snakeCaseMatches.length;

                // Analyze function styles (JavaScript/TypeScript)
                if (language === 'javascript' || language === 'typescript') {
                    const arrowFunctionMatches = text.match(/\w+\s*=\s*\([^)]*\)\s*=>/g);
                    const declarationMatches = text.match(/function\s+\w+\s*\([^)]*\)/g);
                    
                    if (arrowFunctionMatches) arrowFunctions += arrowFunctionMatches.length;
                    if (declarationMatches) totalFunctions += declarationMatches.length;
                    if (arrowFunctionMatches) totalFunctions += arrowFunctionMatches.length;
                }

                // Analyze indentation
                const lines = text.split('\n');
                let tabCount = 0;
                let spaceCount = 0;
                
                lines.forEach(line => {
                    if (line.startsWith('\t')) tabCount++;
                    else if (line.startsWith('  ')) spaceCount++;
                });

                patterns.indentationStyle = tabCount > spaceCount ? 'tabs' : 'spaces';
            }

            // Determine patterns
            patterns.namingConvention = camelCaseCount > snakeCaseCount ? 'camelCase' : 'snake_case';
            patterns.functionStyle = arrowFunctions > (totalFunctions - arrowFunctions) ? 'arrow' : 'declaration';
            patterns.preferredLanguages = Object.keys(languageCounts)
                .sort((a, b) => languageCounts[b] - languageCounts[a])
                .slice(0, 5);

            // Analyze error handling from completion events
            const recentCompletions = this.analyticsData.slice(-100);
            const trycatches = recentCompletions.filter(e => 
                e.suggestion.includes('try') || e.suggestion.includes('catch')
            ).length;
            const asyncAwaits = recentCompletions.filter(e => 
                e.suggestion.includes('await') || e.suggestion.includes('async')
            ).length;
            
            if (asyncAwaits > trycatches) {
                patterns.errorHandling = 'async-await';
            } else if (trycatches > 0) {
                patterns.errorHandling = 'try-catch';
            } else {
                patterns.errorHandling = 'promises';
            }

            this.userPatterns = patterns as UserCodingPattern;

        } catch (error) {
            console.error('Pattern analysis failed:', error);
        }
    }

    /**
     * Get personalized suggestion based on user patterns
     */
    getPersonalizedPrompt(basePrompt: string, context: any): string {
        if (!this.userPatterns) {
            return basePrompt;
        }

        const preferences = [];

        // Add style preferences
        if (this.userPatterns.namingConvention) {
            preferences.push(`Use ${this.userPatterns.namingConvention} naming convention`);
        }

        if (this.userPatterns.functionStyle === 'arrow') {
            preferences.push('Prefer arrow functions over function declarations');
        }

        if (this.userPatterns.errorHandling === 'async-await') {
            preferences.push('Use async/await for asynchronous operations');
        } else if (this.userPatterns.errorHandling === 'try-catch') {
            preferences.push('Use try/catch blocks for error handling');
        }

        if (this.userPatterns.indentationStyle === 'tabs') {
            preferences.push('Use tabs for indentation');
        } else {
            preferences.push('Use spaces for indentation');
        }

        const personalizedPrefix = preferences.length > 0 
            ? `Code Style Preferences: ${preferences.join(', ')}.\n\n`
            : '';

        return personalizedPrefix + basePrompt;
    }

    /**
     * Get usage analytics summary
     */
    getUsageAnalytics(): UsageAnalytics {
        const totalCompletions = this.analyticsData.length;
        const accepted = this.analyticsData.filter(e => e.action === 'accepted').length;
        const acceptanceRate = totalCompletions > 0 ? accepted / totalCompletions : 0;

        const responseTimes = this.analyticsData.map(e => e.timeTaken).filter(t => t > 0);
        const averageResponseTime = responseTimes.length > 0 
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
            : 0;

        // Analyze suggestion types
        const suggestionTypes: Record<string, number> = {};
        const languages: Record<string, number> = {};
        const hourlyUsage: Record<number, number> = {};

        this.analyticsData.forEach(event => {
            const type = event.context.suggestionType;
            suggestionTypes[type] = (suggestionTypes[type] || 0) + 1;

            const lang = event.context.language;
            languages[lang] = (languages[lang] || 0) + 1;

            const hour = new Date(event.timestamp).getHours();
            hourlyUsage[hour] = (hourlyUsage[hour] || 0) + 1;
        });

        const peakUsageTimes = Object.entries(hourlyUsage)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => b.count - a.count);

        return {
            totalCompletions,
            acceptanceRate,
            averageResponseTime,
            preferredSuggestionTypes: suggestionTypes,
            mostUsedLanguages: languages,
            peakUsageTimes,
            codingPatterns: this.userPatterns || {} as UserCodingPattern,
            improvementAreas: this.identifyImprovementAreas()
        };
    }

    /**
     * Identify areas where user might benefit from improvement
     */
    private identifyImprovementAreas(): string[] {
        const areas: string[] = [];
        const recentEvents = this.analyticsData.slice(-50);
        
        if (recentEvents.length === 0) return areas;

        // Check rejection rate
        const rejectionRate = recentEvents.filter(e => e.action === 'rejected').length / recentEvents.length;
        if (rejectionRate > 0.5) {
            areas.push('Consider adjusting AI suggestion settings - high rejection rate detected');
        }

        // Check modification rate
        const modificationRate = recentEvents.filter(e => e.action === 'modified').length / recentEvents.length;
        if (modificationRate > 0.3) {
            areas.push('AI suggestions often need modification - consider providing more context');
        }

        // Check response time
        const avgResponseTime = recentEvents
            .map(e => e.timeTaken)
            .filter(t => t > 0)
            .reduce((a, b) => a + b, 0) / recentEvents.length;
            
        if (avgResponseTime > 5000) {
            areas.push('Slow response times detected - consider using a local AI model');
        }

        return areas;
    }

    /**
     * Load analytics data from storage
     */
    private loadAnalyticsData(): void {
        try {
            if (fs.existsSync(this.analyticsFilePath)) {
                const data = fs.readFileSync(this.analyticsFilePath, 'utf8');
                const parsed = JSON.parse(data);
                this.analyticsData = parsed.events || [];
                this.userPatterns = parsed.patterns || null;
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            this.analyticsData = [];
        }
    }

    /**
     * Save analytics data to storage
     */
    private saveAnalyticsData(): void {
        try {
            // Create directory if it doesn't exist
            const dir = path.dirname(this.analyticsFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const data = {
                events: this.analyticsData,
                patterns: this.userPatterns,
                lastUpdated: Date.now()
            };

            fs.writeFileSync(this.analyticsFilePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save analytics data:', error);
        }
    }

    /**
     * Clear all analytics data (for privacy)
     */
    clearAnalyticsData(): void {
        this.analyticsData = [];
        this.userPatterns = null;
        
        try {
            if (fs.existsSync(this.analyticsFilePath)) {
                fs.unlinkSync(this.analyticsFilePath);
            }
        } catch (error) {
            console.error('Failed to clear analytics data:', error);
        }
    }

    dispose(): void {
        this.saveAnalyticsData();
    }
}