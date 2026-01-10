const express = require('express');
const cors = require('cors');

const app = express();

// CORS Configuration
app.use(cors({
  origin: [
    'https://louisnkan.github.io',
    'http://localhost:3000',
    'http://localhost:5500'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

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

// Main refine endpoint
app.post('/refine', async (req, res) => {
  console.log('=== REFINE REQUEST ===');
  console.log('Time:', new Date().toISOString());
  
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
