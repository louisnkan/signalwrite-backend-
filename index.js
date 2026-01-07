const express = require('express');
const cors = require('cors');

const app = express();

// CORS - Must be BEFORE routes
app.use(cors({
    origin: ['https://louisnkan.github.io', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept']
}));

// Body parser - Must be BEFORE routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

// Health check - Root route
app.get('/', (req, res) => {
    res.json({ 
        status: 'SignalWrite Backend Running',
        model: 'Mistral-7B-Instruct-v0.2',
        timestamp: new Date().toISOString(),
        endpoints: ['/refine']
    });
});

// Main refine endpoint
app.post('/refine', async (req, res) => {
    console.log('Refine request received:', req.body);
    
    try {
        const { text, mode } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (!HUGGINGFACE_API_KEY) {
            console.error('HUGGINGFACE_API_KEY not set!');
            return res.status(500).json({ error: 'API key not configured' });
        }

        const prompts = {
            'professional': `<s>[INST] You are a professional editor. Refine this text to be clear, confident, and business-ready. Remove hedging language like "maybe", "perhaps", "I think". Make it direct and authoritative. Keep the core message.

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

        console.log('Calling Hugging Face API...');
        
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

        console.log('HF API status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('HF API error:', errorText);
            
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
        console.log('HF API response:', data);
        
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
            console.error('Empty refined text');
            return res.status(500).json({ 
                error: 'AI returned empty response' 
            });
        }

        console.log('Success! Refined text length:', refinedText.length);

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

// Error handling
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Route not found:', req.method, req.path);
    res.status(404).json({ 
        error: 'Endpoint not found',
        available: ['GET /', 'POST /refine']
    });
});

// Export for Vercel
module.exports = app;
