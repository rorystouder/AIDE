import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	version: 'insiders', // Use latest version compatible with Cursor
	workspaceFolder: './test-workspace',
	mocha: {
		ui: 'tdd',
		timeout: 20000
	}
});