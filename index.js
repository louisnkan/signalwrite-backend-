const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors({
    origin: ['https://louisnkan.github.io', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'SignalWrite Backend Running',
        model: 'Mixtral-8x7B via Groq',
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!GROQ_API_KEY
    });
});

// Refine endpoint
app.post('/refine', async (req, res) => {
    try {
        const { text, mode } = req.body;
        
        // Validation
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Invalid text provided' });
        }

        if (!GROQ_API_KEY) {
            console.error('GROQ_API_KEY not configured');
            return res.status(500).json({ error: 'API key not configured. Please contact support.' });
        }

        // Mode prompts
        const prompts = {
            'professional': `You are a professional editor. Refine this text to be clear, confident, and business-ready. Remove hedging language like "maybe", "perhaps", "I think". Make it direct and authoritative. Only return the refined text, nothing else.

Text: ${text}`,
            
            'anxiety-neutralizer': `You are an expert editor. Rewrite this text to remove all anxious, apologetic, or worried language. Remove phrases like "sorry", "just wondering", "if you don't mind". Make it assertive and direct while staying polite. Only return the refined text, nothing else.

Text: ${text}`,
            
            'legal': `You are a legal writing expert. Rewrite this text in formal legal style. Use precise language, avoid ambiguity, maintain factual tone. Only return the refined text, nothing else.

Text: ${text}`
        };

        const selectedPrompt = prompts[mode] || prompts['professional'];

        console.log('Calling Groq API...');

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
                        role: "system",
                        content: "You are a professional writing assistant. Refine text as instructed. Return only the refined text."
                    },
                    {
                        role: "user",
                        content: selectedPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                top_p: 1,
                stream: false
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Groq API error:', response.status, errorBody);
            
            if (response.status === 401) {
                return res.status(500).json({ 
                    error: 'API authentication failed. Please check API key configuration.' 
                });
            }
            
            if (response.status === 429) {
                return res.status(429).json({ 
                    error: 'Rate limit reached. Please try again in a moment.' 
                });
            }
            
            return res.status(500).json({ 
                error: `AI service error: ${response.status}` 
            });
        }

        const data = await response.json();
        console.log('Groq response received');

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected Groq response format:', JSON.stringify(data));
            return res.status(500).json({ 
                error: 'Unexpected response format from AI service' 
            });
        }

        const refined = data.choices[0].message.content.trim();

        if (!refined) {
            return res.status(500).json({ 
                error: 'AI returned empty response' 
            });
        }

        res.json({
            refined: refined,
            model: 'Mixtral-8x7B',
            tokens: data.usage || {}
        });

    } catch (error) {
        console.error('Server error:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: ['GET /', 'POST /refine']
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ SignalWrite backend running on port ${PORT}`);
    console.log(`✅ API Key configured: ${!!GROQ_API_KEY}`);
});

module.exports = app;
