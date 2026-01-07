const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// CORS - ALLOW GITHUB PAGES
app.use(cors({
    origin: [
        'https://louisnkan.github.io',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

app.get('/', (req, res) => {
    res.json({ 
        status: 'SignalWrite Backend Running',
        model: 'Mistral-7B-Instruct-v0.2',
        timestamp: new Date().toISOString()
    });
});

app.post('/refine', async (req, res) => {
    try {
        const { text, mode } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (!HUGGINGFACE_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const prompts = {
            'professional': `<s>[INST] You are a professional editor. Refine this text to be clear, confident, and business-ready. Remove hedging language like "maybe", "perhaps", "I think". Make it direct and authoritative.

Text: ${text}

Refined version: [/INST]`,
            
            'anxiety-neutralizer': `<s>[INST] You are an expert editor. Rewrite this text to remove all anxious, apologetic, or worried language. Remove phrases like "sorry", "just wondering", "if you don't mind". Make it assertive and direct while staying polite.

Text: ${text}

Confident version: [/INST]`,
            
            'legal': `<s>[INST] You are a legal writing expert. Rewrite this text in formal legal style. Use precise language, avoid ambiguity, maintain factual tone.

Text: ${text}

Legal version: [/INST]`
        };

        const prompt = prompts[mode] || prompts['professional'];

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 500,
                    temperature: 0.7,
                    top_p: 0.95,
                    do_sample: true,
                    return_full_text: false
                }
            })
        });

        if (!response.ok) {
            if (response.status === 503) {
                return res.status(503).json({ 
                    error: 'Model is loading. Please wait 20 seconds and try again.' 
                });
            }
            return res.status(response.status).json({ 
                error: `AI API error: ${response.status}` 
            });
        }

        const data = await response.json();
        
        let refinedText = '';
        if (Array.isArray(data) && data.length > 0) {
            refinedText = data[0].generated_text || '';
        } else if (data.generated_text) {
            refinedText = data.generated_text;
        }

        refinedText = refinedText
            .replace('[/INST]', '')
            .replace('</s>', '')
            .trim();

        if (!refinedText) {
            return res.status(500).json({ 
                error: 'AI returned empty response' 
            });
        }

        res.json({
            refined: refinedText,
            model: 'Mistral-7B-Instruct-v0.2'
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: `Server error: ${error.message}` 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SignalWrite backend running on port ${PORT}`);
});

module.exports = app;
