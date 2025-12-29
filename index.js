console.log('Function started');

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

// EXISTING ENDPOINT (unchanged)
app.post('/api/gemini', async (req, res) => {
    console.log('Gemini request received');
    
    res.header('Access-Control-Allow-Origin', '*');
    
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'No prompt provided' });
        }

        console.log('Processing with mock AI...');

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

        let mode = 'professional';
        if (prompt.includes('anxiety') || prompt.includes('Anxiety')) mode = 'anxiety';
        if (prompt.includes('journalism') || prompt.includes('Journalism')) mode = 'journalism';
        if (prompt.includes('creative') || prompt.includes('Creative')) mode = 'creative';

        const actualText = prompt.split('\n').slice(-1)[0] || prompt;
        const refinedText = responses[mode](actualText);
        
        console.log('Success');
        
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

// NEW ENDPOINT for SignalWrite Editor
app.post('/refine', async (req, res) => {
    console.log('Refine request received:', req.body);
    
    try {
        const { text, mode } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        console.log(`Processing with ${mode} mode...`);

        const responses = {
            professional: (t) => {
                return t
                    .replace(/I think/gi, 'The evidence suggests')
                    .replace(/maybe/gi, 'potentially')
                    .replace(/kind of/gi, '')
                    .replace(/sort of/gi, '')
                    .replace(/I was thinking/gi, 'Consider')
                    .replace(/probably/gi, '');
            },
            'anxiety-neutralizer': (t) => {
                return t
                    .replace(/I\'m sorry/gi, '')
                    .replace(/just wanted to/gi, 'I will')
                    .replace(/if that\'s okay/gi, '')
                    .replace(/I hope this is alright/gi, '')
                    .replace(/maybe we could/gi, 'Let\'s');
            },
            journalism: (t) => {
                const sentences = t.split('.').filter(s => s.trim());
                return sentences.length > 0 
                    ? `${sentences[0].trim()}. ${sentences.slice(1).join('. ').trim()}`
                    : t;
            },
            creative: (t) => {
                return t + ' The words shimmered with possibility, each phrase a doorway to deeper meaning.';
            }
        };

        const selectedMode = mode || 'professional';
        const transform = responses[selectedMode] || responses.professional;
        
        const refined = transform(text);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.json({ refined });
        
    } catch (error) {
        console.error('Refine error:', error.message);
        res.status(500).json({ 
            error: 'Refinement failed',
            message: error.message 
        });
    }
});

export default app;
