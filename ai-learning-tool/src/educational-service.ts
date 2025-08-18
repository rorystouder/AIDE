import * as vscode from 'vscode';
import { getAiCompletion, AIRequestOptions } from './ai-service';
import { AnalyticsService } from './analytics-service';

export interface LearningStep {
    stepNumber: number;
    title: string;
    description: string;
    code: string;
    explanation: string;
    concepts: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tips?: string[];
    commonMistakes?: string[];
}

export interface EducationalProject {
    title: string;
    description: string;
    language: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: string;
    prerequisites: string[];
    learningObjectives: string[];
    steps: LearningStep[];
    finalCode: string;
    extensions: string[]; // Ideas for extending the project
}

export interface NoCodeInput {
    description: string;
    preferredLanguage?: string;
    experienceLevel: 'complete-beginner' | 'some-basics' | 'intermediate';
    learningGoals: string[];
    projectType: 'web-app' | 'desktop-app' | 'script' | 'game' | 'data-analysis' | 'other';
}

export class EducationalService {
    private static instance: EducationalService;
    private analyticsService: AnalyticsService;

    constructor() {
        this.analyticsService = AnalyticsService.getInstance();
    }

    public static getInstance(): EducationalService {
        if (!EducationalService.instance) {
            EducationalService.instance = new EducationalService();
        }
        return EducationalService.instance;
    }

    /**
     * Convert natural language description to a structured educational project
     */
    async createEducationalProject(input: NoCodeInput): Promise<EducationalProject> {
        const prompt = this.buildEducationalPrompt(input);
        
        const options: AIRequestOptions = {
            useCache: false, // Always generate fresh educational content
            includeContext: false,
            maxTokens: 4000,
            temperature: 0.3 // Balanced creativity for educational content
        };

        try {
            const response = await getAiCompletion(prompt, options);
            const project = JSON.parse(response);
            return project;
        } catch (error) {
            console.error('Educational project creation failed:', error);
            throw new Error('Failed to create educational project. Please try again with a simpler description.');
        }
    }

    /**
     * Generate step-by-step code explanation for existing code
     */
    async explainCodeStepByStep(code: string, language: string, userLevel: string = 'beginner'): Promise<{
        overview: string;
        steps: Array<{
            lineNumbers: string;
            code: string;
            explanation: string;
            concepts: string[];
            difficulty: string;
        }>;
        keyTakeaways: string[];
        nextSteps: string[];
    }> {
        const prompt = `You are an expert programming teacher. Explain this ${language} code step-by-step for a ${userLevel} programmer.

Break down the code into logical steps, explain each part clearly, and highlight key programming concepts.

Return ONLY a JSON object in this format:
{
  "overview": "Brief overview of what this code does",
  "steps": [
    {
      "lineNumbers": "Lines being explained (e.g., '1-3' or '5')",
      "code": "The specific code segment",
      "explanation": "Clear explanation of what this code does and why",
      "concepts": ["array", "loop", "condition"], 
      "difficulty": "beginner|intermediate|advanced"
    }
  ],
  "keyTakeaways": ["Important concepts the user should remember"],
  "nextSteps": ["Suggestions for what to learn or try next"]
}

Code to explain:
\`\`\`${language}
${code}
\`\`\``;

        const options: AIRequestOptions = {
            useCache: true,
            maxTokens: 3000,
            temperature: 0.2
        };

        try {
            const response = await getAiCompletion(prompt, options);
            return JSON.parse(response);
        } catch (error) {
            console.error('Code explanation failed:', error);
            throw new Error('Failed to explain code. Please try again.');
        }
    }

    /**
     * Interactive code building - user describes what they want, AI suggests next step
     */
    async suggestNextStep(currentCode: string, userGoal: string, language: string): Promise<{
        suggestion: string;
        code: string;
        explanation: string;
        alternatives: Array<{
            approach: string;
            description: string;
            pros: string[];
            cons: string[];
        }>;
        learningTip: string;
    }> {
        const prompt = `You are a coding mentor helping someone build: "${userGoal}"

Current code:
\`\`\`${language}
${currentCode}
\`\`\`

Suggest the next logical step to work towards their goal. Provide the code and explain your reasoning.

Return ONLY a JSON object:
{
  "suggestion": "What to do next (brief description)",
  "code": "The code to add/modify",
  "explanation": "Why this is the next logical step and how it works",
  "alternatives": [
    {
      "approach": "Alternative approach name",
      "description": "How this alternative would work", 
      "pros": ["Advantages of this approach"],
      "cons": ["Potential drawbacks"]
    }
  ],
  "learningTip": "A helpful tip or concept to remember"
}`;

        const options: AIRequestOptions = {
            useCache: false,
            maxTokens: 2000,
            temperature: 0.4
        };

        try {
            const response = await getAiCompletion(prompt, options);
            return JSON.parse(response);
        } catch (error) {
            console.error('Next step suggestion failed:', error);
            throw new Error('Failed to suggest next step. Please try again.');
        }
    }

