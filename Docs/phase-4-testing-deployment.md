# Phase 4: Testing, Deployment, and Maintenance (2-3 Weeks)
<!-- PHASE: 4, TITLE: Testing and Deployment, DURATION: 2-3 Weeks, GOAL: Ensure the plugin is robust, published, and maintained. -->

## Goal
Ensure the plugin is robust, published, and maintained.

## 1. Testing
<!-- STEP: 4.1, TASK: Write unit and integration tests. -->

### 1.1 Understand the Testing Setup
<!-- SUB_STEP: 4.1.1, DETAIL: Review the testing framework provided by the generator. -->

The `yo code` generator creates a `src/test` directory with:

- **src/test/runTest.ts**: Downloads a stable VS Code version, unzips it, and runs tests within that instance for a clean, predictable testing environment
- **src/test/suite/extension.test.ts**: Where your test cases (test suite) live, using the Mocha testing framework

### 1.2 Write Unit Tests
<!-- SUB_STEP: 4.1.2, DETAIL: Test individual functions in isolation. -->

Unit tests are for small, isolated pieces of logic that don't depend on the VS Code API.

Install mocking library:
```bash
npm install --save-dev sinon @types/sinon
```

Example unit test for helper functions:
```typescript
// src/test/suite/helpers.test.ts
import * as assert from 'assert';
import * as sinon from 'sinon';
import { formatPrompt, validateApiKey } from '../../helpers';

suite('Helper Functions Test Suite', () => {
    test('formatPrompt should combine context and query', () => {
        const context = 'const x = 5;';
        const query = 'explain this code';
        const result = formatPrompt(context, query);
        assert.ok(result.includes(context));
        assert.ok(result.includes(query));
    });

    test('validateApiKey should reject invalid keys', () => {
        assert.strictEqual(validateApiKey(''), false);
        assert.strictEqual(validateApiKey('sk-valid-key-format'), true);
    });
});
```

### 1.3 Write Integration Tests
<!-- SUB_STEP: 4.1.3, DETAIL: Test functionality that interacts with the VS Code API. -->

Integration tests run inside the special VS Code instance and can access the full `vscode` API:

```typescript
// src/test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    });

    test('Should execute helloWorld command', async () => {
        // Ensures command is registered correctly in package.json and extension.ts
        await vscode.commands.executeCommand('ai-plugin.helloWorld');
        // In a real test, use a spy/mock to verify showInformationMessage was called
        assert.ok(true, "Command executed without throwing an error");
    });

    test('Should register completion provider', () => {
        const registeredProviders = vscode.languages.getLanguages();
        // Verify your language providers are registered
        assert.ok(registeredProviders.length > 0);
    });

    test('Should create webview panel', async () => {
        await vscode.commands.executeCommand('ai-plugin.openChat');
        // Check that webview panel was created
        const panels = vscode.window.tabGroups.all
            .flatMap(group => group.tabs)
            .filter(tab => tab.label === 'AI Chat');
        assert.ok(panels.length > 0, 'Webview panel should be created');
    });
});
```

### 1.4 Run the Tests
<!-- SUB_STEP: 4.1.4, DETAIL: Execute the tests using the VS Code debugger. -->

1. Open the "Run and Debug" view in VS Code (bug icon in sidebar)
2. Select "Extension Tests" from the dropdown menu
3. Press F5 to start the test runner
4. A new VS Code window appears and tests run automatically
5. Results display in the Debug Console

### 1.5 Advanced Testing Strategies

#### Mock the AI Service
```typescript
// src/test/suite/ai-service.test.ts
import * as sinon from 'sinon';
import * as aiService from '../../ai-service';

suite('AI Service Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Should handle API errors gracefully', async () => {
        // Mock the axios call to simulate an error
        const stub = sandbox.stub(aiService, 'getAiCompletion');
        stub.rejects(new Error('API Error'));

        try {
            await aiService.getAiCompletion('test prompt');
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.ok(error);
        }
    });
});
```

#### Test Webview Communication
```typescript
test('Webview should handle messages', async () => {
    const panel = vscode.window.createWebviewPanel(
        'test',
        'Test Panel',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    // Set up message listener
    const messagePromise = new Promise((resolve) => {
        panel.webview.onDidReceiveMessage(message => {
            resolve(message);
        });
    });

    // Send a message to the webview
    panel.webview.html = `
        <script>
            const vscode = acquireVsCodeApi();
            vscode.postMessage({ command: 'test', data: 'hello' });
        </script>
    `;

    const message = await messagePromise;
    assert.strictEqual(message.command, 'test');
    panel.dispose();
});
```

## 2. Packaging and Publishing
<!-- STEP: 4.2, TASK: Package and publish the extension to the VS Code Marketplace. -->

### 2.1 Prepare for Publishing
<!-- SUB_STEP: 4.2.1, DETAIL: Complete the necessary prerequisites for the Marketplace. -->

#### Create a Publisher Account
1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com)
2. Sign in with Microsoft account
3. Create an Azure DevOps organization
4. Create a publisher with a unique ID

