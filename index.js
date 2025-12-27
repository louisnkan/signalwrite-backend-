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
// Ultra-simple test endpoint
app.post('/api/test', async (req, res) => {
    try {
        res.json({ message: 'Test successful', body: req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/api/gemini endpoint
// Test endpoint to list available models
app.post('/api/gemini', async (req, res) => {
    console.log('=== REQUEST START ===');
    console.log('Body:', JSON.stringify(req.body));
    console.log('Has API Key:', !!process.env.GEMINI_API_KEY);
    
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            console.log('ERROR: No prompt provided');
            return res.status(400).json({ error: 'No prompt provided' });
        }

        console.log('Prompt received:', prompt.substring(0, 50) + '...');
        console.log('Calling Gemini API...');

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        
        console.log('API URL (key hidden):', apiUrl.replace(/key=.+/, 'key=***'));

        const fetchResponse = await fetch(apiUrl, {
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

        console.log('Fetch completed. Status:', fetchResponse.status);

        const data = await fetchResponse.json();
        
        console.log('Response data:', JSON.stringify(data).substring(0, 200));

        if (!fetchResponse.ok) {
            console.error('Gemini API returned error:', JSON.stringify(data));
            return res.status(500).json({ 
                error: 'Gemini API error',
                status: fetchResponse.status,
                details: data 
            });
        }

        // Check if response has expected structure
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Unexpected response structure:', JSON.stringify(data));
            return res.status(500).json({ 
                error: 'Unexpected API response structure',
                data: data
            });
        }

        const text = data.candidates[0].content.parts[0].text;
        
        console.log('Success! Response length:', text.length);
        console.log('=== REQUEST END ===');
        
        res.json({ response: text });
        
    } catch (error) {
        console.error('=== CRITICAL ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('=== ERROR END ===');
        
        res.status(500).json({ 
            error: 'Server error',
            message: error.message,
            name: error.name
        });
    }
});

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
