import express from 'express';
import OpenAI from 'openai';

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

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        hasApiKey: !!process.env.OPENAI_API_KEY,
        provider: 'OpenAI'
    });
});

app.post('/api/gemini', async (req, res) => {
    console.log('Request received');
    
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'No prompt provided' });
        }

        console.log('Calling OpenAI API');

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "user", content: prompt }
            ]
        });
        
        const text = completion.choices[0].message.content;
        
        console.log('Success');
        
        res.json({ response: text });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default app;