#### Get a Personal Access Token (PAT)
1. In Azure DevOps, go to User Settings → Personal Access Tokens
2. Create new token with "Marketplace (Manage)" scope
3. Save the token securely (you won't see it again)

#### Update package.json
```json
{
    "publisher": "your-publisher-id",
    "repository": {
        "type": "git",
        "url": "https://github.com/yourusername/your-extension"
    },
    "icon": "images/icon.png",
    "galleryBanner": {
        "color": "#0066B8",
        "theme": "dark"
    },
    "categories": ["Programming Languages", "Machine Learning"],
    "keywords": ["ai", "code-generation", "assistant", "copilot"],
    "badges": [
        {
            "url": "https://img.shields.io/badge/version-1.0.0-blue",
            "href": "https://marketplace.visualstudio.com/items?itemName=your-extension",
            "description": "Extension version"
        }
    ]
}
```

### 2.2 Install and Use vsce
<!-- SUB_STEP: 4.2.2, DETAIL: Install the official command-line tool for managing extensions. -->

Install Visual Studio Code Extensions command-line tool:
```bash
npm install -g vsce
```

### 2.3 Package the Extension
<!-- SUB_STEP: 4.2.3, DETAIL: Create a shareable .vsix file. -->

Create a `.vsix` file for sharing and manual installation:
```bash
vsce package
```

This creates a file like `ai-plugin-1.0.0.vsix` that can be:
- Shared privately for testing
- Installed manually via "Extensions: Install from VSIX" command
- Uploaded to private registries

### 2.4 Publish the Extension
<!-- SUB_STEP: 4.2.4, DETAIL: Upload the extension to the public Marketplace. -->

Log in with your PAT:
```bash
vsce login <your-publisher-name>
```

Publish your extension (automatically packages if needed):
```bash
vsce publish
```

Or publish with version increment:
```bash
vsce publish minor  # Increments 1.0.0 → 1.1.0
vsce publish patch  # Increments 1.0.0 → 1.0.1
vsce publish major  # Increments 1.0.0 → 2.0.0
```

## 3. Maintenance and Updates
<!-- STEP: 4.3, TASK: Ongoing maintenance and updates. -->

### 3.1 Use Semantic Versioning
<!-- SUB_STEP: 4.3.1, DETAIL: Increment the version number for each new release. -->

Follow the Major.Minor.Patch versioning scheme:
- **Patch (0.0.X)**: Bug fixes
- **Minor (0.X.0)**: New features (backward-compatible)
- **Major (X.0.0)**: Breaking changes

### 3.2 Create a CHANGELOG.md
<!-- SUB_STEP: 4.3.2, DETAIL: Document changes for users. -->

Maintain a `CHANGELOG.md` file in your project root:

```markdown
# Change Log

## [1.1.0] - 2024-01-15
### Added
- Real-time code suggestions with debouncing
- Multi-file context awareness
- Status bar integration

### Fixed
- Memory leak in webview disposal
- API timeout handling

### Changed
- Improved prompt engineering for better completions
- Updated minimum VS Code version to 1.74.0

## [1.0.0] - 2024-01-01
### Added
- Initial release
- Basic AI code generation
- Webview chat interface
- Configuration for API keys
```

### 3.3 Publish Updates
<!-- SUB_STEP: 4.3.3, DETAIL: Push new versions to the Marketplace. -->

After incrementing version and committing changes:
```bash
git add .
git commit -m "Release version 1.1.0"
git tag v1.1.0
git push origin main --tags
vsce publish
```

## 4. Continuous Integration/Deployment

### 4.1 GitHub Actions Workflow
Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linter
      run: npm run lint
      
    - name: Compile TypeScript
      run: npm run compile
      
    - name: Run tests
      run: xvfb-run -a npm test
      
  publish:
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Publish to Marketplace
      run: vsce publish -p ${{ secrets.VSCE_PAT }}
```

### 4.2 Pre-release Testing
Create a pre-release version for beta testing:

```bash
vsce publish --pre-release
```

This allows users to opt-in to test new features before stable release.

## 5. Monitoring and Analytics

### 5.1 Error Reporting
Implement telemetry for error tracking:

```typescript
// src/telemetry.ts
import * as vscode from 'vscode';

export class ErrorReporter {
    private readonly extensionId = 'your-publisher.ai-plugin';
    
    reportError(error: Error, context: string): void {
        // Only report if user has telemetry enabled
        if (vscode.env.isTelemetryEnabled) {
            // Send to your analytics service
            console.error(`[${this.extensionId}] Error in ${context}:`, error);
            
            // You could integrate with services like:
            // - Azure Application Insights
            // - Sentry
            // - LogRocket
        }
    }
}
```

### 5.2 Usage Analytics
Track feature usage to inform development:

```typescript
export class Analytics {
    trackEvent(eventName: string, properties?: Record<string, any>): void {
        if (vscode.env.isTelemetryEnabled) {
            // Track events like:
            // - Command executions
            // - Feature usage
            // - Performance metrics
            console.log(`Event: ${eventName}`, properties);
        }
    }
}
```

## 6. User Feedback and Support

### 6.1 Issue Templates
Create `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''
---

**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Environment:**
 - OS: [e.g. Windows 11]
 - VS Code Version: [e.g. 1.74.0]
 - Extension Version: [e.g. 1.0.0]

**Additional context**
Add any other context or screenshots.
```

### 6.2 Documentation
Create comprehensive documentation:

- **README.md**: Overview, features, installation
- **CONTRIBUTING.md**: Development setup, guidelines
- **docs/**: Detailed documentation
  - API reference
  - Configuration guide
  - Troubleshooting

## Next Steps
With testing and deployment complete, proceed to [Phase 5: Advanced Learning and Teaching Features](phase-5-advanced-learning.md)