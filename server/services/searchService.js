const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', '.cache', 'search-cache.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_ROLES = ['Manager', 'Engineer']; // used when the user names no job title

// ---------- cache (saves your search quota) ----------
function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function cachedSearch(q, start = 0) {
  const useCache = process.env.SEARCH_CACHE !== 'off';
  const key = `${q}|start=${start}`;

  if (useCache) {
    const hit = readCache()[key];
    if (hit && Date.now() - hit.at < TTL_MS) {
      console.log('search cache hit (0 credits):', key);
      return hit.results;
    }
  }

  console.log('search API call (uses 1 credit):', key);
  const results = await search(q, 10, start);

  if (useCache && results.length > 0) {
    const cache = readCache(); // re-read after the await so parallel queries don't overwrite each other
    cache[key] = { at: Date.now(), results };
    writeCache(cache);
  }
  return results;
}

// ---------- providers ----------
function getKey() {
  return process.env.SERPAPI_KEY || process.env.SERPER_API_KEY;
}

async function serpApiSearch(q, num = 10, start = 0) {
  const params = new URLSearchParams({
    engine: 'google',
    q,
    num: String(num),
    start: String(start),
    gl: 'in',
    hl: 'en',
    api_key: getKey(),
  });

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  const data = await res.json().catch(() => ({}));

  if (data.error) {
    // SerpAPI reports "no results" as an error string, which isn't a real failure
    if (/hasn't returned any results/i.test(data.error)) return [];
    throw new Error(`SerpAPI error ${res.status}: ${data.error}`);
  }
  if (!res.ok) throw new Error(`SerpAPI error ${res.status}`);

  return (data.organic_results || []).map((r) => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet,
  }));
}

async function serperDevSearch(q, num = 10, start = 0) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': getKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q, num, gl: 'in', page: Math.floor(start / num) + 1 }),
  });
  if (!res.ok) throw new Error(`Serper.dev error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return (data.organic || []).map((r) => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet,
  }));
}

function search(q, num, start) {
  const provider = (process.env.SEARCH_PROVIDER || 'serpapi').toLowerCase();
  return provider === 'serper' ? serperDevSearch(q, num, start) : serpApiSearch(q, num, start);
}

// ---------- query building ----------
// "SFIT college" -> "SFIT"; keeps names like "St Francis College of Engineering" intact
function stripGeneric(name) {
  return (name || '').replace(/\s+(college|university)$/i, '').trim();
}

// ("SFIT" OR "St. Francis Institute of Technology")
function nameGroup({ college, aliases = [] }) {
  const names = [...new Set([stripGeneric(college), ...aliases.map(stripGeneric)])]
    .filter(Boolean)
    .slice(0, 4);
  return names.length === 1 ? `"${names[0]}"` : `(${names.map((n) => `"${n}"`).join(' OR ')})`;
}

// Returns a list of { q, start } search jobs
function buildQueries(parsed) {
  const { city, titles = [] } = parsed;
  const names = nameGroup(parsed);
  const where = city ? ` "${city}"` : '';
  const notStudents = ' -"Student at"'; // alumni = people who already work

  const base = `site:linkedin.com/in ${names}${where}${notStudents}`;
  const roles = (titles.length ? titles : DEFAULT_ROLES).slice(0, 2);

  const jobs = [
    { q: base, start: 0 },
    { q: base, start: 10 }, // second page of the main query
    ...roles.map((t) => ({ q: `${base} "${t}"`, start: 0 })),
    // non-LinkedIn: alumni pages, press, bios (may expose email/phone)
    { q: `${names} alumni${where} contact email`, start: 0 },
  ];
  return jobs;
}

async function runSearches(parsed) {
  const jobs = buildQueries(parsed);
  const settled = await Promise.allSettled(jobs.map((j) => cachedSearch(j.q, j.start)));

  const seen = new Set();
  const results = [];
  const errors = [];

  settled.forEach((s) => {
    if (s.status !== 'fulfilled') {
      console.error('Search query failed:', s.reason?.message);
      errors.push(s.reason?.message);
      return;
    }
    for (const r of s.value) {
      if (!r.link || seen.has(r.link)) continue;
      seen.add(r.link);
      results.push(r);
    }
  });

  // strings, so the controller's response and error check keep working
  const queries = jobs.map((j) => `${j.q}  [start=${j.start}]`);
  return { results, errors, queries };
}

module.exports = { runSearches, buildQueries };