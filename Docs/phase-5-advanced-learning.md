# Phase 5: Advanced Learning and Teaching Features (4-8 Weeks)
<!-- PHASE: 5, TITLE: Advanced Learning Features, DURATION: 4-8 Weeks, GOAL: Transform the plugin into an interactive learning tool. -->

## Goal
Transform the plugin into an interactive learning tool with AI-driven code analysis, structured tutorials, and adaptive learning features.

## 1. Real-Time Code Quality Analysis (AI Linter)
<!-- STEP: 5.1, TASK: Provide real-time, AI-driven feedback on code quality, security, and performance. -->

### Concept
The plugin will analyze code as the user types and provide inline warnings and suggestions for improvement, complete with "Quick Fix" actions.

### 1.1 Implement the Diagnostic Collection
<!-- SUB_STEP: 5.1.1, DETAIL: Set up the core mechanism for displaying problems in the editor. -->

Create a diagnostic collection and set up event listeners:

```typescript
// In your activate function
const diagnosticCollection = vscode.languages.createDiagnosticCollection('aiLinter');
context.subscriptions.push(diagnosticCollection);

// Set up event listeners for document changes
context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) updateDiagnostics(editor.document, diagnosticCollection);
    })
);

context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
        updateDiagnostics(document, diagnosticCollection);
    })
);
```

### 1.2 Develop the AI Analysis Function
<!-- SUB_STEP: 5.1.2, DETAIL: Create a function to get structured code review feedback from the AI. -->

In `ai-service.ts`, create a new function for code review:

```typescript
export async function getAiCodeReview(code: string): Promise<CodeIssue[]> {
    const prompt = `You are an expert code reviewer. Analyze the following code. 
    Identify any issues related to performance, security, or best practices. 
    For each issue, provide a concise message, the starting and ending line numbers, 
    and a unique error code. 
    Respond ONLY with a JSON array of objects in the format: 
    [{ "startLine": number, "endLine": number, "message": string, "errorCode": string, "severity": "error"|"warning"|"info" }]
    
    Code to review:
    ${code}`;

    const response = await getAiCompletion(prompt);
    
    try {
        return JSON.parse(response);
    } catch (error) {
        console.error('Failed to parse AI response:', error);
        return [];
    }
}
```

### 1.3 Create and Display Diagnostics
<!-- SUB_STEP: 5.1.3, DETAIL: Convert AI feedback into Diagnostic objects and display them. -->

Complete implementation with debouncing and error handling:

```typescript
// src/aiLinter.ts
import * as vscode from 'vscode';
import { getAiCodeReview } from './ai-service';

export function setupAiLinter(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('aiLinter');
    context.subscriptions.push(diagnosticCollection);
    
    let debounceTimer: NodeJS.Timeout | undefined;

    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
    }
    
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) updateDiagnostics(editor.document, diagnosticCollection);
        })
    );
    
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            // Debounce to avoid excessive API calls
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            
            debounceTimer = setTimeout(() => {
                if (vscode.window.activeTextEditor?.document === event.document) {
                    updateDiagnostics(event.document, diagnosticCollection);
                }
            }, 2000); // Wait 2 seconds after user stops typing
        })
    );
}

async function updateDiagnostics(
    document: vscode.TextDocument, 
    collection: vscode.DiagnosticCollection
): Promise<void> {
    // Only analyze supported languages
    const supportedLanguages = ['javascript', 'typescript', 'python', 'java'];
    if (!supportedLanguages.includes(document.languageId)) {
        collection.clear();
        return;
    }

    const reviewIssues = await getAiCodeReview(document.getText());
    
    if (reviewIssues && reviewIssues.length > 0) {
        const diagnostics = reviewIssues.map(issue => {
            const range = new vscode.Range(
                new vscode.Position(issue.startLine - 1, 0),
                new vscode.Position(issue.endLine - 1, Number.MAX_VALUE)
            );
            
            const severity = issue.severity === 'error' 
                ? vscode.DiagnosticSeverity.Error
                : issue.severity === 'warning'
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Information;
            
            const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
            diagnostic.source = 'AI Linter';
            diagnostic.code = issue.errorCode;
            
            return diagnostic;
        });
        
        collection.set(document.uri, diagnostics);
    } else {
        collection.clear();
    }
}
```

