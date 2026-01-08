const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors({
    origin: '*',  // Allow all origins for now (fix later)
    methods: ['GET', 'POST', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'SignalWrite Backend',
        model: 'Mixtral-8x7B',
        timestamp: new Date().toISOString(),
        groq_key_present: !!GROQ_API_KEY
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// Refine endpoint
app.post('/refine', async (req, res) => {
    console.log('Refine request received:', req.body);

    try {
        const { text, mode } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (!GROQ_API_KEY) {
            return res.status(500).json({ 
                error: 'Groq API key not configured',
                hint: 'Add GROQ_API_KEY to Vercel environment variables'
            });
        }

        const systemMessages = {
            'professional': 'You are a professional editor. Refine the following text to be clear, confident, and business-ready. Remove hedging words like "maybe", "perhaps", "I think". Return ONLY the refined text with no explanations.',
            'anxiety-neutralizer': 'You are an expert editor. Rewrite the following text to remove all anxious or apologetic language. Remove words like "sorry", "just", "if you don\'t mind". Make it direct and confident. Return ONLY the refined text with no explanations.',
            'legal': 'You are a legal writing expert. Rewrite the following text in formal legal style with precise language and proper structure. Return ONLY the refined text with no explanations.'
        };

        const systemPrompt = systemMessages[mode] || systemMessages['professional'];

        console.log('Calling Groq API...');

        const groqResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        console.log('Groq response status:', groqResponse.status);

        if (!groqResponse.ok) {
            const errorText = await groqResponse.text();
            console.error('Groq error:', errorText);
            return res.status(groqResponse.status).json({ 
                error: 'Groq API error',
                details: errorText,
                status: groqResponse.status
            });
        }

        const data = await groqResponse.json();
        console.log('Groq success');

        const refined = data.choices?.[0]?.message?.content?.trim();

        if (!refined) {
            return res.status(500).json({ 
                error: 'No response from AI',
                raw_response: data
            });
        }

        res.json({
            refined: refined,
            model: 'Mixtral-8x7B',
            mode: mode
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        path: req.path,
        method: req.method,
        available: ['GET /', 'GET /test', 'POST /refine']
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Groq key present: ${!!GROQ_API_KEY}`);
});

module.exports = app;
