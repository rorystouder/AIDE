# AI Learning Tool

AI-powered learning tool for VS Code.

## Features

### Phase 1 ✅
- Basic extension setup and Hello World command

### Phase 2 ✅ 
- **AI Chat Interface**: Interactive webview for conversing with AI
- **Code Generation**: Select text and generate code based on descriptions
- **API Integration**: Support for OpenAI and compatible APIs
- **Configuration Management**: Secure API key storage and validation
- **Context-Aware Assistance**: Language and file-specific code generation

## Requirements

- VS Code version 1.74.0 or higher
- Node.js 16.x or higher
- AI API key (OpenAI or compatible service)

## Extension Settings

This extension contributes the following settings:

* `ai-learning-tool.apiKey`: Your API key for the AI service (required)
* `ai-learning-tool.apiUrl`: API endpoint URL (default: OpenAI completions)
* `ai-learning-tool.model`: AI model to use (default: gpt-3.5-turbo-instruct)

## Setup Instructions

1. **Install the Extension**: Install in VS Code or load for development
2. **Configure API Key**: 
   - Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
   - Search for "AI Learning Tool"
   - Enter your API key in the `ai-learning-tool.apiKey` field
3. **Start Using**: Use the Command Palette to access features

## How to Use

### AI Chat Interface
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run "Open AI Chat" command
3. Chat with the AI about coding questions, request examples, or get help

### Code Generation
1. Write a comment or description in your code (e.g., `// Create a function to sort an array`)
2. Select the text
3. Run "Generate Code" command from Command Palette
4. AI will generate code based on your description and file context

### Available Commands
- `AI Learning Tool: Hello World` - Test command
- `AI Learning Tool: Open AI Chat` - Open the chat interface
- `AI Learning Tool: Generate Code` - Generate code from selected text

## Testing the Extension

### Method 1: Using VS Code UI
1. Open this folder in VS Code
2. Press `F5` to open a new Extension Development Host window
3. Configure your API key in the new window's settings
4. Test the commands:
   - Open Command Palette and try "Open AI Chat"
   - Create a file, write a comment, select it, and use "Generate Code"

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

### 0.1.0 (Phase 2 Complete)

**New Features:**
- AI Chat Interface with beautiful VS Code-themed UI
- Code Generation from selected text with context awareness
- API key configuration and validation
- Support for OpenAI and compatible APIs
- Progress indicators and error handling
- Two-way communication between extension and webview

### 0.0.1 (Phase 1)

- Initial release with basic Hello World command
- Extension scaffolding and build setup

## Next Steps (Phase 3)

- Context awareness with multi-file analysis
- Real-time code suggestions (tab-to-complete)
- Performance optimizations and caching
- Advanced prompt engineering

---

**Note**: This is Phase 1 of the AI-IDE development plan. See `/Docs` folder for complete implementation phases.