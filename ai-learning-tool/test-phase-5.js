// Phase 5 Testing File for AI Learning Tool Extension
// Advanced AI Intelligence & Production Optimization Features

/**
 * Phase 5 Test Scenarios:
 * 1. Smart Code Analysis & Refactoring suggestions
 * 2. Usage Analytics & Learning patterns
 * 3. Personalized AI suggestions based on coding style
 * 4. Performance optimization recommendations
 * 5. Enterprise security analysis
 */

// Test complex code patterns for AI analysis
class LegacyOrderProcessor {
    constructor() {
        this.orders = [];
        this.status = 'idle';
        this.config = {
            timeout: 5000,
            retries: 3,
            batchSize: 10
        };
    }

    // This method has performance issues - should trigger optimization suggestions
    processOrders(orders) {
        for (let i = 0; i < orders.length; i++) {
            for (let j = 0; j < this.orders.length; j++) {
                if (orders[i].id === this.orders[j].id) {
                    // Inefficient nested loop - O(n²) complexity
                    this.orders[j] = { ...this.orders[j], ...orders[i] };
                }
            }
        }
        
        // Synchronous database calls (should suggest async)
        this.saveToDatabase(this.orders);
        this.sendNotifications(this.orders);
        
        return this.orders;
    }

    // Security vulnerability - should trigger security analysis
    executeQuery(sql, params) {
        // SQL injection vulnerable code
        const query = `SELECT * FROM orders WHERE ${sql}`;
        return this.database.query(query + params.join(' AND '));
    }

    // Memory leak potential - should trigger memory analysis
    cacheResults(data) {
        if (!this.cache) {
            this.cache = new Map();
        }
        
        // No cache size limit or cleanup
        this.cache.set(Date.now(), data);
        
        return data;
    }
}

// Test modern patterns that should be suggested as refactoring
const ModernOrderProcessor = {
    orders: new Set(),
    
    // Optimized version using Set and async/await
    async processOrdersOptimized(orders) {
        const orderMap = new Map(orders.map(order => [order.id, order]));
        
        // Batch processing for better performance
        const batches = this.createBatches(Array.from(orderMap.values()));
        
        for (const batch of batches) {
            await Promise.all([
                this.saveToDatabase(batch),
                this.sendNotifications(batch)
            ]);
        }
        
        return Array.from(orderMap.values());
    },
    
    // Secure parameterized query
    async executeSecureQuery(sql, params) {
        const statement = this.database.prepare(sql);
        return await statement.all(params);
    }
    
};

// Test patterns for personalized suggestions
function analyzeUserCodingStyle() {
    // This function should learn from user patterns:
    // - Preferred naming conventions (camelCase vs snake_case)
    // - Function structure preferences (arrow functions vs declarations)
    // - Error handling patterns (try/catch vs .catch())
    // - Import/export style preferences
    
    const codingPatterns = {
        namingConvention: 'camelCase', // vs 'snake_case', 'PascalCase'
        functionStyle: 'arrow',        // vs 'declaration', 'expression'
        errorHandling: 'async-await',  // vs 'promises', 'callbacks'
        importStyle: 'destructured'    // vs 'default', 'namespace'
    };
    
    return codingPatterns;
}

// Test code that should trigger different types of AI suggestions
async function complexBusinessLogic(userData, orderData, paymentData) {
    // This function has multiple improvement opportunities:
    
    // 1. Error handling could be improved
    try {
        // 2. Validation could be extracted to separate functions
        if (!userData || !userData.id) {
            throw new Error('Invalid user data');
        }
        
        if (!orderData || orderData.length === 0) {
            throw new Error('No orders provided');
        }
        
        // 3. Business logic could be separated into smaller functions
        let totalAmount = 0;
        const processedOrders = [];
        
        for (const order of orderData) {
            // 4. This validation logic is repeated and could be extracted
            if (order.amount && order.amount > 0) {
                totalAmount += order.amount;
                
                // 5. Side effects mixed with business logic
                console.log(`Processing order ${order.id} for amount ${order.amount}`);
                
                processedOrders.push({
                    ...order,
                    userId: userData.id,
                    processedAt: new Date(),
                    status: 'processed'
                });
            }
        }
        
        // 6. Payment processing should be abstracted
        const paymentResult = await processPayment(totalAmount, paymentData);
        
        if (!paymentResult.success) {
            // 7. Error handling inconsistency
            return { error: 'Payment failed', details: paymentResult.error };
        }
        
        // 8. Database operations should be transactional
        await saveOrders(processedOrders);
        await updateUserBalance(userData.id, totalAmount);
        
        return {
            success: true,
            totalAmount,
            orderCount: processedOrders.length,
            paymentId: paymentResult.transactionId
        };
        
    } catch (error) {
        // 9. Error logging could be improved with structured logging
        console.error('Business logic error:', error);
        throw error;
    }
}

// Test performance-critical code that needs optimization
function performanceCriticalFunction(largeDataset) {
    // Performance issues that should trigger suggestions:
    
    // 1. Inefficient array methods chaining
    const result = largeDataset
        .filter(item => item.active) // Creates new array
        .map(item => ({ ...item, processed: true })) // Creates another new array
        .filter(item => item.score > 50) // Creates third new array
        .sort((a, b) => b.score - a.score) // In-place sort on large array
        .slice(0, 100); // Takes only first 100 items
    
    // 2. Synchronous file operations
    const fs = require('fs');
    fs.writeFileSync('results.json', JSON.stringify(result));
    
    return result;
}

// Test security patterns that need analysis
class UserAuthenticationManager {
    constructor() {
        // Security issues to detect:
        this.secretKey = 'hardcoded-secret-key'; // 1. Hardcoded secrets
        this.users = new Map(); // 2. In-memory user storage
    }
    
    // 3. Weak password validation
    validatePassword(password) {
        return password.length > 6;
    }
    
    // 4. No rate limiting
    async authenticate(username, password) {
        const user = this.users.get(username);
        
        // 5. Timing attack vulnerability
        if (user && user.password === password) {
            return { success: true, token: this.generateToken(user) };
        }
        
        return { success: false, error: 'Invalid credentials' };
    }
    
    // 6. Weak token generation
    generateToken(user) {
        return Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    }
}

// Test patterns for analytics and learning
function trackUsageAnalytics(action, context) {
    // This should help the AI learn user preferences:
    const analytics = {
        timestamp: Date.now(),
        action: action, // 'completion_accepted', 'completion_rejected', 'manual_edit'
        context: {
            language: context.language,
            fileType: context.fileType,
            lineNumber: context.lineNumber,
            suggestionType: context.suggestionType,
            userModifications: context.modifications
        },
        userProfile: {
            experienceLevel: 'intermediate', // Should be detected automatically
            preferredPatterns: analyzeUserCodingStyle(),
            frequentLanguages: ['javascript', 'typescript', 'python']
        }
    };
    
    return analytics;
}

// Test code that should trigger different AI enhancement suggestions
module.exports = {
    LegacyOrderProcessor,
    ModernOrderProcessor,
    analyzeUserCodingStyle,
    complexBusinessLogic,
    performanceCriticalFunction,
    UserAuthenticationManager,
    trackUsageAnalytics
};

console.log('Phase 5 test file loaded - Advanced AI Intelligence & Production Optimization');