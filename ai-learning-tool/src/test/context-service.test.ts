import * as assert from 'assert';
import * as vscode from 'vscode';
import { ContextService, WorkspaceContext } from '../context-service';

suite('ContextService Test Suite', () => {
    let contextService: ContextService;

    setup(() => {
        contextService = ContextService.getInstance();
        contextService.clearCache();
    });

    teardown(() => {
        contextService.clearCache();
    });

    test('Should return empty context when no editor is active', async () => {
        // Mock no active editor
        const originalEditor = vscode.window.activeTextEditor;
        Object.defineProperty(vscode.window, 'activeTextEditor', {
            get: () => undefined,
            configurable: true
        });

        const context = await contextService.buildWorkspaceContext();
        
        assert.strictEqual(context.currentFile, null);
        assert.deepStrictEqual(context.relatedFiles, []);
        assert.deepStrictEqual(context.imports, []);
        assert.strictEqual(context.projectType, 'unknown');
        assert.strictEqual(context.workspaceName, 'unknown');

        // Restore
        Object.defineProperty(vscode.window, 'activeTextEditor', {
            get: () => originalEditor,
            configurable: true
        });
    });

    test('Should extract JavaScript imports correctly', () => {
        const jsCode = `
            import React from 'react';
            import { useState, useEffect } from 'react';
            import * as utils from './utils';
            const lodash = require('lodash');
            const path = require('path');
        `;

        // Use private method through reflection (for testing)
        const imports = (contextService as any).extractImports(jsCode, 'javascript');
        
        assert.ok(imports.includes('react'));
        assert.ok(imports.includes('./utils'));
        assert.ok(imports.includes('lodash'));
        assert.ok(imports.includes('path'));
    });

    test('Should extract TypeScript imports correctly', () => {
        const tsCode = `
            import { Component } from '@angular/core';
            import type { User } from './types';
            export { default } from './component';
            import axios from 'axios';
        `;

        const imports = (contextService as any).extractImports(tsCode, 'typescript');
        
        assert.ok(imports.includes('@angular/core'));
        assert.ok(imports.includes('./types'));
        assert.ok(imports.includes('axios'));
    });

    test('Should extract Python imports correctly', () => {
        const pythonCode = `
            import os
            import sys
            from datetime import datetime
            from typing import List, Dict
            import numpy as np
        `;

        const imports = (contextService as any).extractImports(pythonCode, 'python');
        
        assert.ok(imports.includes('os'));
        assert.ok(imports.includes('sys'));
        assert.ok(imports.includes('datetime'));
        assert.ok(imports.includes('typing'));
        assert.ok(imports.includes('numpy'));
    });

    test('Should extract Java imports correctly', () => {
        const javaCode = `
            import java.util.List;
            import java.util.ArrayList;
            import static java.lang.Math.PI;
            import com.example.MyClass;
        `;

        const imports = (contextService as any).extractImports(javaCode, 'java');
        
        assert.ok(imports.includes('java.util.List'));
        assert.ok(imports.includes('java.util.ArrayList'));
        assert.ok(imports.includes('java.lang.Math.PI'));
        assert.ok(imports.includes('com.example.MyClass'));
    });

    test('Should detect project type correctly', async () => {
        // This test would need mock workspace folders
        // For now, test the fallback
        const projectType = await (contextService as any).detectProjectType();
        assert.ok(['unknown', 'node', 'python', 'java-maven', 'java-gradle', 'rust', 'go', 'dotnet'].includes(projectType));
    });

    test('Should identify code files correctly', () => {
        const codeFiles = [
            'test.js', 'test.ts', 'test.py', 'test.java',
            'test.cpp', 'test.go', 'test.rs', 'test.php'
        ];
        
        const nonCodeFiles = [
            'test.txt', 'test.md', 'test.pdf', 'test.doc',
            'image.png', 'video.mp4'
        ];

        codeFiles.forEach(file => {
            assert.ok((contextService as any).isCodeFile(file), `${file} should be identified as code file`);
        });

        nonCodeFiles.forEach(file => {
            assert.ok(!(contextService as any).isCodeFile(file), `${file} should not be identified as code file`);
        });
    });

    test('Should format context for prompt correctly', () => {
        const mockContext: WorkspaceContext = {
            currentFile: {
                uri: vscode.Uri.file('/test/file.js'),
                fileName: 'file.js',
                relativePath: 'src/file.js',
                content: 'console.log("test");',
                language: 'javascript',
                isOpen: true,
                relevanceScore: 1.0
            },
            relatedFiles: [
                {
                    uri: vscode.Uri.file('/test/utils.js'),
                    fileName: 'utils.js',
                    relativePath: 'src/utils.js',
                    content: 'export function util() {}',
                    language: 'javascript',
                    isOpen: false,
                    relevanceScore: 0.8
                }
            ],
            imports: ['react', 'lodash'],
            projectType: 'node',
            workspaceName: 'test-project'
        };

        const prompt = contextService.formatContextForPrompt(mockContext, false);
        
        assert.ok(prompt.includes('Project: test-project (node)'));
        assert.ok(prompt.includes('Current file: src/file.js'));
        assert.ok(prompt.includes('Language: javascript'));
        assert.ok(prompt.includes('Related files:'));
        assert.ok(prompt.includes('src/utils.js'));
        assert.ok(prompt.includes('Dependencies: react, lodash'));
    });

    test('Should include full content when requested', () => {
        const mockContext: WorkspaceContext = {
            currentFile: {
                uri: vscode.Uri.file('/test/file.js'),
                fileName: 'file.js',
                relativePath: 'src/file.js',
                content: 'const test = "hello";',
                language: 'javascript',
                isOpen: true,
                relevanceScore: 1.0
            },
            relatedFiles: [],
            imports: [],
            projectType: 'node',
            workspaceName: 'test-project'
        };

        const prompt = contextService.formatContextForPrompt(mockContext, true);
        
        assert.ok(prompt.includes('const test = "hello";'));
        assert.ok(prompt.includes('```javascript'));
    });

    test('Should deduplicate files correctly', () => {
        const files = [
            {
                uri: vscode.Uri.file('/test/file1.js'),
                fileName: 'file1.js',
                relativePath: 'file1.js',
                content: 'test1',
                language: 'javascript',
                isOpen: true,
                relevanceScore: 1.0
            },
            {
                uri: vscode.Uri.file('/test/file1.js'), // Duplicate
                fileName: 'file1.js',
                relativePath: 'file1.js',
                content: 'test1',
                language: 'javascript',
                isOpen: true,
                relevanceScore: 0.8
            },
            {
                uri: vscode.Uri.file('/test/file2.js'),
                fileName: 'file2.js',
                relativePath: 'file2.js',
                content: 'test2',
                language: 'javascript',
                isOpen: false,
                relevanceScore: 0.6
            }
        ];

        const deduplicated = (contextService as any).deduplicateFiles(files);
        
        assert.strictEqual(deduplicated.length, 2);
        assert.ok(deduplicated.find((f: any) => f.fileName === 'file1.js'));
        assert.ok(deduplicated.find((f: any) => f.fileName === 'file2.js'));
    });

    test('Should clear cache correctly', () => {
        // Add something to cache (would need actual editor context)
        contextService.clearCache();
        
        // Verify cache is cleared by trying to build context
        // This mainly tests that the method doesn't throw
        assert.doesNotThrow(() => contextService.clearCache());
    });
});