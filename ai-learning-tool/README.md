# AI Learning Tool for Cursor 🎯

AI-powered learning tool optimized for Cursor IDE with multi-provider support.

## Features

### Phase 1 ✅
- Basic extension setup and Hello World command

### Phase 2 ✅ + Cursor Optimizations
- **🎯 Cursor-Optimized UI**: Beautiful interface designed for Cursor users
- **🔄 Multi-Provider Support**: Claude API, OpenAI, Local AI, and Cursor integration
- **💬 AI Chat Interface**: Interactive webview for conversing with multiple AI providers
- **⚡ Quick Provider Switching**: Easy switching between AI providers
- **🎛️ Smart Configuration**: Provider-specific settings and validation
- **🔧 Code Generation**: Context-aware code generation with file type detection
- **🏠 Local AI Support**: Works with Ollama and other local models

## Requirements

- **Cursor IDE** or VS Code version 1.74.0 or higher
- Node.js 16.x or higher  
- AI API key (optional - depends on provider choice)

## Supported AI Providers

### 🧠 Claude API (Recommended)
- **Cost**: Pay-per-use (~$0.25 per 1M tokens for Haiku)
- **Setup**: Requires Anthropic API key
- **Best for**: High-quality code generation and explanations

### 🤖 OpenAI 
- **Cost**: Pay-per-use (~$0.50 per 1M tokens for GPT-3.5)
- **Setup**: Requires OpenAI API key
- **Best for**: General purpose coding assistance

### 🏠 Local AI (Free!)
- **Cost**: Free (uses your hardware)
- **Setup**: Install Ollama + download models
- **Best for**: Privacy-conscious users, offline work

### 🎯 Cursor Integration
- **Cost**: Free guidance
- **Setup**: No configuration needed
- **Best for**: Leveraging Cursor's built-in AI features

## Extension Settings

### Provider Selection
* `ai-learning-tool.provider`: Choose your AI provider (claude, openai, local, cursor)

### API Configuration  
* `ai-learning-tool.apiKey`: Your API key (required for Claude/OpenAI)

### Provider-Specific Settings
* `ai-learning-tool.claude.model`: Claude model (default: claude-3-haiku-20240307)
* `ai-learning-tool.openai.model`: OpenAI model (default: gpt-3.5-turbo)
* `ai-learning-tool.local.apiUrl`: Local AI endpoint (default: Ollama)
* `ai-learning-tool.cursor.integration`: Enable Cursor-specific features

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
- `AI Learning Tool: Open AI Chat` - Open the multi-provider chat interface
- `AI Learning Tool: Generate Code` - Generate code from selected text
- `AI Learning Tool: Switch AI Provider` - Quick provider switching
- `AI Learning Tool: Hello World` - Test command

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

## ❓ Frequently Asked Questions

### Can I use my Claude Pro subscription with this extension?
Unfortunately, **no**. Claude subscriptions (Pro, web, CLI) use different authentication and cannot be used with VS Code/Cursor extensions. You'll need:
- **Claude API credits** (separate from subscription, ~$0.25 per 1M tokens)
- **Or use a different provider** (OpenAI, local AI, or Cursor's built-in features)

### What about my existing Claude Code CLI subscription?
The CLI subscription cannot be shared with extensions due to technical and policy limitations. However, you can:
- Use the **Cursor provider** option for guidance on Cursor's built-in AI
- Try **local AI models** for free offline usage
- Get Claude API credits for the best experience with this extension

### Which provider should I choose?
- **New to AI coding**: Start with Cursor provider (free guidance)
- **Want high quality**: Claude API (cost-effective with Haiku model)  
- **Privacy focused**: Local AI with Ollama
- **Already have OpenAI**: Use OpenAI provider

## Release Notes

### 0.2.0 (Cursor Optimizations)

**🎯 Cursor-Specific Features:**
- Multi-provider AI support (Claude, OpenAI, Local, Cursor)
- Cursor-optimized UI and branding  
- Quick provider switching command
- Smart configuration management
- Cursor integration guidance

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