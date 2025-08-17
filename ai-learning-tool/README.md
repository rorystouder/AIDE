# AI Learning Tool for Cursor 🎯

AI-powered learning tool optimized for Cursor IDE with multi-provider support.

## 🚀 Quick Start (30 seconds)

**Want to try it immediately? Start with Cursor integration:**

1. Install the extension in Cursor
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Switch AI Provider" → Select "🎯 Cursor Integration"
4. Press `Ctrl+Shift+P` → Type "Open AI Chat"
5. You're ready! The extension will guide you to use Cursor's built-in AI features

**Want your own AI?** See [Setup Instructions](#-setup-instructions) below for Claude, OpenAI, or local AI.

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

## 🚀 Setup Instructions

### Prerequisites
- **Cursor IDE** or VS Code 1.74.0+
- **Node.js 16+** (for development)
- **Internet connection** (for cloud AI providers)

### Option 1: Quick Start (Cursor Integration) ⚡
**Perfect for Cursor users - No API keys needed!**

1. Install the extension in Cursor
2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "AI Learning Tool: Switch AI Provider"
4. Select "🎯 Cursor Integration"
5. Start using! The extension will guide you to Cursor's built-in AI features

### Option 2: Claude API Setup (Recommended) 🧠
**Best quality, cost-effective at ~$0.25 per 1M tokens**

1. **Get Claude API Key:**
   - Go to [console.anthropic.com](https://console.anthropic.com)
   - Create account and add billing
   - Generate API key (starts with `sk-ant-`)

2. **Configure Extension:**
   - Open Cursor/VS Code Settings (`Ctrl+,` / `Cmd+,`)
   - Search for "AI Learning Tool"
   - Set `ai-learning-tool.provider` to `claude`
   - Enter your API key in `ai-learning-tool.apiKey`

3. **Start Coding:**
   - Run "AI Learning Tool: Open AI Chat" 
   - Status should show "CLAUDE Ready"

### Option 3: OpenAI Setup 🤖
**General purpose coding assistance**

1. **Get OpenAI API Key:**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Create account and add billing
   - Generate API key (starts with `sk-`)

2. **Configure Extension:**
   - Open Settings and search for "AI Learning Tool"
   - Set `ai-learning-tool.provider` to `openai`
   - Enter your API key in `ai-learning-tool.apiKey`

### Option 4: Local AI Setup (Free!) 🏠
**Perfect for privacy, offline work, no API costs**

1. **Install Ollama:**
   ```bash
   # macOS
   brew install ollama
   
   # Windows (via PowerShell)
   winget install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Download a Coding Model:**
   ```bash
   # Recommended: CodeLlama 7B (fast, good for coding)
   ollama pull codellama:7b
   
   # Alternative: Larger models (better quality, slower)
   ollama pull codellama:13b
   ollama pull deepseek-coder:6.7b
   ```

3. **Start Ollama Service:**
   ```bash
   ollama serve
   ```

4. **Configure Extension:**
   - Set `ai-learning-tool.provider` to `local`
   - Default endpoint `http://localhost:11434/api/generate` should work
   - No API key needed!

### Quick Provider Switching 🔄
Use the command "AI Learning Tool: Switch AI Provider" to easily switch between providers without going to settings.

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

## 🛠️ Dependencies & Installation Methods

### Method 1: Install from Marketplace (Coming Soon)
```
Search for "AI Learning Tool for Cursor" in the Extensions panel
```

### Method 2: Install from .vsix File
```bash
# Package the extension
cd ai-learning-tool
npm install
npm run package

# Install in Cursor/VS Code
# Extensions panel → "..." → "Install from VSIX"
# Select the generated .vsix file
```

### Method 3: Development Mode
```bash
# Clone and setup
git clone https://github.com/rorystouder/AIDE.git
cd AIDE/ai-learning-tool
npm install
npm run compile

# Open in Cursor
# Press F5 to launch Extension Development Host
```

## 🧪 Testing the Extension

### Quick Test Checklist
1. **Provider Switching**: `Ctrl+Shift+P` → "Switch AI Provider"
2. **Chat Interface**: `Ctrl+Shift+P` → "Open AI Chat" 
3. **Code Generation**: 
   - Open `test-demo.js` file
   - Select a comment (e.g., "Create a function that calculates factorial")
   - Run "Generate Code" command
4. **Configuration**: Check status indicators in chat interface

### Verification Steps
- ✅ Provider indicator shows correct provider
- ✅ Status indicator shows "Ready" (green) or configuration help
- ✅ Chat interface opens without errors
- ✅ Code generation inserts text in editor

## 🔧 Troubleshooting

### Common Issues & Solutions

#### "Configuration Required" Status
**Problem**: Extension shows configuration is invalid
**Solutions**:
- **Claude**: API key must start with `sk-ant-`
- **OpenAI**: API key must start with `sk-`
- **Local**: Check if Ollama is running (`ollama serve`)
- **Cursor**: Should work immediately, no config needed

#### "Failed to get completion" Error
**Possible Causes**:
1. **Invalid API Key**: Double-check your key in settings
2. **No Credits**: Check your API provider account balance
3. **Network Issues**: Verify internet connection
4. **Local AI Down**: For local provider, ensure `ollama serve` is running
5. **Rate Limiting**: Wait a moment and try again

#### Local AI Not Responding
**Solutions**:
```bash
# Check if Ollama is running
ollama list

# Start Ollama service
ollama serve

# Test connection
curl http://localhost:11434/api/version

# If port is different, update settings:
# ai-learning-tool.local.apiUrl
```

#### Extension Not Loading
**Solutions**:
1. **Reload Window**: `Ctrl+Shift+P` → "Developer: Reload Window"
2. **Check Console**: Help → Toggle Developer Tools → Console tab
3. **Reinstall**: Remove extension and reinstall
4. **Version Check**: Ensure Cursor/VS Code 1.74.0+

### Support & Debugging

#### Enable Debug Mode
1. Open Developer Tools (`Help` → `Toggle Developer Tools`)
2. Check Console tab for detailed error messages
3. Look for lines starting with `[ai-learning-tool]`

#### Reset Configuration
```bash
# Reset all settings to defaults
# Go to Settings → Search "ai-learning-tool" → Reset to defaults
```

#### Common Error Messages
- `"AI API key not set"` → Configure API key for your provider
- `"Invalid provider configuration"` → Switch to a working provider
- `"Cannot connect to AI service"` → Check internet/local service
- `"Rate limit exceeded"` → Wait and try again, or upgrade API plan

## 📋 System Requirements

### Minimum Requirements
- **Cursor IDE** or **VS Code 1.74.0+**
- **Node.js 16+** (for development only)
- **4GB RAM** (8GB+ recommended for local AI)
- **Internet connection** (for cloud AI providers)

### Recommended Setup
- **Cursor IDE** (latest version)
- **8GB+ RAM** (for smooth local AI performance)
- **SSD storage** (for faster local model loading)
- **Stable internet** (for cloud AI providers)

### Platform Support
- ✅ **Windows 10/11**
- ✅ **macOS 10.15+** 
- ✅ **Linux** (Ubuntu 18.04+, most distributions)

### Development Dependencies
```json
{
  "node": ">=16.0.0",
  "npm": ">=7.0.0",
  "typescript": "^5.5.4",
  "webpack": "^5.94.0",
  "axios": "^1.11.0"
}
```

## 💻 Development

### Project Structure
```
AIDE/
├── Docs/                           # Documentation
│   ├── phase-1-foundation-setup.md
│   ├── phase-2-core-ai-features.md
│   ├── phase-3-advanced-features.md
│   ├── phase-4-testing-deployment.md
│   ├── phase-5-advanced-learning.md
│   └── project-status/
│       └── project-summary.md      # Complete development history
├── ai-learning-tool/               # Main extension
│   ├── src/
│   │   ├── extension.ts           # Main extension logic
│   │   ├── ai-service.ts          # Multi-provider AI service
│   │   └── test/                  # Test files
│   ├── dist/                      # Compiled JavaScript (generated)
│   ├── node_modules/              # Dependencies (generated)
│   ├── package.json               # Extension manifest & dependencies
│   ├── package-lock.json          # Locked dependency versions
│   ├── tsconfig.json              # TypeScript configuration
│   ├── webpack.config.js          # Webpack bundling configuration
│   ├── test-demo.js               # Demo file for testing features
│   └── README.md                  # This file
├── package.json                   # Project root dependencies
└── README.md                      # Project overview
```

### Complete Dependencies List
```json
{
  "dependencies": {
    "axios": "^1.11.0"
  },
  "devDependencies": {
    "@types/glob": "^8.1.0",
    "@types/mocha": "^10.0.7", 
    "@types/node": "20.x",
    "@types/vscode": "^1.74.0",
    "@typescript-eslint/eslint-plugin": "^8.3.0",
    "@typescript-eslint/parser": "^8.3.0",
    "@vscode/test-cli": "^0.0.10",
    "@vscode/test-electron": "^2.4.1",
    "eslint": "^9.9.1",
    "glob": "^11.0.3",
    "ts-loader": "^9.5.1",
    "typescript": "^5.5.4",
    "webpack": "^5.94.0",
    "webpack-cli": "^5.1.4"
  }
}
```

### Development Setup
```bash
# 1. Clone the repository
git clone https://github.com/rorystouder/AIDE.git
cd AIDE/ai-learning-tool

# 2. Install all dependencies
npm install

# 3. Compile TypeScript
npm run compile

# 4. Open in Cursor for development
# Press F5 to launch Extension Development Host
```

### Available Scripts
- `npm run compile`: Compile TypeScript with webpack
- `npm run watch`: Watch for changes and recompile automatically
- `npm run package`: Create production .vsix build
- `npm run lint`: Run ESLint for code quality
- `npm test`: Run test suite
- `npm run compile-tests`: Compile test files
- `npm run watch-tests`: Watch and compile tests

### Development Workflow
1. **Make Changes**: Edit files in `src/`
2. **Compile**: Run `npm run compile` or use watch mode
3. **Test**: Press F5 in Cursor to test in Extension Development Host
4. **Package**: Run `npm run package` to create .vsix for distribution

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

### Cost Comparison (Per 1 Million Tokens)
| Provider | Input Cost | Output Cost | Notes |
|----------|------------|-------------|-------|
| **Claude Haiku** | $0.25 | $1.25 | ⭐ Most cost-effective |
| **OpenAI GPT-3.5** | $0.50 | $1.50 | Widely compatible |
| **Local AI** | $0.00 | $0.00 | 🔒 Free but uses your hardware |
| **Cursor Integration** | $0.00 | $0.00 | 📖 Guidance only |

### Performance Comparison
| Provider | Response Speed | Code Quality | Setup Difficulty |
|----------|----------------|--------------|------------------|
| **Claude API** | ⚡⚡⚡ Fast | 🌟🌟🌟🌟🌟 Excellent | 🔧 Easy |
| **OpenAI** | ⚡⚡⚡ Fast | 🌟🌟🌟🌟 Very Good | 🔧 Easy |
| **Local AI** | ⚡⚡ Moderate* | 🌟🌟🌟 Good | 🔧🔧 Moderate |
| **Cursor** | ⚡⚡⚡⚡ Native | 🌟🌟🌟🌟 Very Good | ✅ None |

*Local AI speed depends on your hardware (GPU recommended)

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