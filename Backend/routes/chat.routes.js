import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// This is the predefined response for non-health related questions.
const NON_HEALTH_RESPONSE = 'I am a healthcare assistant and can only answer questions about health, medicine, and wellness. Please ask a health-related question.';

router.post('/ask', async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    // --- This single API call now handles both classification and response ---
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: `You are a specialized healthcare assistant. Your primary function is to determine if a user's query is about health, medicine, or wellness.
- If the query IS health-related, provide safe, general guidance. Do not diagnose.
- If the query is NOT health-related, you MUST respond with this exact sentence and nothing more: "${NON_HEALTH_RESPONSE}"
Do not answer, acknowledge, or engage with any non-health topics whatsoever.`
          },
          { role: 'user', content: userMessage }
        ],
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    
    res.json({ reply });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to get response from the AI service.' });
  }
});

export default router;
