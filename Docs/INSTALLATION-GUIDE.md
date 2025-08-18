# AI Learning Tool for Cursor - Installation & Setup Guide

## 📦 Installation Methods

### Method 1: VS Code/Cursor Marketplace (Recommended)
1. Open Cursor IDE or VS Code
2. Go to Extensions panel (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "AI Learning Tool for Cursor"
4. Click "Install"
5. Reload window when prompted

### Method 2: Install from VSIX File
1. Download the latest `.vsix` file from [Releases](https://github.com/rorystouder/AIDE/releases)
2. Open Cursor/VS Code
3. Go to Extensions panel
4. Click the "..." menu → "Install from VSIX..."
5. Select the downloaded `.vsix` file
6. Reload window when prompted

### Method 3: Install from Source (Development)
```bash
# Clone the repository
git clone https://github.com/rorystouder/AIDE.git
cd AIDE/ai-learning-tool

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npm install -g vsce
vsce package

# Install the generated .vsix file
code --install-extension ai-learning-tool-*.vsix
```

## 🚀 Quick Setup by Provider

### Option 1: Cursor Integration (No API Key Required)
Perfect for Cursor users who want to leverage built-in AI features.

1. After installation, press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "AI Learning Tool: Switch AI Provider"
3. Select "🎯 Cursor Integration"
4. You're ready to go! The extension will guide you to use Cursor's built-in features

**Cursor Shortcuts:**
- `Cmd/Ctrl + K`: Open Cursor's AI chat
- `Cmd/Ctrl + L`: AI code generation
- Select code + `Cmd/Ctrl + K`: Context-aware AI help

### Option 2: Claude API Setup
Best for high-quality code generation and explanations.

1. **Get your API key:**
   - Visit [console.anthropic.com](https://console.anthropic.com)
   - Sign up or log in
   - Go to API Keys section
   - Create a new API key (starts with `sk-ant-`)
   - Copy the key (you won't see it again!)

2. **Configure the extension:**
   - Open Settings (`Ctrl+,` / `Cmd+,`)
   - Search for "AI Learning Tool"
   - Set `Provider` to `claude`
   - Paste your API key in `API Key` field
   - Choose model (default: claude-3-haiku for best value)

3. **Verify setup:**
   - Run "AI Learning Tool: Open AI Chat"
   - Check status indicator shows "CLAUDE Ready"

### Option 3: OpenAI Setup
General-purpose AI assistance with GPT models.

1. **Get your API key:**
   - Visit [platform.openai.com](https://platform.openai.com)
   - Sign up or log in
   - Go to API Keys
   - Create new secret key (starts with `sk-`)
   - Copy and save the key

2. **Configure the extension:**
   - Open Settings
   - Search for "AI Learning Tool"
   - Set `Provider` to `openai`
   - Enter your API key
   - Choose model (default: gpt-3.5-turbo)

3. **Verify setup:**
   - Run "AI Learning Tool: Open AI Chat"
   - Status should show "OPENAI Ready"

### Option 4: Local AI Setup (Free, No Internet Required)
Perfect for privacy-conscious users and offline work.

1. **Install Ollama:**

   **macOS:**
   ```bash
   brew install ollama
   ```

   **Windows:**
   ```powershell
   winget install ollama
   # Or download from ollama.ai
   ```

   **Linux:**
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Download a model:**
   ```bash
   # Recommended for coding
   ollama pull codellama:7b
   
   # Alternative models
   ollama pull deepseek-coder:6.7b
   ollama pull mistral:7b
   ```

3. **Start Ollama service:**
   ```bash
   ollama serve
   ```

4. **Configure extension:**
   - Set `Provider` to `local`
   - Default endpoint works: `http://localhost:11434/api/generate`
   - No API key needed!

5. **Verify setup:**
   - Run "AI Learning Tool: Open AI Chat"
   - Status should show "LOCAL Ready"

## ⚙️ Configuration Options

### Essential Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `ai-learning-tool.provider` | AI provider to use | `openai` |
| `ai-learning-tool.apiKey` | API key for cloud providers | `` |

### Provider-Specific Settings

#### Claude Settings
| Setting | Description | Default |
|---------|-------------|---------|
| `ai-learning-tool.claude.model` | Claude model to use | `claude-3-haiku-20240307` |
| `ai-learning-tool.claude.apiUrl` | API endpoint | `https://api.anthropic.com/v1/messages` |

#### OpenAI Settings
| Setting | Description | Default |
|---------|-------------|---------|
| `ai-learning-tool.openai.model` | OpenAI model to use | `gpt-3.5-turbo` |
| `ai-learning-tool.openai.apiUrl` | API endpoint | `https://api.openai.com/v1/chat/completions` |

#### Local AI Settings
| Setting | Description | Default |
|---------|-------------|---------|
| `ai-learning-tool.local.model` | Local model name | `codellama:7b` |
| `ai-learning-tool.local.apiUrl` | Local AI endpoint | `http://localhost:11434/api/generate` |

#### Cursor Settings
| Setting | Description | Default |
|---------|-------------|---------|
| `ai-learning-tool.cursor.integration` | Enable Cursor features | `true` |

## 🎯 Feature Configuration

### Enable/Disable Features

#### Tab-to-Complete (Inline Suggestions)
```json
{
  "editor.inlineSuggest.enabled": true,
  "editor.suggest.preview": true
}
```

#### Workspace Search
The extension automatically indexes your workspace. To exclude folders:
```json
{
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true
  }
}
```

## 🔧 Troubleshooting Setup Issues

### Issue: "Configuration Required" Status

**For Claude/OpenAI:**
1. Check API key format:
   - Claude: Must start with `sk-ant-`
   - OpenAI: Must start with `sk-`
2. Verify API key in settings
3. Check account has credits

**For Local AI:**
1. Ensure Ollama is running: `ollama list`
2. Check service: `curl http://localhost:11434/api/version`
3. Verify model is downloaded: `ollama list`

### Issue: "Failed to get completion"

1. **Check internet connection** (for cloud providers)
2. **Verify API credits** in provider dashboard
3. **Try switching providers** temporarily
4. **Clear cache**: Run "AI Learning Tool: Clear All Caches"

### Issue: Extension Not Loading

1. **Check VS Code/Cursor version**: Must be 1.74.0+
2. **Reload window**: `Ctrl+Shift+P` → "Developer: Reload Window"
3. **Check logs**: Help → Toggle Developer Tools → Console
4. **Reinstall extension**: Uninstall and reinstall from marketplace

### Issue: Inline Suggestions Not Working

1. **Enable in settings**:
   ```json
   "editor.inlineSuggest.enabled": true
   ```
2. **Check file type**: Ensure file has proper extension (.js, .ts, .py, etc.)
3. **Wait for debounce**: Suggestions appear after 500ms of typing
4. **Check provider status**: Must show "Ready" in chat interface

## 📱 Platform-Specific Notes

### macOS
- Use `Cmd` instead of `Ctrl` for shortcuts
- May need to grant permissions for file access
- Ollama works best with Apple Silicon (M1/M2)

### Windows
- Windows Defender may scan the extension on first run
- Use PowerShell as Administrator for Ollama installation
- WSL2 users: Install in Windows, not WSL

### Linux
- May need to add user to docker group for Ollama
- Check firewall settings for local AI
- Use system package manager when available

## 🚦 Verification Checklist

After setup, verify everything works:

- [ ] Extension appears in Extensions panel
- [ ] "Hello World" command works (`Ctrl+Shift+P` → "AI Learning Tool: Hello World")
- [ ] Chat interface opens (`Ctrl+Shift+P` → "AI Learning Tool: Open AI Chat")
- [ ] Status indicator shows "Ready" (green)
- [ ] Provider indicator shows correct provider
- [ ] Can send messages in chat and receive responses
- [ ] Code generation works (select text → "Generate Code")
- [ ] Inline suggestions appear when typing (after setup)
- [ ] Search commands work (`Ctrl+Shift+P` → "AI Learning Tool: Search Workspace")

## 📞 Getting Help

### Resources
- **Documentation**: [GitHub Wiki](https://github.com/rorystouder/AIDE/wiki)
- **Issues**: [GitHub Issues](https://github.com/rorystouder/AIDE/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rorystouder/AIDE/discussions)

### Debug Information
To provide when reporting issues:
1. Extension version: Check in Extensions panel
2. VS Code/Cursor version: Help → About
3. Provider being used: Check settings
4. Error messages: Help → Toggle Developer Tools → Console
5. Operating system and version

### Common Solutions
1. **Restart VS Code/Cursor**: Often fixes temporary issues
2. **Clear cache**: "AI Learning Tool: Clear All Caches"
3. **Reset settings**: Delete all `ai-learning-tool.*` settings
4. **Reinstall**: Remove and reinstall extension
5. **Update**: Ensure latest version of extension and IDE

## 🎉 Success!

Once setup is complete, you can:
- 💬 Chat with AI about coding questions
- 🚀 Generate code from comments/descriptions
- 💡 Get real-time code suggestions as you type
- 🔍 Search your entire workspace intelligently
- 📍 Find definitions and references instantly
- 📝 Locate all TODO/FIXME comments
- ⚡ Enjoy cached responses for faster performance

Happy coding with your AI assistant! 🤖✨