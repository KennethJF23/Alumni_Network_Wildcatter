const Alumnus = require('../models/Alumnus');
const { findContact } = require('../services/enrichmentService');

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Errors where continuing would only waste records or fail the same way
const isFatal = (msg = '') =>
  /LeadOcean (401|402|403|429)/.test(msg) || /LEADOCEAN_API_KEY is not set/.test(msg);

const missing = (field) => ({
  $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: '' }],
});

async function enrichDoc(doc, force = false) {
  // the lookup needs a LinkedIn URL; don't call the API or mark it as tried
  if (!doc.linkedinUrl) {
    return { id: doc._id, name: doc.name, status: 'skipped', note: 'No LinkedIn URL to look up' };
  }

  try {
    const found = await findContact(doc);

    if (found) {
      // fill gaps in the record from the person's current role
      if (found.title && !doc.currentTitle) doc.currentTitle = found.title;
      if (found.company && !doc.company) doc.company = found.company;

      // only fill empty contact fields, so manual or self-submitted data is never overwritten
      if (found.email && (force || !doc.email)) {
        doc.email = found.email;
        doc.emailSource = found.source;
        doc.emailStatus = found.emailStatus;
        doc.emailType = found.emailType;
      }
      if (found.phone && (force || !doc.phone)) {
        doc.phone = found.phone;
        doc.phoneSource = found.source;
        doc.phoneType = found.phoneType;
      }
    }

    const gotContact = !!(found && (found.email || found.phone));
    doc.enrichStatus = gotContact ? 'found' : 'not_found';
    doc.enrichedAt = new Date();
    await doc.save();

    return {
      id: doc._id,
      name: doc.name,
      status: doc.enrichStatus,
      email: doc.email || null,
      emailStatus: doc.emailStatus || null,
      phone: doc.phone || null,
      currentTitle: doc.currentTitle || null,
      company: doc.company || null,
    };
  } catch (err) {
    // not marked as enriched, so it can be retried later
    console.error(`Enrichment failed for ${doc.name}:`, err.message);
    return { id: doc._id, name: doc.name, status: 'error', error: err.message };
  }
}

// POST /api/alumni/:id/enrich            (add ?force=true to re-run and overwrite)
exports.enrichOne = async (req, res) => {
  try {
    const doc = await Alumnus.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Alumnus not found' });

    const force = req.query.force === 'true';
    if (doc.email && doc.phone && !force) {
      return res.json({
        id: doc._id,
        name: doc.name,
        status: 'skipped',
        email: doc.email,
        phone: doc.phone,
        note: 'Already has email and phone. Add ?force=true to look up again.',
      });
    }

    const result = await enrichDoc(doc, force);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/alumni/enrich-batch?limit=3&college=SFIT&retry=true
// Alumni with a LinkedIn URL who are missing an email or phone.
// Default: never tried before. retry=true also re-tries "not_found".
exports.enrichBatch = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 3, 25);

    const filter = {
      alumniStatus: 'alumnus',
      linkedinUrl: { $exists: true, $nin: [null, ''] },
      $or: [missing('email'), missing('phone')],
    };
    if (req.query.retry === 'true') {
      filter.enrichStatus = { $ne: 'found' };
    } else {
      filter.enrichedAt = { $exists: false };
    }
    if (req.query.college) filter.college = new RegExp(req.query.college, 'i');

    const docs = await Alumnus.find(filter).limit(limit);

    const results = [];
    let stoppedEarly = null;

    for (const d of docs) {
      const r = await enrichDoc(d); // sequential, so you stay within the rate limit
      results.push(r);
      if (r.status === 'error' && isFatal(r.error)) {
        stoppedEarly = r.error;
        break;
      }
    }

    return res.json({
      attempted: results.length,
      found: results.filter((r) => r.status === 'found').length,
      withEmail: results.filter((r) => r.email).length,
      withPhone: results.filter((r) => r.phone).length,
      notFound: results.filter((r) => r.status === 'not_found').length,
      errors: results.filter((r) => r.status === 'error').length,
      stoppedEarly,
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PATCH /api/alumni/:id/contact   body: { "email": "...", "phone": "..." }
// Manual entry, or what an alumnus's own form calls after accepting an invite
exports.updateContact = async (req, res) => {
  try {
    const { email, phone } = req.body;
    const update = {};

    if (email !== undefined) {
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      update.email = email.trim().toLowerCase();
      update.emailSource = 'manual';
    }
    if (phone !== undefined) {
      const digits = String(phone).replace(/[^\d+]/g, '');
      if (digits.replace(/\D/g, '').length < 8) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }
      update.phone = digits;
      update.phoneSource = 'manual';
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ error: 'Provide an email and/or phone' });
    }

    const doc = await Alumnus.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ error: 'Alumnus not found' });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};