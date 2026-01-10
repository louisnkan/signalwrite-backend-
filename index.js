const express = require('express');
const cors = require('cors');

const app = express();

// CORS Configuration - CRITICAL FIX
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://louisnkan.github.io',
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500'
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Allow if origin matches or is subdomain
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    
    callback(null, true); // TEMPORARY: Allow all for debugging
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Add explicit OPTIONS handler
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'SignalWrite Backend Running',
    model: 'Mixtral-8x7B via Groq',
    apiKeyConfigured: !!process.env.GROQ_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for debugging
app.get('/test', (req, res) => {
  console.log('TEST endpoint hit from:', req.headers.origin);
  res.json({ 
    message: 'Backend is reachable',
    cors: 'working',
    timestamp: new Date().toISOString()
  });
});

// POST test endpoint
app.post('/test', (req, res) => {
  console.log('POST TEST received:', req.body);
  res.json({ 
    message: 'POST working',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// Main refine endpoint
app.post('/refine', async (req, res) => {
  console.log('=== REFINE REQUEST RECEIVED ===');
  console.log('Time:', new Date().toISOString());
  console.log('Origin:', req.headers.origin);
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body).substring(0, 100));
  
  try {
    const { text, mode } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY not found');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Mode-specific prompts
    const prompts = {
      'professional': `Rewrite this text in a professional, polished business tone:

${text}

Rewritten text:`,
      
      'anxiety-neutralizer': `Rewrite this text with confident, assertive language. Remove any anxious or uncertain phrasing:

${text}

Confident version:`,
      
      'legal': `Rewrite this text using formal, precise legal language:

${text}

Legal version:`
    };

    const systemPrompt = prompts[mode] || prompts['professional'];

    console.log('🔄 Calling Groq API...');

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API Error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(500).json({ error: 'API authentication failed' });
      }
      if (response.status === 429) {
        return res.status(503).json({ error: 'Rate limit exceeded. Wait a moment.' });
      }
      
      return res.status(500).json({ 
        error: 'AI service error',
        details: errorText.substring(0, 200)
      });
    }

    const data = await response.json();
    console.log('✅ Groq response received');

    const refined = data.choices?.[0]?.message?.content?.trim() || text;

    res.json({
      refined: refined,
      original: text,
      mode: mode,
      model: 'mixtral-8x7b-groq'
    });

  } catch (error) {
    console.error('=== ERROR ===');
    console.error(error.message);
    
    res.status(500).json({
      error: 'Refinement failed',
      details: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
✅ SignalWrite Backend Running
   Port: ${PORT}
   API: ${process.env.GROQ_API_KEY ? 'Groq ✓' : 'Missing ❌'}
  `);
});

module.exports = app;
