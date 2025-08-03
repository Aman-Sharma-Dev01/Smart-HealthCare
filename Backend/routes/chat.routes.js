import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

router.post('/ask', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful healthcare assistant. You give safe, general guidance for symptoms but do not diagnose.' },
          { role: 'user', content: userMessage }
        ],
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ reply });
  } catch (error) {
    console.error('OpenRouter Error:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

export default router;