    /**
     * Generate beginner-friendly project ideas based on interests
     */
    async generateProjectIdeas(interests: string[], experienceLevel: string): Promise<Array<{
        title: string;
        description: string;
        language: string;
        difficulty: string;
        timeEstimate: string;
        keySkills: string[];
        funFactor: number; // 1-10
        practicalUse: string;
    }>> {
        const prompt = `Generate 5 beginner-friendly coding project ideas for someone interested in: ${interests.join(', ')}

Experience level: ${experienceLevel}

Each project should be engaging, educational, and achievable. Focus on practical applications they can actually use.

Return ONLY a JSON array:
[{
  "title": "Project name",
  "description": "What the project does and why it's useful",
  "language": "Recommended programming language",
  "difficulty": "beginner|intermediate",
  "timeEstimate": "How long it might take (e.g., '2-3 hours')",
  "keySkills": ["Skills they'll learn"],
  "funFactor": 8,
  "practicalUse": "How they could actually use this project"
}]`;

        const options: AIRequestOptions = {
            useCache: true,
            maxTokens: 2500,
            temperature: 0.6 // Higher creativity for project ideas
        };

        try {
            const response = await getAiCompletion(prompt, options);
            const projects = JSON.parse(response);
            return Array.isArray(projects) ? projects : [];
        } catch (error) {
            console.error('Project idea generation failed:', error);
            return [];
        }
    }

    /**
     * Debug code with educational explanations
     */
    async debugWithExplanation(code: string, error: string, language: string): Promise<{
        problem: string;
        solution: string;
        fixedCode: string;
        explanation: string;
        preventionTips: string[];
        relatedConcepts: string[];
        commonVariations: string[];
    }> {
        const prompt = `You are a patient coding teacher helping debug this ${language} code.

Code:
\`\`\`${language}
${code}
\`\`\`

Error: ${error}

Help fix this error while teaching the underlying concepts.

Return ONLY a JSON object:
{
  "problem": "Clear explanation of what's wrong",
  "solution": "Step-by-step solution approach",
  "fixedCode": "The corrected code",
  "explanation": "Why the fix works and what was causing the error",
  "preventionTips": ["How to avoid this error in the future"],
  "relatedConcepts": ["Programming concepts related to this error"],
  "commonVariations": ["Other common forms of this same error type"]
}`;

        const options: AIRequestOptions = {
            useCache: true,
            maxTokens: 2000,
            temperature: 0.2
        };

        try {
            const response = await getAiCompletion(prompt, options);
            return JSON.parse(response);
        } catch (error) {
            console.error('Debug explanation failed:', error);
            throw new Error('Failed to debug code. Please try again.');
        }
    }

    /**
     * Create custom prompt templates for specific learning scenarios
     */
    createCustomPromptTemplate(scenario: string, userLevel: string, language: string): string {
        const templates = {
            'explain-concept': `Explain the concept of "${scenario}" in ${language} programming for a ${userLevel} programmer. Include:
1. A simple definition
2. Why it's important
3. A basic example
4. Common use cases
5. What to learn next`,

            'build-feature': `Help me build "${scenario}" in ${language}. I'm a ${userLevel} programmer. Please:
1. Break it down into small steps
2. Explain each part as we go
3. Show alternatives when relevant
4. Highlight important concepts
5. Suggest improvements`,

            'optimize-code': `Help me optimize this ${language} code: "${scenario}". I'm a ${userLevel} programmer. Please:
1. Identify performance issues
2. Suggest improvements with explanations
3. Show before/after comparisons
4. Explain the optimization techniques
5. Discuss trade-offs`,

            'learn-framework': `Teach me how to use ${scenario} with ${language}. I'm a ${userLevel} programmer. Please:
1. Start with the basics
2. Show practical examples
3. Explain key concepts
4. Provide a learning roadmap
5. Suggest practice projects`
        };

        return templates[scenario as keyof typeof templates] || 
               `Help me understand "${scenario}" in ${language} programming. I'm a ${userLevel} programmer.`;
    }

    /**
     * Build the main educational prompt for project creation
     */
    private buildEducationalPrompt(input: NoCodeInput): string {
        return `You are an expert programming educator. Create a comprehensive learning project based on this request:

**What they want to build:** ${input.description}
**Experience level:** ${input.experienceLevel}
**Preferred language:** ${input.preferredLanguage || 'any suitable language'}
**Project type:** ${input.projectType}
**Learning goals:** ${input.learningGoals.join(', ')}

Create a structured educational project that teaches programming concepts while building something useful.

Return ONLY a JSON object in this exact format:
{
  "title": "Engaging project title",
  "description": "What the final project will do and why it's useful",
  "language": "Best programming language for this project",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedTime": "Realistic time estimate (e.g., '3-4 hours')",
  "prerequisites": ["What they should know before starting"],
  "learningObjectives": ["What they'll learn by completing this"],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "description": "What we're doing in this step",
      "code": "The code for this step",
      "explanation": "Detailed explanation of the code and concepts",
      "concepts": ["array", "function", "loop"],
      "difficulty": "beginner",
      "tips": ["Helpful tips for this step"],
      "commonMistakes": ["What beginners often get wrong here"]
    }
  ],
  "finalCode": "Complete working code",
  "extensions": ["Ideas for extending/improving the project"]
}

Focus on:
- Clear, beginner-friendly explanations
- Practical, working code
- Progressive complexity
- Real-world applications
- Encouraging tone`;
    }

    dispose(): void {
        // Cleanup if needed
    }
}