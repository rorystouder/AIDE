// Test file for Educational & Prompt Engineering Features
// This tests the new no-code to code capabilities

console.log('🎯 Testing Educational Features');

// Test scenarios for beginners
const testScenarios = [
    {
        description: "A simple calculator that can add, subtract, multiply and divide two numbers",
        experienceLevel: "complete-beginner",
        projectType: "web-app",
        learningGoals: ["variables", "functions", "user input", "basic math operations"]
    },
    {
        description: "A to-do list where I can add tasks, mark them as complete, and delete them",
        experienceLevel: "some-basics",
        projectType: "web-app", 
        learningGoals: ["arrays", "DOM manipulation", "event handling", "local storage"]
    },
    {
        description: "A password generator that creates random secure passwords",
        experienceLevel: "intermediate",
        projectType: "script",
        learningGoals: ["random numbers", "string manipulation", "security concepts", "user preferences"]
    }
];

// Test debugging scenarios
const debugScenarios = [
    {
        code: `function calculateAverage(numbers) {
    let sum = 0;
    for (let i = 0; i <= numbers.length; i++) {
        sum += numbers[i];
    }
    return sum / numbers.length;
}`,
        error: "TypeError: Cannot read property of undefined",
        language: "javascript"
    },
    {
        code: `def find_maximum(numbers):
    max_num = numbers[0]
    for i in range(len(numbers)):
        if numbers[i] > max_num:
            max_num = numbers[i]
    return max_num

print(find_maximum([]))`,
        error: "IndexError: list index out of range",
        language: "python"
    }
];

// Test code explanation scenarios  
const explanationScenarios = [
    {
        code: `const users = [
    { name: 'Alice', age: 25, active: true },
    { name: 'Bob', age: 30, active: false },
    { name: 'Charlie', age: 35, active: true }
];

const activeUsers = users
    .filter(user => user.active)
    .map(user => user.name)
    .sort();

console.log(activeUsers);`,
        language: "javascript",
        level: "beginner"
    }
];

// Test project ideas scenarios
const projectInterests = [
    ["games", "graphics", "animation"],
    ["web development", "databases", "user interfaces"],
    ["data analysis", "statistics", "visualization"],
    ["automation", "file processing", "productivity tools"]
];

console.log('✅ Educational test scenarios ready');
console.log(`📋 ${testScenarios.length} no-code builder tests`);
console.log(`🐛 ${debugScenarios.length} debug helper tests`);
console.log(`📚 ${explanationScenarios.length} code explanation tests`);
console.log(`💡 ${projectInterests.length} project idea categories`);

module.exports = {
    testScenarios,
    debugScenarios,
    explanationScenarios,
    projectInterests
};