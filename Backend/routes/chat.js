import express from 'express';
import fetch from 'node-fetch'; // v2
const router = express.Router();

const OPENROUTER_API_KEY = 'YOUR_API_KEY_HERE';

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
          { role: 'system', content: 'You are a healthcare assistant that explains symptoms and possible causes. You are not a doctor.' },
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