### 1.4 Add Quick Fix Actions

Implement code actions to fix issues:

```typescript
export class AiQuickFixProvider implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];
        
        // Get diagnostics at the current position
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === 'AI Linter') {
                const action = new vscode.CodeAction(
                    `Fix: ${diagnostic.message}`,
                    vscode.CodeActionKind.QuickFix
                );
                
                action.command = {
                    command: 'ai-plugin.fixIssue',
                    arguments: [document, diagnostic]
                };
                
                action.diagnostics = [diagnostic];
                actions.push(action);
            }
        }
        
        return actions;
    }
}

// Register the provider
vscode.languages.registerCodeActionsProvider(
    { pattern: '**' },
    new AiQuickFixProvider(),
    {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    }
);
```

## 2. Structured Learning Path (Tutorial Mode)
<!-- STEP: 5.2, TASK: Guide users through building projects with step-by-step, AI-powered tutorials. -->

### 2.1 Implement a WebviewViewProvider
<!-- SUB_STEP: 5.2.1, DETAIL: Create a persistent view in the VS Code sidebar. -->

Create a sidebar view for tutorials:

```typescript
// src/tutorialViewProvider.ts
import * as vscode from 'vscode';

export class TutorialViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiPlugin.tutorialView';
    private _view?: vscode.WebviewView;
    private currentStep: number = 0;
    private currentTutorial?: Tutorial;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'selectTutorial':
                    await this.loadTutorial(data.tutorialId);
                    break;
                case 'nextStep':
                    await this.nextStep();
                    break;
                case 'previousStep':
                    await this.previousStep();
                    break;
            }
        });
    }

    private async loadTutorial(tutorialId: string) {
        // Load tutorial data (could be from JSON file or AI-generated)
        this.currentTutorial = await getTutorialById(tutorialId);
        this.currentStep = 0;
        this.updateView();
    }

    private async nextStep() {
        if (this.currentTutorial && this.currentStep < this.currentTutorial.steps.length - 1) {
            this.currentStep++;
            
            // Get AI feedback on current code
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const feedback = await this.getStepFeedback(
                    editor.document.getText(),
                    this.currentTutorial.steps[this.currentStep]
                );
                
                this.updateView(feedback);
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Tutorials</title>
                <style>
                    body { padding: 10px; }
                    .tutorial-card { 
                        border: 1px solid var(--vscode-widget-border);
                        padding: 10px;
                        margin: 10px 0;
                        cursor: pointer;
                    }
                    .tutorial-card:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    .step-content {
                        margin: 20px 0;
                    }
                    .progress-bar {
                        width: 100%;
                        height: 4px;
                        background: var(--vscode-progressBar-background);
                        margin: 10px 0;
                    }
                    .progress-fill {
                        height: 100%;
                        background: var(--vscode-progressBar-foreground);
                        transition: width 0.3s;
                    }
                </style>
            </head>
            <body>
                <div id="tutorial-selection">
                    <h2>Select a Tutorial</h2>
                    <div class="tutorial-card" onclick="selectTutorial('react-todo')">
                        <h3>React To-Do App</h3>
                        <p>Build a complete To-Do application with React</p>
                    </div>
                    <div class="tutorial-card" onclick="selectTutorial('api-rest')">
                        <h3>REST API with Node.js</h3>
                        <p>Create a RESTful API with Express and MongoDB</p>
                    </div>
                </div>
                
                <div id="tutorial-view" style="display:none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress"></div>
                    </div>
                    <h2 id="step-title"></h2>
                    <div id="step-content" class="step-content"></div>
                    <div>
                        <button id="prev-btn" onclick="previousStep()">Previous</button>
                        <button id="next-btn" onclick="nextStep()">Next</button>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function selectTutorial(tutorialId) {
                        vscode.postMessage({ type: 'selectTutorial', tutorialId });
                    }
                    
                    function nextStep() {
                        vscode.postMessage({ type: 'nextStep' });
                    }
                    
                    function previousStep() {
                        vscode.postMessage({ type: 'previousStep' });
                    }
                </script>
            </body>
            </html>`;
    }
}
```

### 2.2 Design the Tutorial UI
<!-- SUB_STEP: 5.2.2, DETAIL: Build the HTML and JavaScript for the tutorial interface. -->

Register the view in `package.json`:

```json
{
    "contributes": {
        "views": {
            "aiLearning": [
                {
                    "id": "aiPlugin.tutorialView",
                    "name": "AI Tutorials",
                    "icon": "$(book)",
                    "contextualTitle": "AI Learning Path"
                }
            ]
        },
        "viewsContainers": {
            "activitybar": [
                {
                    "id": "aiLearning",
                    "title": "AI Learning",
                    "icon": "resources/learning-icon.svg"
                }
            ]
        }
    }
}
```

### 2.3 Orchestrate the Tutorial Flow
<!-- SUB_STEP: 5.2.3, DETAIL: Manage the state and progression of the tutorial. -->

Create tutorial management system:

```typescript
interface Tutorial {
    id: string;
    title: string;
    description: string;
    steps: TutorialStep[];
    prerequisites: string[];
}

