//
console.log('Function started');

// In your /api/gemini route, add:
app.post('/api/gemini', async (req, res) => {
    console.log('Received request:', req.body);
    
    // Add CORS headers explicitly
    res.header('Access-Control-Allow-Origin', '*');
    
    //
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
        provider: 'Mock AI (Testing)'
    });
});

app.post('/api/gemini', async (req, res) => {
    console.log('Request received');
    
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'No prompt provided' });
        }

        console.log('Processing with mock AI...');

        // MOCK AI RESPONSES for testing
        // We'll replace this with real AI once frontend is perfect
        
        const responses = {
            professional: (text) => {
                return text
                    .replace(/I think/gi, 'The evidence suggests')
                    .replace(/maybe/gi, 'potentially')
                    .replace(/kind of/gi, '')
                    .replace(/sort of/gi, '')
                    + '\n\nExecutive Summary: Analysis completed with strategic precision.';
            },
            anxiety: (text) => {
                return text
                    .replace(/I\'m sorry/gi, '')
                    .replace(/just wanted to/gi, 'I will')
                    .replace(/if that\'s okay/gi, '')
                    + '\n\nNote: Communication streamlined for clarity.';
            },
            journalism: (text) => {
                return `LEAD: ${text.split('.')[0]}.\n\nDETAILS: ${text.substring(text.indexOf('.') + 1).trim()}\n\nSOURCES: Analysis based on provided context.`;
            },
            creative: (text) => {
                return text + '\n\nThe words danced across consciousness, each syllable a brushstroke painting vivid imagery in the theatre of the mind.';
            }
        };

        // Detect mode from prompt (simple detection)
        let mode = 'professional';
        if (prompt.includes('anxiety') || prompt.includes('Anxiety')) mode = 'anxiety';
        if (prompt.includes('journalism') || prompt.includes('Journalism')) mode = 'journalism';
        if (prompt.includes('creative') || prompt.includes('Creative')) mode = 'creative';

        // Extract actual text (remove mode instructions)
        const actualText = prompt.split('\n').slice(-1)[0] || prompt;
        
        // Apply transformation
        const refinedText = responses[mode](actualText);
        
        console.log('Success');
        
        // Simulate slight delay (like real API)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        res.json({ response: refinedText });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            error: 'Processing failed',
            message: error.message 
        });
    }
});

export default app;
