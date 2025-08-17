# AI Learning Tool

AI-powered learning tool for VS Code.

## Features

Currently implements:
- Hello World command to verify extension is working

## Requirements

- VS Code version 1.74.0 or higher
- Node.js 16.x or higher

## Extension Settings

This extension will contribute the following settings (to be implemented):

* `ai-learning-tool.apiKey`: API key for AI service

## Testing the Extension

### Method 1: Using VS Code UI
1. Open this folder in VS Code
2. Press `F5` to open a new VS Code window with the extension loaded
3. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. Type "Hello World" and run the command
5. You should see a notification "Hello World from AI Learning Tool!"

### Method 2: Using Command Line
1. Install dependencies: `npm install`
2. Compile the extension: `npm run compile`
3. Run tests: `npm test`

## Development

### Project Structure
```
ai-learning-tool/
├── src/
│   ├── extension.ts       # Main extension file
│   └── test/              # Test files
├── dist/                  # Compiled JavaScript (generated)
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
└── webpack.config.js     # Webpack bundling configuration
```

### Available Scripts
- `npm run compile`: Compile TypeScript to JavaScript
- `npm run watch`: Watch for changes and recompile
- `npm run package`: Create production build
- `npm run lint`: Run ESLint
- `npm test`: Run tests

## Release Notes

### 0.0.1

Initial release with basic Hello World command.

## Next Steps (Phase 2)

- Integrate AI API service
- Create webview for chat interface
- Implement code generation command

---

**Note**: This is Phase 1 of the AI-IDE development plan. See `/Docs` folder for complete implementation phases.