# Phase 1: Foundation and Setup (1-2 Weeks)

## Goal
Establish the development environment and a basic extension structure.

## 1. Environment Setup

### 1.1 Install Node.js and npm
- Ensure you have the latest Long-Term Support (LTS) version of Node.js installed
- Download from the official Node.js website
- Verify installation:
  ```bash
  node -v
  npm -v
  ```

### 1.2 Install Yeoman and VS Code Extension Generator
Yeoman (yo) is a scaffolding tool that helps kick-start new projects. The generator-code is a Yeoman generator specifically for creating VS Code extensions.

```bash
npm install -g yo generator-code
```

### 1.3 Generate a New Project
Navigate to the parent directory where you want to create your project and run:

```bash
yo code
```

Follow the interactive prompts:
- **Extension type**: New Extension (TypeScript) - Highly recommended for type safety
- **Extension name**: AI Learning Tool - User-facing name
- **Extension identifier**: ai-learning-tool - Unique internal ID (use kebab-case)
- **Description**: A brief, one-sentence summary of your plugin's purpose
- **Initialize git repository**: Yes
- **Bundle source with webpack**: Yes - Crucial for optimizing performance
- **Package manager**: npm

## 2. "Hello World" Extension

### 2.1 Explore Project Structure
Open the newly created project folder in VS Code and familiarize yourself with:

- **package.json**: Extension manifest (most important configuration file)
  - `name`, `publisher`, `version`: Define extension identity
  - `engines.vscode`: Minimum VS Code version supported
  - `activationEvents`: When to activate extension (crucial for performance)
  - `main`: Points to compiled entry file (e.g., ./dist/extension.js)
  - `contributes`: Declares functionality added to VS Code

- **src/extension.ts**: TypeScript source code for main activation logic
- **tsconfig.json**: TypeScript compilation configuration
- **webpack.config.js**: Webpack bundling configuration

### 2.2 Run and Test Default Extension
1. Press **F5** in VS Code to:
   - Compile TypeScript
   - Start a watcher for changes
   - Launch Extension Development Host

2. In the new window:
   - Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
   - Type "Hello World" and run the command
   - Verify information notification appears

### 2.3 Analyze Core Code

#### Extension Activation (src/extension.ts)
```typescript
import * as vscode from 'vscode';

// Called when one of your activationEvents is triggered
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "ai-plugin" is now active!');

    // Register command - commandId must match package.json
    let disposable = vscode.commands.registerCommand('ai-plugin.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from AI Plugin!');
    });

    // Clean up subscriptions when extension is deactivated
    context.subscriptions.push(disposable);
}

// Called when extension is deactivated
export function deactivate() {}
```

#### Command Configuration (package.json)
```json
{
  "contributes": {
    "commands": [
      {
        "command": "ai-plugin.helloWorld",
        "title": "Hello World"
      }
    ]
  }
}
```

## 3. Version Control

### 3.1 Finalize Git Setup
The yo code generator should have already initialized git. Verify by checking for a `.git` directory.

Review the `.gitignore` file to ensure it includes:
- node_modules
- dist
- out
- *.vsix

### 3.2 Create Initial Commit
```bash
git add .
git commit -m "Initial commit: Scaffold extension with yo code"
```

### 3.3 Create Remote Repository
1. Create a new, empty repository on GitHub/GitLab
2. Add remote and push:

```bash
git remote add origin <your-remote-repository-url>
git branch -M main
git push -u origin main
```

## Key Takeaways
- Foundation established with TypeScript for type safety
- Basic extension structure understood
- Version control configured for tracking changes
- Ready to implement AI features in Phase 2

## Next Steps
Proceed to [Phase 2: Core AI Feature Implementation](phase-2-core-ai-features.md)