interface TutorialStep {
    title: string;
    instruction: string;
    codeTemplate?: string;
    validation?: string;
    hints: string[];
}

class TutorialManager {
    private tutorials: Map<string, Tutorial> = new Map();
    
    async loadTutorials() {
        // Load from JSON files or generate with AI
        const tutorialsPath = path.join(this.extensionPath, 'tutorials');
        const files = await fs.readdir(tutorialsPath);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = await fs.readFile(path.join(tutorialsPath, file), 'utf8');
                const tutorial = JSON.parse(content) as Tutorial;
                this.tutorials.set(tutorial.id, tutorial);
            }
        }
    }
    
    async validateStep(code: string, step: TutorialStep): Promise<ValidationResult> {
        // Use AI to validate if the user's code meets the step requirements
        const prompt = `
            Check if the following code satisfies these requirements:
            ${step.validation}
            
            Code:
            ${code}
            
            Respond with JSON: { "passed": boolean, "feedback": string, "suggestions": string[] }
        `;
        
        const response = await getAiCompletion(prompt);
        return JSON.parse(response);
    }
}
```

## 3. User Progress Tracking and Adaptive Learning
<!-- STEP: 5.3, TASK: Track user progress to offer personalized feedback and adapt content difficulty. -->

### 3.1 Utilize VS Code's State Storage
<!-- SUB_STEP: 5.3.1, DETAIL: Use globalState and workspaceState for persistent data storage. -->

Implement progress tracking:

```typescript
class ProgressTracker {
    constructor(private context: vscode.ExtensionContext) {}
    
    // Track completed tutorials and steps
    async markStepComplete(tutorialId: string, stepIndex: number) {
        const key = `tutorial.${tutorialId}.progress`;
        const progress = this.context.globalState.get<number[]>(key, []);
        
        if (!progress.includes(stepIndex)) {
            progress.push(stepIndex);
            await this.context.globalState.update(key, progress);
        }
        
        // Update user skill level
        await this.updateSkillLevel(tutorialId);
    }
    
    // Get user's current skill level
    getSkillLevel(): string {
        return this.context.globalState.get<string>('userSkillLevel', 'beginner');
    }
    
    // Update skill level based on completed tutorials
    private async updateSkillLevel(completedTutorialId: string) {
        const completedTutorials = this.context.globalState.get<string[]>('completedTutorials', []);
        
        if (!completedTutorials.includes(completedTutorialId)) {
            completedTutorials.push(completedTutorialId);
            await this.context.globalState.update('completedTutorials', completedTutorials);
        }
        
        // Determine skill level based on number of completed tutorials
        let skillLevel = 'beginner';
        if (completedTutorials.length >= 10) {
            skillLevel = 'advanced';
        } else if (completedTutorials.length >= 5) {
            skillLevel = 'intermediate';
        }
        
        await this.context.globalState.update('userSkillLevel', skillLevel);
    }
    
