const { callLLM, parseJSON } = require('./llm');

const BATCH_SIZE = 12;
const MAX_RESULTS = 36;
const RELATIONSHIPS = ['alumnus', 'employee', 'student', 'unclear'];

const SYSTEM = (college) => `You extract alumni records from web search results.
Target college: "${college}".
Input is a JSON array of search results: {idx, title, link, snippet}.
Return ONLY a JSON array. One item per result that is an individual person:
{
  "idx": number,
  "name": string,
  "title": string|null,
  "company": string|null,
  "city": string|null,
  "seniority": "C-level"|"VP"|"Director"|"Manager"|"Senior"|"Entry"|"Unknown",
  "graduationYear": string|null,
  "email": string|null,
  "phone": string|null,
  "relationship": "alumnus"|"employee"|"student"|"unclear",
  "collegeInSnippet": boolean
}

Rules for "relationship" (this is the most important field):
- "alumnus": the college appears as a SCHOOL the person attended or graduated from.
  Evidence: "Education: <college>", "Attended <college>", a degree or batch year at the college,
  the words alumnus/alumni/graduate, or the college listed next to a DIFFERENT current employer
  (e.g. "Name. <college>. Capgemini. <college>."). Also: a named person with a job at another organisation
  featured on a page about the college (testimonial or notable-alumni list).
- "employee": the college is the person's EMPLOYER or they hold a position there.
  Evidence: title "at <college>", "Experience: <college>" as the only link, roles like Professor, Lecturer,
  Principal, HOD, Registrar, Placement Officer, HR or Manager at the college.
  If the college appears only as an employer and there is NO education evidence, choose "employee".
- "student": currently studying ("Student at", "Pursuing", future graduation year).
- "unclear": you cannot tell. Prefer "unclear" over guessing.
- A person who both studied and works at the college is "alumnus" only if the snippet shows an education entry.

Other rules:
- Any result whose link contains "linkedin.com/in/" is an individual person's profile: always include it.
  LinkedIn titles usually look like "Name - Title - Company | LinkedIn". Take the name before the first " - ".
- "company" is the person's CURRENT EMPLOYER. Never put the college there unless it really is their employer.
- Other pages (college sites, news, directories): include only if they clearly describe one named individual.
  Omit company pages, lists and generic articles.
- Use ONLY the text provided. Never guess or invent a field. Use null when a field is not present.
- email and phone only if they literally appear in the text.
- collegeInSnippet is true only if the target college is mentioned in that result's title or snippet.
- Founder / Owner / CEO / CTO / CFO / MD = "C-level".
No explanations, no markdown.`;

async function extractBatch(college, batch, batchNo) {
  const payload = batch.map((r, i) => ({
    idx: i,
    title: r.title,
    link: r.link,
    snippet: r.snippet,
  }));

  const out = await callLLM([
    { role: 'system', content: SYSTEM(college) },
    { role: 'user', content: JSON.stringify(payload) },
  ]);

  if (process.env.DEBUG_LLM) {
    console.log(`EXTRACT RAW [batch ${batchNo}]:`, out);
  }

  let items = parseJSON(out);
  if (!Array.isArray(items)) {
    // some models wrap the array in an object
    items = items.results || items.alumni || items.records || items.items || [];
  }

  if (!items.length) {
    console.warn(`Batch ${batchNo}: LLM returned 0 records (often normal: no people in this batch).`);
  }

  // Attach URLs from our own data (never trust the LLM for links)
  return items
    .filter((it) => it && Number.isInteger(it.idx) && batch[it.idx])
    .map((it) => ({
      ...it,
      relationship: RELATIONSHIPS.includes(it.relationship) ? it.relationship : 'unclear',
      sourceUrl: batch[it.idx].link,
      snippet: batch[it.idx].snippet,
    }));
}

async function extractAlumni(college, results) {
  const capped = results.slice(0, MAX_RESULTS);
  const batches = [];
  for (let i = 0; i < capped.length; i += BATCH_SIZE) {
    batches.push(capped.slice(i, i + BATCH_SIZE));
  }

  const settled = await Promise.allSettled(
    batches.map((b, i) => extractBatch(college, b, i + 1))
  );

  const records = [];
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      records.push(...s.value);
    } else {
      console.error(`Extraction batch ${i + 1} failed:`, s.reason?.message);
    }
  });

  console.log(`Extraction: ${records.length} people found in ${capped.length} search results`);
  return records;
}

module.exports = { extractAlumni };