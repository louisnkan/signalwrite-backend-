const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const HUGGINGFACE_API_KEY = PROCESS.env.HUGGINGFACE_API_KEY;
const API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

app.post('/refine', async (req, res) => {
    try {
        const { text, mode } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const prompts = {
            'professional': `<s>[INST] You are a professional editor. Refine this text to be clear, confident, and business-ready. Remove hedging language like "maybe", "perhaps", "I think". Make it direct and authoritative. Keep the core message but elevate the language.

Text: ${text}

Refined version: [/INST]`,
            
            'anxiety-neutralizer': `<s>[INST] You are an expert editor specializing in confident communication. Rewrite this text to remove all anxious, apologetic, or worried language. Remove phrases like "sorry", "just wondering", "if you don't mind". Make it assertive and direct while staying polite.

Text: ${text}

Confident version: [/INST]`,
            
            'legal': `<s>[INST] You are a legal writing expert. Rewrite this text in formal legal style. Use precise language, avoid ambiguity, maintain factual tone, and structure it professionally. Include necessary qualifiers for liability protection.

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
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        let refinedText = '';
        if (Array.isArray(data) && data.length > 0) {
            refinedText = data[0].generated_text || '';
        } else if (data.generated_text) {
            refinedText = data.generated_text;
        }

        // Clean up response
        refinedText = refinedText
            .replace('[/INST]', '')
            .replace('</s>', '')
            .trim();

        res.json({
            refined: refinedText,
            model: 'Mistral-7B-Instruct-v0.2'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: `Server error: ${error.message}` 
        });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'SignalWrite Backend Running',
        model: 'Mistral-7B-Instruct-v0.2'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