    // Get personalized recommendations
    async getRecommendations(): Promise<Tutorial[]> {
        const skillLevel = this.getSkillLevel();
        const completedTutorials = this.context.globalState.get<string[]>('completedTutorials', []);
        
        // Use AI to recommend next tutorials
        const prompt = `
            User skill level: ${skillLevel}
            Completed tutorials: ${completedTutorials.join(', ')}
            
            Recommend 3 tutorials that would be appropriate next steps.
            Consider progression in difficulty and building on learned concepts.
        `;
        
        const recommendations = await getAiCompletion(prompt);
        return JSON.parse(recommendations);
    }
}
```

### 3.2 Implement Adaptive Logic
<!-- SUB_STEP: 5.3.2, DETAIL: Modify AI prompts based on the user's stored progress. -->

Create adaptive AI responses:

```typescript
// Example of adaptive AI explanation
async function getAdaptiveAiExplanation(
    context: vscode.ExtensionContext, 
    codeSnippet: string
): Promise<string> {
    const tracker = new ProgressTracker(context);
    const skillLevel = tracker.getSkillLevel();
    const completedSteps = context.globalState.get<string[]>('completedTutorialSteps', []);
    
    const userProfile = `
        User skill level: ${skillLevel}
        Completed tutorial steps: ${completedSteps.length}
        Learning style: ${context.globalState.get('learningStyle', 'visual')}
    `;
    
    const prompt = `
        ${userProfile}
        
        Explain this code snippet appropriately for a user with this background.
        ${skillLevel === 'beginner' ? 'Use simple terms and provide detailed explanations.' : ''}
        ${skillLevel === 'advanced' ? 'Focus on advanced concepts and performance implications.' : ''}
        
        Code:
        ${codeSnippet}
    `;
    
    return await getAiCompletion(prompt);
}
```

### 3.3 Build the Progress Tracking Mechanism
<!-- SUB_STEP: 5.3.3, DETAIL: Write the code to update the user's state. -->

Integrate progress tracking throughout the extension:

```typescript
// Track command usage
vscode.commands.registerCommand('ai-plugin.generateCode', async () => {
    const tracker = new ProgressTracker(context);
    
    // Track feature usage
    const usageCount = context.globalState.get<number>('generateCode.usageCount', 0);
    await context.globalState.update('generateCode.usageCount', usageCount + 1);
    
    // Provide tips based on usage patterns
    if (usageCount === 5) {
        vscode.window.showInformationMessage(
            'Tip: You can use Ctrl+Shift+G to quickly generate code!',
            'Got it',
            'Show more tips'
        ).then(selection => {
            if (selection === 'Show more tips') {
                vscode.commands.executeCommand('ai-plugin.showTips');
            }
        });
    }
    
    // Rest of the command implementation...
});

// Gamification elements
class AchievementSystem {
    private achievements = [
        { id: 'first_generation', name: 'First Steps', description: 'Generated your first code snippet' },
        { id: 'tutorial_complete', name: 'Tutorial Master', description: 'Completed your first tutorial' },
        { id: 'streak_7', name: 'Consistent Learner', description: 'Used the plugin 7 days in a row' },
        { id: 'helper_100', name: 'Code Wizard', description: 'Generated 100 code snippets' }
    ];
    
    async checkAchievements(context: vscode.ExtensionContext) {
        const unlockedAchievements = context.globalState.get<string[]>('achievements', []);
        
        for (const achievement of this.achievements) {
            if (!unlockedAchievements.includes(achievement.id)) {
                const unlocked = await this.checkAchievementCriteria(achievement.id, context);
                
                if (unlocked) {
                    unlockedAchievements.push(achievement.id);
                    await context.globalState.update('achievements', unlockedAchievements);
                    
                    // Show notification
                    vscode.window.showInformationMessage(
                        `🏆 Achievement Unlocked: ${achievement.name} - ${achievement.description}`
                    );
                }
            }
        }
    }
    
