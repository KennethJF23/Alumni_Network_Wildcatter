const { callLLM, parseJSON } = require('./llm');

const SYSTEM = `You convert a user's request about finding college alumni into JSON.
Return ONLY a JSON object with these keys:
- college: string (the college name as the user wrote it, or null)
- aliases: array of up to 3 other names this college is commonly listed under on LinkedIn/websites
  (the acronym and the full official name, e.g. ["SFIT","St. Francis Institute of Technology"]).
  Only include aliases you are confident about. Empty array if unsure.
- city: string or null
- titles: array of up to 4 job-title search keywords that match the request
  (e.g. for "VPs or above": ["Vice President","VP","Director","CEO"]). Empty array if no title was asked for.
- minSeniority: one of "Entry","Senior","Manager","Director","VP","C-level", or null if no seniority was asked for.
No explanations, no markdown.`;

async function parseQuery(userText) {
  const out = await callLLM([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userText },
  ]);
  const parsed = parseJSON(out);
  return {
    college: parsed.college || null,
    aliases: Array.isArray(parsed.aliases) ? parsed.aliases.slice(0, 3) : [],
    city: parsed.city || null,
    titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 4) : [],
    minSeniority: parsed.minSeniority || null,
  };
}

module.exports = { parseQuery };