const BASE = 'https://api.cufinder.io/v2';

const EMAIL_FULL = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

// Anything under these keys describes the COMPANY, not the person. Never read it.
const COMPANY_KEYS = /^(company|companies|organization|organisation|employer|business)$/i;
// Keys that look like "phone" but aren't a number
const NOT_A_NUMBER = /country|code|verified|status|type|extension/i;

let lastCallAt = 0;

async function throttle() {
  const gap = Number(process.env.CUFINDER_DELAY_MS) || 0;
  const wait = lastCallAt + gap - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

// https://www.linkedin.com/in/slug?x=1 -> linkedin.com/in/slug  (the format the docs use)
function cleanLinkedIn(url) {
  return (url || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^[a-z]{2}\.linkedin\.com/i, 'linkedin.com') // in.linkedin.com -> linkedin.com
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '');
}

// POST form-encoded to a CUFinder v2 endpoint. Returns the JSON body, or null for 404 (no data).
async function post(endpoint, fields) {
  if (!process.env.CUFINDER_API_KEY) {
    throw new Error('CUFINDER_API_KEY is not set in .env');
  }

  await throttle();
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CUFINDER_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(fields).toString(),
  });
  const body = await res.json().catch(() => ({}));

  if (process.env.DEBUG_ENRICH) {
    console.log(`CUFINDER RAW [${endpoint}]:`, res.status, JSON.stringify(body).slice(0, 800));
  }

  if (res.status === 404) return null; // their algorithm has no data for this query

  if (!res.ok) {
    const raw = body.message || body.error;
    const detail = typeof raw === 'string' ? raw : JSON.stringify(body).slice(0, 200);
    // out-of-credits can arrive under different status codes; treat it as one fatal case
    const code = /credit|insufficient|quota|balance|limit/i.test(detail) ? 402 : res.status;
    throw new Error(`CUFinder ${code}: ${detail}`);
  }
  return body;
}

// Pull the first email and phone for the PERSON out of a response, whatever its shape.
function digest(body) {
  let email = null;
  let phone = null;

  (function walk(v, key) {
    if (key && COMPANY_KEYS.test(key)) return; // skip company data entirely

    if (typeof v === 'string' || typeof v === 'number') {
      const s = String(v).trim();

      if (!email && typeof v === 'string' && EMAIL_FULL.test(s)) {
        email = s.toLowerCase();
      } else if (!phone && /phone|mobile|tel/i.test(key || '') && !NOT_A_NUMBER.test(key || '')) {
        const digits = s.replace(/\D/g, '');
        if (digits.length >= 8 && digits.length <= 15) {
          phone = (s.startsWith('+') ? '+' : '') + digits;
        }
      }
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, k);
    }
  })(body, '');

  return { email, phone };
}

async function findViaCufinder(alumnus) {
  const li = cleanLinkedIn(alumnus.linkedinUrl);
  let email = null;
  let phone = null;

  if (li) {
    // 1) person enrichment from the LinkedIn profile: may include email and phone
    const epp = await post('epp', { linkedin_url: li });
    if (epp) ({ email, phone } = digest(epp));

    // 2) verified work email finder (5 credits when found), only if still missing
    if (!email && process.env.CUFINDER_USE_FWE !== 'false') {
      const fwe = await post('fwe', { linkedin_url: li });
      if (fwe) email = digest(fwe).email || email;
    }
  } else if (alumnus.name && alumnus.company) {
    // no LinkedIn URL: look the person up by name + company
    const tep = await post('tep', { full_name: alumnus.name, company: alumnus.company });
    if (tep) ({ email, phone } = digest(tep));
  }

  if (!email && !phone) return null;
  return { email, phone, source: 'cufinder' };
}

module.exports = { findViaCufinder };