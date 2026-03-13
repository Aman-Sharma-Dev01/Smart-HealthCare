import express from 'express';

const router = express.Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// This is the predefined response for non-health related questions.
const NON_HEALTH_RESPONSE = 'I am a healthcare assistant and can only answer questions about health, medicine, and wellness. Please ask a health-related question.';
const NON_BASIC_RESPONSE = 'This issue may not be basic. Please book an appointment with a doctor for proper evaluation. If symptoms are severe or sudden, seek emergency care immediately.';

const HEALTH_KEYWORDS = [
  'health', 'symptom', 'fever', 'cold', 'cough', 'headache', 'stomach', 'pain', 'rash',
  'allergy', 'blood pressure', 'sugar', 'diabetes', 'infection', 'vomit', 'nausea',
  'medical', 'doctor', 'wellness', 'sleep', 'diet', 'exercise', 'dehydration', 'injury'
];

const NON_BASIC_KEYWORDS = [
  'chest pain', 'shortness of breath', 'breathing trouble', 'stroke', 'heart attack',
  'fainting', 'seizure', 'blood in stool', 'blood in urine', 'severe pain', 'unconscious',
  'pregnancy complication', 'high fever 3 days', 'persistent fever', 'fracture',
  'suicidal', 'self harm', 'overdose', 'severe bleeding', 'vision loss', 'paralysis'
];

const BASIC_KEYWORDS = [
  'cold', 'common cold', 'sore throat', 'runny nose', 'blocked nose', 'cough',
  'fever', 'mild fever', 'headache', 'minor headache', 'body ache', 'fatigue',
  'acidity', 'gas', 'constipation', 'hydration', 'sleep tips', 'diet tips',
  'stress management', 'basic first aid', 'healthy routine', 'general wellness'
];

const includesAny = (text, words) => words.some((w) => text.includes(w));

const classifyMessage = (message) => {
  const normalized = message.toLowerCase();

  if (!includesAny(normalized, HEALTH_KEYWORDS)) {
    return 'non-health';
  }

  if (includesAny(normalized, NON_BASIC_KEYWORDS)) {
    return 'non-basic';
  }

  if (includesAny(normalized, BASIC_KEYWORDS)) {
    return 'basic';
  }

  // Safety-first: unknown health queries are treated as non-basic.
  return 'non-basic';
};

router.post('/ask', async (req, res) => {
  const userMessage = req.body?.message?.trim();

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OpenRouter API key is not configured on server.' });
  }

  const messageClass = classifyMessage(userMessage);

  if (messageClass === 'non-health') {
    return res.json({ reply: NON_HEALTH_RESPONSE });
  }

  if (messageClass === 'non-basic') {
    return res.json({ reply: NON_BASIC_RESPONSE });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
        'X-Title': 'Smart-HealthCare Chat Assistant',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are Smart-HealthCare Basic Assistant.

Goal:
Provide accurate, practical, and safe guidance for only basic health concerns.

Scope:
- Support mild, self-limiting issues (for example mild cold, mild fever, headache, hydration, rest, sleep, nutrition, basic wellness habits).
- Do not diagnose diseases.
- Do not prescribe treatment plans.

Strict Safety Rules:
1) Never provide medicine names, drug combinations, or dosage instructions.
2) Never suggest antibiotics, steroids, or prescription treatment.
3) If user asks for medicines or dosage, politely refuse and advise booking an appointment.
4) If there are any warning signs or worsening symptoms, advise prompt doctor consultation.

Response Quality Rules:
- Be medically cautious, clear, and calm.
- Keep answer short but useful (about 80-140 words).
- Use plain language.
- Mention 3-5 safe self-care actions.
- End with a brief escalation line: when to book an appointment.

Output Structure:
1) Short reassurance line.
2) Practical self-care steps.
3) Red-flag or persistence advice (book appointment if not improving).`
          },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 220,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data?.error?.message || 'OpenRouter request failed.';
      return res.status(502).json({ error: errorMsg });
    }

    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    
    res.json({ reply });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to get response from the AI service.' });
  }
});

export default router;
