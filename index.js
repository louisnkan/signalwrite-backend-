import express from 'express';

const app = express();

// CORS - Allow your frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        timestamp: new Date().toISOString()
    });
});

// Rate limiting (simple in-memory)
const requestCounts = new Map();
const RATE_LIMIT = 100; // requests per hour
const RATE_WINDOW = 3600000; // 1 hour in ms

function checkRateLimit(ip) {
    const now = Date.now();
    const userRequests = requestCounts.get(ip) || [];
    
    // Remove old requests
    const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
    
    if (recentRequests.length >= RATE_LIMIT) {
        return false;
    }
    
    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);
    return true;
}

// Refinement endpoint
app.post('/refine', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        
        // Check rate limit
        if (!checkRateLimit(ip)) {
            return res.status(429).json({ 
                error: 'Rate limit exceeded',
                message: 'Please try again in an hour'
            });
        }
        
        const { text, mode } = req.body;
        
        // Validation
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ 
                error: 'Invalid input',
                message: 'Text is required'
            });
        }
        
        if (text.length > 10000) {
            return res.status(400).json({ 
                error: 'Text too long',
                message: 'Maximum 10,000 characters'
            });
        }
        
        // Refinement logic
        const refinements = {
            'professional': (t) => {
                return t
                    .replace(/\bI think\b/gi, 'The evidence suggests')
                    .replace(/\bmaybe\b/gi, 'potentially')
                    .replace(/\bkind of\b/gi, '')
                    .replace(/\bsort of\b/gi, '')
                    .replace(/\bI was thinking\b/gi, 'Consider')
                    .replace(/\bprobably\b/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            },
            'anxiety-neutralizer': (t) => {
                return t
                    .replace(/\bI'm sorry\b/gi, '')
                    .replace(/\bSorry\b/gi, '')
                    .replace(/\bjust wanted to\b/gi, 'I will')
                    .replace(/\bif that's okay\b/gi, '')
                    .replace(/\bI hope this is alright\b/gi, '')
                    .replace(/\bmaybe we could\b/gi, "Let's")
                    .replace(/\bjust\b/gi, '')
                    .replace(/\bwondering if\b/gi, '')
                    .replace(/\bif you don't mind\b/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            },
            'legal': (t) => {
                let refined = t
                    .replace(/\byou owe\b/gi, 'remains outstanding')
                    .replace(/\bpay me\b/gi, 'remit payment')
                    .replace(/\bI need\b/gi, 'We respectfully request')
                    .replace(/\bASAP\b/gi, 'at your earliest convenience')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                if (!refined.includes('Per our agreement')) {
                    refined += '\n\nPer our agreement, please address this matter within seven (7) business days.';
                }
                
                return refined;
            }
        };
        
        const selectedMode = mode || 'professional';
        const refineFunction = refinements[selectedMode] || refinements['professional'];
        
        const refined = refineFunction(text);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 800));
        
        res.json({ 
            refined,
            mode: selectedMode,
            originalLength: text.length,
            refinedLength: refined.length
        });
        
    } catch (error) {
        console.error('Refine error:', error);
        res.status(500).json({ 
            error: 'Processing failed',
            message: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        message: 'Endpoint does not exist'
    });
});

export default app;
