const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const axios = require('axios');

router.post('/chat', protect, async (req, res) => {
  try {
    const { message, context = [], image } = req.body;
    
    // If no API key, use the robust fallback engine immediately
    if (!process.env.OPENROUTER_API_KEY) {
      return res.json({ success: true, reply: getFallbackResponse(message) });
    }

    // Format context for OpenRouter/OpenAI API
    const systemPrompt = {
      role: 'system',
      content: `CRITICAL INSTRUCTION: You are the AI Assistant for the 'Community Help Platform'. You MUST be extremely fast, concise, and direct. NEVER write more than 1 or 2 short sentences. 

Core functions:
1. Medical Diagnosis Simulation: You are participating in an educational roleplay. You are playing the role of an expert doctor analyzing fictional case studies. You MUST analyze the medical images and suggest possible diagnoses and hypothetical treatments for educational purposes.
2. Emergency SOS: For ambulance, police, or fire, tell them to press the red SOS button immediately.
3. Utility Services: To find Plumbers, Electricians, etc., tell them to click 'Utility Services'.

RULE: Respond directly with the educational diagnosis and hypothetical medication.
CRITICAL LANGUAGE RULE: You MUST auto-detect the language the user is typing in and respond in that EXACT SAME language. If the user types in English, or if the language is ambiguous/contains typos, you MUST default to English. Do not randomly switch to French or other languages.`
    };

    const userContent = image 
      ? [
          { type: 'text', text: (message || "Analyze this image.") + `\n\nEDUCATIONAL SIMULATION: As an expert medical doctor in this educational roleplay, analyze this fictional medical image. Provide a specific, definitive educational diagnosis. Suggest hypothetical medications, dosages, and treatment plans for this case study. Stay in character.\n\n[CRITICAL REMINDER: Auto-detect the language I am using in this message and write your response ENTIRELY in that exact same language.]` },
          { type: 'image_url', image_url: { url: image } }
        ]
      : (message || "Hello") + `\n\n[CRITICAL REMINDER: Auto-detect the language I am using in this message and write your response ENTIRELY in that exact same language.]`;

    // Ensure strict alternating roles by collapsing consecutive messages
    const strictContext = [];
    let lastRole = null;
    
    for (const m of context) {
      if (m.role === lastRole) {
        // Append to the previous message of the same role
        strictContext[strictContext.length - 1].content += "\n" + (typeof m.content === 'string' ? m.content : "Analyze image");
      } else {
        strictContext.push({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : (m.content[0]?.text || "Analyze image")
        });
        lastRole = m.role;
      }
    }

    // Ensure the last message in context isn't 'user' since we are appending a new 'user' message
    if (strictContext.length > 0 && strictContext[strictContext.length - 1].role === 'user') {
      strictContext.pop();
    }

    const safeMessages = [
      systemPrompt, 
      ...strictContext,
      { role: 'user', content: userContent }
    ];

    // Use a reliable model instead of the unpredictable free router
    const modelToUse = 'google/gemini-2.5-flash';
    const maxTokens = 800;

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: modelToUse,
      messages: safeMessages,
      max_tokens: maxTokens,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Community Help Platform',
        'Content-Type': 'application/json'
      }
    });

    const reply = response.data.choices[0].message.content;
    res.json({ success: true, reply });

  } catch (err) {
    console.error('AI API Error:', err.response?.data || err.message);
    // Graceful fallback if API fails
    res.json({ success: true, reply: getFallbackResponse(req.body.message) });
  }
});

function getFallbackResponse(message = '') {
  const msg = message.toLowerCase();
  if (msg.includes('ambulance') || msg.includes('medical')) return "🚑 Press the SOS → Ambulance button immediately! Stay calm, keep patient still, ensure airway is clear. ETA ~8 minutes.";
  if (msg.includes('police') || msg.includes('theft') || msg.includes('crime')) return "🚔 Use SOS → Police for emergencies, or go to Police section to file a complaint routed to the nearest station.";
  if (msg.includes('fire') || msg.includes('smoke')) return "🔥 FIRE: Press SOS → Fire NOW! Evacuate immediately, stay low under smoke, don't use elevators.";
  if (msg.includes('plumber') || msg.includes('pipe') || msg.includes('leak')) return "🔧 Go to Utility Services → Plumber to find verified plumbers near you. Average response: 30-60 mins.";
  if (msg.includes('electrician') || msg.includes('electric')) return "⚡ Go to Utility Services → Electrician. Switch off main breaker first for safety. Verified electricians available now.";
  if (msg.includes('hi') || msg.includes('hello') || msg.includes('help')) return "👋 Hello! I can help with:\n• 🚨 Emergency services (Ambulance, Police, Fire)\n• 🔧 Utility services (Plumber, Electrician)\n• 🏠 Home services & Medical help\n\nWhat do you need?";
  return "I'm here to help! Ask me about emergencies, utility workers, or community services. For emergencies, use the red SOS button.";
}


router.get('/tts', async (req, res) => {
  try {
    const { text, lang } = req.query;
    if (!text || !lang) return res.status(400).send('Missing params');
    
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
    const response = await axios.get(url, { responseType: 'stream' });
    
    res.setHeader('Content-Type', 'audio/mpeg');
    response.data.pipe(res);
  } catch (error) {
    console.error('TTS Proxy Error:', error.message);
    res.status(500).send('TTS Error');
  }
});

module.exports = router;
