const express = require('express');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// POST /api/ai/summarize
router.post('/summarize', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Text is too short to summarize (min 50 characters)' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(501).json({ error: 'AI summarization is not configured (missing GROQ_API_KEY)' });
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a concise summarizer. Summarize the given text in 2-4 bullet points. Use plain text, no markdown headers. Keep it brief and clear.',
          },
          {
            role: 'user',
            content: `Summarize this:\n\n${text.slice(0, 4000)}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[ai/summarize] Groq error:', err);
      return res.status(502).json({ error: 'AI service error. Please try again.' });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      return res.status(502).json({ error: 'No summary returned from AI' });
    }

    return res.json({ summary });
  } catch (err) {
    console.error('[ai/summarize]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
