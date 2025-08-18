const axios = require('axios');

// Test OpenAI API integration
async function testOpenAI() {
    // Read API key from environment or VS Code settings
    const apiKey = process.env.OPENAI_API_KEY || '';
    
    if (!apiKey) {
        console.log('❌ No OpenAI API key found.');
        console.log('Set OPENAI_API_KEY environment variable or configure in VS Code settings.');
        return;
    }
    
    console.log('🔑 API Key found, testing OpenAI connection...');
    console.log('Key format:', apiKey.startsWith('sk-') ? '✅ Valid format (sk-...)' : '❌ Invalid format');
    
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello! This is a test message.' }],
            max_tokens: 50
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ OpenAI API test successful!');
        console.log('Response:', response.data.choices[0].message.content);
        
    } catch (error) {
        console.log('❌ OpenAI API test failed:');
        
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Error: ${error.response.data?.error?.message || 'Unknown error'}`);
            
            switch (error.response.status) {
                case 401:
                    console.log('💡 Suggestion: Check if your API key is correct and active');
                    break;
                case 429:
                    console.log('💡 Suggestion: You may have exceeded rate limits or quota');
                    break;
                case 400:
                    console.log('💡 Suggestion: Check the request format or parameters');
                    break;
            }
        } else if (error.code === 'ECONNABORTED') {
            console.log('💡 Request timed out - check your internet connection');
        } else {
            console.log('💡 Network error:', error.message);
        }
    }
}

testOpenAI().catch(console.error);