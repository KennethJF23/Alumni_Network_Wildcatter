const BASE = 'https://api.leadocean.io';

const EMAIL_FULL = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastCallAt = 0;

// The free plan allows 5 requests a second; stay well under it
async function throttle() {
  const gap = Number(process.env.LEADOCEAN_DELAY_MS) || 250;
  const wait = lastCallAt + gap - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

function validLinkedIn(url) {
  return url && /linkedin\.com\/in\/[^/?#]+/i.test(url) ? url : null;
}

// POST /v1/people/enrich with reveal_email=true: email(s), phone(s) and the current role, 1 record.
// Returns the `data` object, or null when nobody matches (404).
async function enrichPerson(linkedinUrl) {
  if (!process.env.LEADOCEAN_API_KEY) {
    throw new Error('LEADOCEAN_API_KEY is not set in .env');
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    await throttle();

    const res = await fetch(`${BASE}/v1/people/enrich`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.LEADOCEAN_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ linkedin_url: linkedinUrl, reveal_email: true }),
    });
    const body = await res.json().catch(() => ({}));

    if (process.env.DEBUG_ENRICH) {
      console.log('LEADOCEAN RAW:', res.status, JSON.stringify(body).slice(0, 1200));
    }

    if (res.status === 404) return null; // nobody matches this profile

    if (res.status === 429 && attempt === 1) {
      const wait = Number(res.headers.get('retry-after')) || 1;
      await sleep(wait * 1000);
      continue; // one polite retry
    }

    if (!res.ok) {
      const msg = body?.error?.message || JSON.stringify(body).slice(0, 200);
      throw new Error(`LeadOcean ${res.status}: ${msg}`);
    }
    return body.data || null;
  }
  return null;
}

// "best first" list of contact emails -> first usable one
function pickEmail(contact) {
  const list = Array.isArray(contact?.contact_emails) ? contact.contact_emails : [];
  for (const item of list) {
    const raw = typeof item === 'string' ? item : item?.email || item?.address || item?.value;
    const addr = raw ? String(raw).trim() : '';
    if (EMAIL_FULL.test(addr)) {
      const status = item?.status ?? item?.email_status;
      return {
        email: addr.toLowerCase(),
        type: item?.type ? String(item.type) : undefined,
        status: status ? String(status) : undefined,
      };
    }
  }
  return null;
}

// "best first" list of phones -> first usable one
function pickPhone(contact) {
  const list = Array.isArray(contact?.contact_phones) ? contact.contact_phones : [];
  for (const item of list) {
    const raw = typeof item === 'string' ? item : item?.phone || item?.number || item?.value;
    const s = raw ? String(raw).trim() : '';
    const digits = s.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) {
      return {
        phone: (s.startsWith('+') ? '+' : '') + digits,
        type: item?.type ? String(item.type) : undefined,
      };
    }
  }
  return null;
}

const nameTokens = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

// Guard against a merged or wrong record: the profile must share at least one name part with ours
function sameName(a, b) {
  const A = nameTokens(a);
  const B = nameTokens(b);
  if (!A.length || !B.length) return true; // can't tell, don't block
  return A.some((t) => B.includes(t));
}

async function findViaLeadocean(alumnus) {
  const li = validLinkedIn(alumnus.linkedinUrl);
  if (!li) return null; // this lookup needs a LinkedIn URL

  const data = await enrichPerson(li);
  if (!data) return null;

  if (!sameName(data.profile_data?.profile_full_name, alumnus.name)) {
    console.warn(
      `LeadOcean name mismatch for ${alumnus.name}: got "${data.profile_data?.profile_full_name}". Ignored.`
    );
    return null;
  }

  const contact = data.contact_data || {};
  const e = pickEmail(contact);
  const p = pickPhone(contact);
  const role = Array.isArray(contact.contact_current_experiences)
    ? contact.contact_current_experiences[0]
    : null;

  if (!e && !p && !role) return null;

  return {
    email: e?.email,
    emailType: e?.type,
    emailStatus: e?.status,
    phone: p?.phone,
    phoneType: p?.type,
    title: role?.job_title || undefined,
    company: role?.company_name || undefined,
    source: 'leadocean',
  };
}

module.exports = { findViaLeadocean };