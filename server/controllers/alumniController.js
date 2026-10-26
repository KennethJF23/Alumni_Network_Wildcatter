const mongoose = require('mongoose');
const Alumnus = require('../models/Alumnus');
const { parseQuery } = require('../ml_service/queryParser');
const { extractAlumni } = require('../ml_service/extractor');
const { runSearches } = require('../services/searchService');

const RANK = { Unknown: 0, Entry: 1, Senior: 2, Manager: 3, Director: 4, VP: 5, 'C-level': 6 };

function normalizeLinkedIn(url) {
  if (!url || !/linkedin\.com\/in\//i.test(url)) return null;
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? `https://www.linkedin.com/in/${m[1].toLowerCase()}` : null;
}

function makeDedupeKey({ linkedinUrl, name, company, college }) {
  if (linkedinUrl) return `li:${linkedinUrl}`;
  return `nc:${[name, company, college].map((s) => (s || '').toLowerCase().trim()).join('|')}`;
}

// Drop null/empty values so a later, poorer result never overwrites good data
function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
}

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function collegeNames(parsed) {
  return [parsed.college, ...(parsed.aliases || [])].map(norm).filter((n) => n.length >= 3);
}

// Is this "company" actually the college itself?
function isCollege(company, names) {
  const c = norm(company);
  return !!c && names.some((n) => c.includes(n));
}

// If both are known and don't overlap, the person is in a different city than requested
function cityMismatch(extractedCity, wantedCity) {
  if (!extractedCity || !wantedCity) return false;
  const a = norm(extractedCity);
  const b = norm(wantedCity);
  return !(a.includes(b) || b.includes(a));
}

exports.searchAlumni = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Please provide a text or voice instruction.' });
    }

    // 1. LLM: understand the instruction
    const parsed = await parseQuery(query);
    if (!parsed.college) {
      return res.status(400).json({
        error: 'Could not find a college name in your request.',
        parsed,
      });
    }

    // 2. Search engine
    const { results, errors, queries } = await runSearches(parsed);

    if (errors.length === queries.length) {
      // every query errored: provider problem (bad key, no credits), not "no results"
      return res.status(502).json({
        error: 'Search provider failed',
        details: errors[0],
        queries,
      });
    }

    if (!results.length) {
      return res.json({
        parsed,
        queries,
        found: 0,
        saved: 0,
        alumni: [],
        message: 'No public results found.',
      });
    }

    // 3. LLM: extract structured records
    const extracted = await extractAlumni(parsed.college, results);

    // 4. Keep real alumni only
    const names = collegeNames(parsed);
    const excluded = { employee: 0, student: 0, unclear: 0, wrongCity: 0, belowSeniority: 0 };
    const minRank = parsed.minSeniority ? RANK[parsed.minSeniority] ?? 0 : 0;
    const keep = [];

    for (const e of extracted) {
      if (!e.name) continue;

      let status = e.relationship;

      // Safety net: if the "employer" is the college, this person works there
      if (isCollege(e.company, names)) {
        if (status === 'alumnus') {
          e.company = null; // the LLM mislabelled the school as the employer
        } else {
          status = 'employee';
        }
      }

      if (status !== 'alumnus') {
        excluded[status] = (excluded[status] || 0) + 1;
        continue;
      }
      if (cityMismatch(e.city, parsed.city)) {
        excluded.wrongCity += 1;
        continue;
      }
      if (minRank > 0 && (RANK[e.seniority] ?? 0) < minRank) {
        excluded.belowSeniority += 1;
        continue;
      }
      keep.push(e);
    }

    // 5. Upsert into the data lake
    const saved = [];
    for (const e of keep) {
      const linkedinUrl = normalizeLinkedIn(e.sourceUrl);
      const dedupeKey = makeDedupeKey({
        linkedinUrl,
        name: e.name,
        company: e.company,
        college: parsed.college,
      });

      const doc = await Alumnus.findOneAndUpdate(
        { dedupeKey },
        {
          $set: clean({
            college: parsed.college,
            name: e.name,
            currentTitle: e.title,
            seniority: e.seniority,
            company: e.company,
            city: e.city || parsed.city,
            graduationYear: e.graduationYear,
            linkedinUrl,
            email: e.email,
            phone: e.phone,
            alumniStatus: 'alumnus',
            source: 'web_search',
            sourceUrl: e.sourceUrl,
            snippet: e.snippet,
            confidence: e.collegeInSnippet ? 0.85 : 0.4,
          }),
          $setOnInsert: { consentStatus: 'unverified' },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
      saved.push(doc);
    }

    return res.json({
      parsed,
      queries,
      found: results.length,
      peopleExtracted: extracted.length,
      excluded,
      saved: saved.length,
      alumni: saved,
    });
  } catch (err) {
    console.error('searchAlumni failed:', err);
    if (res.headersSent) return;
    return res.status(500).json({ error: err.message || 'Search failed' });
  }
};

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = { $nin: [null, ''], $exists: true };

