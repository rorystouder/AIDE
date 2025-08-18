# Installing AI Learning Tool in Cursor

## Method 1: Install from .vsix file (Recommended)

1. Open Cursor IDE
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) to open the command palette
3. Type: `Extensions: Install from VSIX...`
4. Navigate to this directory and select: `ai-learning-tool-0.4.0.vsix`
5. Click "Install"
6. **Important**: Restart Cursor after installation

## Method 2: Development Installation

If you want to modify the extension:

1. Open this folder in Cursor
2. Run `npm install` in the terminal
3. Press `F5` to launch Extension Development Host
4. This opens a new Cursor window with the extension loaded

## After Installation

Once installed, access these commands via `Ctrl+Shift+P`:

- `AI Learning Tool: Open AI Chat`
- `AI Learning Tool: Generate Code`
- `AI Learning Tool: Switch AI Provider`
- `AI Learning Tool: Search Workspace`
- `AI Learning Tool: Show Cache Statistics`
- `AI Learning Tool: Clear All Caches`
- `AI Learning Tool: Find Definitions`
- `AI Learning Tool: Find References`
- `AI Learning Tool: Find TODOs`

## Configuration

Configure the extension in Cursor settings:
1. Open Settings (`Ctrl+,`)
2. Search for "AI Learning Tool"
3. Set your preferred AI provider and API keys

## Troubleshooting

- If commands don't appear, restart Cursor
- Check the Output panel for error messages
- Ensure you have the correct API keys configured for your chosen provider

## Uninstalling the Extension

To uninstall the current extension in Cursor:

1. Press `Ctrl+Shift+X` to open the Extensions panel
2. Search for "AI Learning Tool" or "ai-learning-tool"
3. Find the installed extension and click the gear icon next to it
4. Select "Uninstall" from the dropdown menu
5. Restart Cursor after uninstalling

Alternatively, you can:
1. Press `Ctrl+Shift+P` to open the command palette
2. Type "Extensions: Show Installed Extensions"
3. Find "AI Learning Tool" in the list
4. Click the gear icon and select "Uninstall"

After uninstalling and restarting, follow the installation steps above to install the newly built VSIX file.