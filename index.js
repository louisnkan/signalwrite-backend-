import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

// CORS - Allow your GitHub Pages
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

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        hasApiKey: !!process.env.GEMINI_API_KEY
    });
});

/api/gemini endpoint
// Test endpoint to list available models
app.get('/api/test-models', async (req, res) => {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/gemini', async (req, res) => {
    console.log('Request received:', req.body);
    
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'No prompt provided' });
        }

        // Direct API call instead of using SDK
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
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
            }
        );

        const data = await response.json();
        
        console.log('Gemini response:', data);

        if (!response.ok) {
            console.error('Gemini API error:', data);
            return res.status(500).json({ 
                error: 'Gemini API error',
                details: data 
            });
        }

        // Extract text from response
        const text = data.candidates[0].content.parts[0].text;
        
        console.log('Success');
        
        res.json({ response: text });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message 
        });
    }
});

export default app;
