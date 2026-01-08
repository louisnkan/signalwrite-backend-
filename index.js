const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// CORS Configuration
app.use(cors({
    origin: [
        'https://louisnkan.github.io',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Health check endpoint
app.get('/', (req, res) => {
    // DEBUG ENDPOINT - Test Groq connection
app.get('/test-groq', async (req, res) => {
    try {
        if (!GROQ_API_KEY) {
            return res.json({ 
                error: 'GROQ_API_KEY not set',
                env_vars: Object.keys(process.env).filter(k => k.includes('GROQ'))
            });
        }

        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [{ role: "user", content: "Say 'Hello from Groq!'" }],
                max_tokens: 50
            })
        });

        const data = await response.json();
        
        res.json({
            success: true,
            groq_status: response.status,
            groq_response: data,
            key_present: !!GROQ_API_KEY,
            key_preview: GROQ_API_KEY ? GROQ_API_KEY.substring(0, 7) + '...' : 'none'
        });
    } catch (error) {
        res.json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Refine endpoint
app.post('/refine', async (req, res) => {
    try {
        const { text, mode } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Enhanced prompts for each mode
        const prompts = {
            'professional': `You are a professional editor. Refine this text to be clear, confident, and business-ready. Remove hedging language like "maybe", "perhaps", "I think". Make it direct and authoritative while keeping the core message.

Text: "${text}"

Provide ONLY the refined version with no explanation:`,
            
            'anxiety-neutralizer': `You are an expert editor specializing in confident communication. Rewrite this text to remove ALL anxious, apologetic, or worried language. Remove phrases like "sorry", "just wondering", "if you don't mind". Make it assertive and direct while staying polite.

Text: "${text}"

Provide ONLY the confident version with no explanation:`,
            
            'legal': `You are a legal writing expert. Rewrite this text in formal legal style. Use precise language, avoid ambiguity, maintain factual tone, and structure it professionally with appropriate legal qualifiers.

Text: "${text}"

Provide ONLY the legal version with no explanation:`
        };

        const systemPrompt = prompts[mode] || prompts['professional'];

        console.log('Sending request to Groq...');

        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [
                    {
                        role: "user",
                        content: systemPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                top_p: 1,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API error:', response.status, errorText);
            
            return res.status(response.status).json({ 
                error: `Groq API error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();
        
        console.log('Groq response:', data);

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected Groq response format:', data);
            return res.status(500).json({ 
                error: 'Unexpected response format from AI' 
            });
        }

        const refined = data.choices[0].message.content.trim();

        if (!refined) {
            return res.status(500).json({ 
                error: 'AI returned empty response' 
            });
        }

        console.log('Refinement successful');

        res.json({
            refined: refined,
            model: 'Mixtral-8x7B',
            mode: mode
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: `Server error: ${error.message}` 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: ['GET /', 'POST /refine']
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SignalWrite backend running on port ${PORT}`);
    console.log(`Using Groq API with Mixtral-8x7B model`);
});

module.exports = app;
