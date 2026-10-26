// Thin OpenRouter client + JSON helper
async function callLLM(messages, { temperature = 0 } = {}) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Alumni Network MVP',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages,
      temperature,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall back to the first JSON object/array found in the text
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (!match) throw new Error('LLM did not return valid JSON');
    return JSON.parse(match[0]);
  }
}

module.exports = { callLLM, parseJSON };