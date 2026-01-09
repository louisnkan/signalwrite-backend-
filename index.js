const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

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

app.get('/', (req, res) => {
    res.json({ 
        status: 'SignalWrite Backend Running',
        model: 'Mixtral-8x7B via Groq',
        timestamp: new Date().toISOString(),
        groq_key_present: !!GROQ_API_KEY
    });
});

app.post('/refine', async (req, res) => {
    try {
        const { text, mode } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (!GROQ_API_KEY) {
            return res.status(500).json({ 
                error: 'Groq API key not configured. Please add GROQ_API_KEY to environment variables.' 
            });
        }

        const prompts = {
            'professional': `Refine this text to be professional and business-ready. Remove hedging words like "maybe", "perhaps", "I think". Make it direct and confident:

"${text}"

Provide only the refined version:`,
            
            'anxiety-neutralizer': `Rewrite this to remove anxious or apologetic language. Remove "sorry", "just wondering", "if you don't mind". Make it assertive and direct:

"${text}"

Provide only the confident version:`,
            
            'legal': `Rewrite this in formal legal style with precise language and professional structure:

"${text}"

Provide only the legal version:`
        };

        const systemPrompt = prompts[mode] || prompts['professional'];

        console.log('Calling Groq API...');

        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [{
                    role: "user",
                    content: systemPrompt
                }],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq error:', response.status, errorText);
            return res.status(500).json({ 
                error: `Groq API error: ${response.status}` 
            });
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0]) {
            console.error('Invalid Groq response:', data);
            return res.status(500).json({ error: 'Invalid AI response' });
        }

        const refined = data.choices[0].message.content.trim();

        if (!refined) {
            return res.status(500).json({ error: 'AI returned empty response' });
        }

        console.log('Refinement successful');
        res.json({
            refined: refined,
            model: 'Mixtral-8x7B'
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: `Server error: ${error.message}` 
        });
    }
});

app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
