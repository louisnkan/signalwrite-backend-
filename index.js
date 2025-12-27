import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://louisnkan.github.io');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        hasApiKey: !!process.env.GEMINI_API_KEY
    });
});

app.post('/api/gemini', async (req, res) => {
    console.log('Request received');
    
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'No prompt provided' });
        }

        console.log('Calling Gemini API directly');

        // Direct API call - no SDK
        const apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
        
        const response = await fetch(`${apiUrl}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        const data = await response.json();
        
        console.log('Response status:', response.status);

        if (!response.ok) {
            console.error('API error:', data);
            return res.status(500).json({ 
                error: 'Gemini API error',
                details: data 
            });
        }

        const text = data.candidates[0].content.parts[0].text;
        
        console.log('Success');
        
        res.json({ response: text });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default app;