    private async checkAchievementCriteria(
        achievementId: string, 
        context: vscode.ExtensionContext
    ): Promise<boolean> {
        switch (achievementId) {
            case 'first_generation':
                return context.globalState.get<number>('generateCode.usageCount', 0) >= 1;
            case 'helper_100':
                return context.globalState.get<number>('generateCode.usageCount', 0) >= 100;
            // Add more criteria checks...
            default:
                return false;
        }
    }
}
```

## 4. Interactive Learning Dashboard

Create a comprehensive dashboard webview:

```typescript
class LearningDashboard {
    private panel: vscode.WebviewPanel | undefined;
    
    show(context: vscode.ExtensionContext) {
        this.panel = vscode.window.createWebviewPanel(
            'learningDashboard',
            'Learning Dashboard',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        this.panel.webview.html = this.getHtmlContent(context);
    }
    
    private getHtmlContent(context: vscode.ExtensionContext): string {
        const stats = this.gatherStatistics(context);
        
        return `<!DOCTYPE html>
            <html>
            <head>
                <style>
                    .dashboard { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .card { border: 1px solid var(--vscode-widget-border); padding: 15px; }
                    .progress-ring { /* SVG progress ring styles */ }
                    .achievement { display: flex; align-items: center; margin: 10px 0; }
                    .achievement-icon { font-size: 24px; margin-right: 10px; }
                </style>
            </head>
            <body>
                <h1>Your Learning Journey</h1>
                <div class="dashboard">
                    <div class="card">
                        <h2>Progress</h2>
                        <div class="progress-ring">${stats.completionPercentage}%</div>
                        <p>Tutorials Completed: ${stats.tutorialsCompleted}</p>
                        <p>Code Generated: ${stats.codeGenerated} times</p>
                    </div>
                    
                    <div class="card">
                        <h2>Achievements</h2>
                        ${stats.achievements.map(a => `
                            <div class="achievement">
                                <span class="achievement-icon">🏆</span>
                                <span>${a.name}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="card">
                        <h2>Skill Level</h2>
                        <h3>${stats.skillLevel}</h3>
                        <p>Next milestone: ${stats.nextMilestone}</p>
                    </div>
                    
                    <div class="card">
                        <h2>Recommended Next Steps</h2>
                        <ul>
                            ${stats.recommendations.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </body>
            </html>`;
    }
    
    private gatherStatistics(context: vscode.ExtensionContext) {
        return {
            completionPercentage: this.calculateCompletion(context),
            tutorialsCompleted: context.globalState.get('completedTutorials', []).length,
            codeGenerated: context.globalState.get('generateCode.usageCount', 0),
            achievements: context.globalState.get('achievements', []),
            skillLevel: context.globalState.get('userSkillLevel', 'beginner'),
            nextMilestone: this.getNextMilestone(context),
            recommendations: this.getRecommendations(context)
        };
    }
}
```

## Testing and Validation

### Test AI Linter
- Verify diagnostics appear correctly
- Test with various code quality issues
- Ensure quick fixes work properly
- Check debouncing mechanism

### Test Tutorial System
- Verify tutorial loading and progression
- Test step validation
- Check webview communication
- Ensure progress is saved correctly

### Test Adaptive Learning
- Verify skill level updates
- Test personalized recommendations
- Check achievement system
- Ensure analytics tracking works

## Next Steps
Congratulations! You've completed all five phases of the AI-IDE plugin development. Your plugin now includes:

1. ✅ Foundation and basic setup
2. ✅ Core AI integration
3. ✅ Advanced features and UX
4. ✅ Testing and deployment
5. ✅ Interactive learning features

Consider these additional enhancements:
- Integration with popular learning platforms
- Collaborative learning features
- Advanced analytics dashboard
- Multi-language support
- Cloud synchronization of progress