// GET /api/alumni?q=&college=&city=&company=&seniority=VP,Director&status=invited&hasEmail=true&hasPhone=true&mine=true&limit=60
exports.listAlumni = async (req, res) => {
  try {
    const { college, city, company, q, seniority, status, hasEmail, hasPhone, limit, mine } = req.query;
    const filter = {};
    if (college) filter.college = new RegExp(escapeRe(college), 'i');
    if (city) filter.city = new RegExp(escapeRe(city), 'i');
    if (company) filter.company = new RegExp(escapeRe(company), 'i');
    if (q) {
      const re = new RegExp(escapeRe(q), 'i');
      filter.$or = [{ name: re }, { currentTitle: re }, { company: re }];
    }
    if (seniority) filter.seniority = { $in: String(seniority).split(',') };
    if (status) filter.consentStatus = { $in: String(status).split(',') };
    if (hasEmail === 'true') filter.email = has;
    if (hasPhone === 'true') filter.phone = has;
    if (mine === 'true') filter.invitedBy = req.user.id;

    const [alumni, total] = await Promise.all([
      Alumnus.find(filter).sort({ updatedAt: -1 }).limit(Math.min(Number(limit) || 200, 500)),
      Alumnus.countDocuments(filter),
    ]);
    return res.json({ count: alumni.length, total, alumni });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/alumni/stats?mine=true   (data lake analytics; mine scopes to the signed-in user's invites)
exports.statsAlumni = async (req, res) => {
  try {
    const scope = req.query.mine === 'true'
      ? { invitedBy: new mongoose.Types.ObjectId(req.user.id) }
      : {};
    const top = async (field, n) =>
      (
        await Alumnus.aggregate([
          { $match: { ...scope, [field]: has } },
          { $group: { _id: `$${field}`, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: n },
        ])
      ).map((x) => ({ label: x._id, count: x.count }));

    const filled = (f) => ({ $cond: [{ $gt: [{ $strLenCP: { $ifNull: [`$${f}`, ''] } }, 0] }, 1, 0] });
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totals, colleges, bySeniority, byCollege, byCity, byCompany, byStatus, growth] =
      await Promise.all([
        Alumnus.aggregate([
          { $match: scope },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              withEmail: { $sum: filled('email') },
              withPhone: { $sum: filled('phone') },
              withLinkedIn: { $sum: filled('linkedinUrl') },
              avgConfidence: { $avg: '$confidence' },
            },
          },
        ]),
        Alumnus.distinct('college', scope),
        top('seniority', 8),
        top('college', 8),
        top('city', 8),
        top('company', 8),
        top('consentStatus', 6),
        Alumnus.aggregate([
          { $match: { ...scope, createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const t = totals[0] || { total: 0, withEmail: 0, withPhone: 0, withLinkedIn: 0, avgConfidence: 0 };
    return res.json({
      total: t.total,
      colleges: colleges.length,
      withEmail: t.withEmail,
      withPhone: t.withPhone,
      withLinkedIn: t.withLinkedIn,
      avgConfidence: t.avgConfidence || 0,
      bySeniority,
      byCollege,
      byCity,
      byCompany,
      byStatus,
      growth: growth.map((g) => ({ label: g._id, count: g.count })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
// DEBUG ONLY: parsed query + raw search results, no extraction, no DB writes
exports.debugSearch = async (req, res) => {
  try {
    const parsed = await parseQuery(req.body.query || '');
    const out = parsed.college
      ? await runSearches(parsed)
      : { results: [], errors: [], queries: [] };
    return res.json({
      parsed,
      queries: out.queries,
      errors: out.errors,
      count: out.results.length,
      results: out.results,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};  