import express from 'express';

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

app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        hasApiKey: !!process.env.HUGGINGFACE_API_KEY,
        provider: 'Hugging Face (FREE)'
    });
});

app.post('/api/gemini', async (req, res) => {
    console.log('Request received');
    
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'No prompt provided' });
        }

        console.log('Calling Hugging Face API');

        const response = await fetch(
            'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 1000,
                        temperature: 0.7,
                        top_p: 0.9,
                        return_full_text: false
                    }
                })
            }
        );

        const data = await response.json();
        
        console.log('API Response:', data);

        if (!response.ok) {
            console.error('API Error:', data);
            return res.status(500).json({ 
                error: 'API error',
                details: data 
            });
        }

        // Handle different response formats
        let text;
        if (Array.isArray(data) && data[0]?.generated_text) {
            text = data[0].generated_text;
        } else if (data.generated_text) {
            text = data.generated_text;
        } else {
            text = JSON.stringify(data);
        }
        
        console.log('Success');
        
        res.json({ response: text });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message 
        });
    }
});

export default app;
