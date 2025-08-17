// Phase 3 Testing File for AI Learning Tool Extension
// This file contains various code patterns to test our advanced features

/**
 * TODO: Test the TODO finder feature
 * FIXME: This is a test fixme comment
 * HACK: Testing hack detection
 * NOTE: This is just a test note
 */

// Test class for context awareness
class DatabaseManager {
    constructor(connectionString) {
        this.connection = connectionString;
        this.isConnected = false;
    }

    // Test function for definition search
    async connect() {
        try {
            this.isConnected = true;
            return { success: true, message: 'Connected to database' };
        } catch (error) {
            console.error('Connection failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Another function to test reference search
    disconnect() {
        this.isConnected = false;
        console.log('Disconnected from database');
    }

    // Test method with parameters
    async executeQuery(sql, parameters = []) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        
        // TODO: Add query validation
        return { results: [], count: 0 };
    }
}

// Test function for inline completion triggering
function calculateFactorial(n) {
    // This function should trigger completion suggestions
    if (n <= 1) {
        return 1;
    }
    
    // Test recursive pattern
    return n * calculateFactorial(n - 1);
}

// Test arrow function patterns
const processUserData = async (userData) => {
    // This should test context-aware suggestions
    const validation = validateUser(userData);
    
    if (!validation.isValid) {
        throw new Error(validation.message);
    }
    
    // Test method chaining context
    return userData
        .filter(user => user.active)
        .map(user => ({
            id: user.id,
            name: user.name,
            email: user.email
        }));
};

// Test validation function for reference search
function validateUser(user) {
    // FIXME: Add more comprehensive validation
    if (!user.email || !user.name) {
        return { isValid: false, message: 'Missing required fields' };
    }
    
    return { isValid: true };
}

// Test async/await patterns
async function initializeApplication() {
    try {
        const db = new DatabaseManager('postgresql://localhost:5432/testdb');
        const connection = await db.connect();
        
        if (!connection.success) {
            throw new Error('Failed to initialize database');
        }
        
        console.log('Application initialized successfully');
        return db;
    } catch (error) {
        console.error('Initialization failed:', error);
        throw error;
    }
}

// Test object destructuring and spread operator
const configDefaults = {
    timeout: 5000,
    retries: 3,
    debug: false
};

function createConfig(userConfig = {}) {
    return {
        ...configDefaults,
        ...userConfig,
        timestamp: Date.now()
    };
}

// Test class inheritance for definition search
class AdvancedDatabaseManager extends DatabaseManager {
    constructor(connectionString, options = {}) {
        super(connectionString);
        this.options = options;
        this.cache = new Map();
    }

    // Override parent method
    async connect() {
        const result = await super.connect();
        
        if (result.success && this.options.enableCache) {
            console.log('Cache enabled for database connection');
        }
        
        return result;
    }

    // New method for testing
    async getCachedQuery(sql, parameters = []) {
        const cacheKey = `${sql}:${JSON.stringify(parameters)}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const result = await this.executeQuery(sql, parameters);
        this.cache.set(cacheKey, result);
        
        return result;
    }
}

// Test module exports pattern
module.exports = {
    DatabaseManager,
    AdvancedDatabaseManager,
    calculateFactorial,
    processUserData,
    validateUser,
    initializeApplication,
    createConfig
};

// Test import patterns for context analysis
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Test constants for reference search
const API_ENDPOINTS = {
    USERS: '/api/users',
    POSTS: '/api/posts',
    COMMENTS: '/api/comments'
};

const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500
};

// Test function with complex logic for completion suggestions
async function processApiRequest(endpoint, method = 'GET', data = null) {
    // This function tests multiple completion trigger patterns
    
    const config = createConfig({
        method: method.toUpperCase(),
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    
    if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
    }
    
    try {
        // Test promise-based patterns
        const response = await fetch(endpoint, config);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Test conditional logic
        if (method === 'POST' && response.status === HTTP_STATUS.CREATED) {
            console.log('Resource created successfully');
        }
        
        return result;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Test for loop patterns
function processArray(items) {
    const results = [];
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Test nested conditions
        if (item && typeof item === 'object') {
            results.push({
                index: i,
                processed: true,
                data: item
            });
        }
    }
    
    return results;
}

// Test regex patterns for search functionality
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;

function validateContactInfo(email, phone) {
    const errors = [];
    
    if (!EMAIL_REGEX.test(email)) {
        errors.push('Invalid email format');
    }
    
    if (phone && !PHONE_REGEX.test(phone)) {
        errors.push('Invalid phone format');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// NOTE: This file tests multiple features:
// 1. Context-aware code completion
// 2. Workspace search capabilities  
// 3. Definition and reference finding
// 4. TODO/FIXME comment detection
// 5. Caching and performance optimizations
// 6. Advanced prompt engineering

console.log('Phase 3 test file loaded successfully');