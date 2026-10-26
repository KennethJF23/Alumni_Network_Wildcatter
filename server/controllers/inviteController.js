const Alumnus = require('../models/Alumnus');
const { buildInvite, sendInvite, markWhatsapp, waLink } = require('../services/mailService');

const has = { $exists: true, $nin: [null, ''] };
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/alumni/:id/invite-preview
// The invite options that fit this person + exactly what each would send. Sends nothing.
exports.previewInvite = async (req, res) => {
  try {
    const doc = await Alumnus.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Alumnus not found' });

    const plain = buildInvite(doc);
    const withPhone = buildInvite(doc, true);
    const options = [];

    if (doc.email) {
      options.push({
        key: 'email',
        icon: '✉️',
        label: 'Email invite',
        hint: 'Invites them to the app',
        to: doc.email,
        status: doc.emailStatus || null,
        subject: plain.subject,
        text: plain.text,
      });
      if (!doc.phone) {
        options.push({
          key: 'email_phone',
          icon: '📞',
          label: 'Invite + request phone number',
          hint: 'Same invite, and asks for their mobile number',
          to: doc.email,
          status: doc.emailStatus || null,
          subject: withPhone.subject,
          text: withPhone.text,
        });
      }
    }

    if (doc.phone) {
      options.push({
        key: 'whatsapp',
        icon: '💬',
        label: 'WhatsApp',
        hint: 'Opens WhatsApp with the invite ready to send',
        to: doc.phone,
        text: plain.whatsappText,
        url: waLink(doc, plain.whatsappText),
      });
    }

    return res.json({ id: doc._id, name: doc.name, consentStatus: doc.consentStatus, options });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/alumni/:id/invite   body: { channel: "email" | "email_phone" | "whatsapp" }
exports.inviteOne = async (req, res) => {
  try {
    const doc = await Alumnus.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Alumnus not found' });

    const channel = req.body?.channel;
    const result =
      channel === 'whatsapp'
        ? await markWhatsapp(doc)
        : await sendInvite(doc, { askPhone: channel === 'email_phone' });

    return res.json({ id: doc._id, name: doc.name, channel, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/alumni/invite-batch/preview?college=SFIT&limit=10
exports.previewBatch = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const filter = { alumniStatus: 'alumnus', consentStatus: 'unverified', email: has };
    if (req.query.college) filter.college = new RegExp(escapeRe(req.query.college), 'i');

    const docs = await Alumnus.find(filter).limit(limit);
    if (!docs.length) return res.json({ count: 0, recipients: [], sample: null });

    const inv = buildInvite(docs[0]);
    return res.json({
      count: docs.length,
      recipients: docs.map((d) => ({ id: d._id, name: d.name, email: d.email })),
      sample: { subject: inv.subject, text: inv.text },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/alumni/invite-batch   body: { ids: [...] }   (the ids the user just previewed)
exports.inviteBatch = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 50) : [];
    if (!ids.length) return res.status(400).json({ error: 'No recipients selected' });

    const docs = await Alumnus.find({ _id: { $in: ids }, email: has });
    const results = [];
    for (const d of docs) {
      const r = await sendInvite(d);
      results.push({ id: d._id, name: d.name, ...r });
    }

    return res.json({
      attempted: results.length,
      sent: results.filter((r) => r.sent).length,
      failed: results.filter((r) => !r.sent).length,
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/alumni/join/:id   (public, for the join page)
exports.getJoinInfo = async (req, res) => {
  try {
    const doc = await Alumnus.findById(req.params.id).select('name college consentStatus phone');
    if (!doc) return res.status(404).json({ error: 'Invite not found' });
    return res.json({
      name: doc.name,
      college: doc.college,
      joined: doc.consentStatus === 'accepted',
      hasPhone: !!doc.phone,
    });
  } catch {
    return res.status(404).json({ error: 'Invite not found' });
  }
};

// POST /api/alumni/join/:id/accept   body: { phone? }   (public)
exports.acceptInvite = async (req, res) => {
  try {
    const doc = await Alumnus.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Invite not found' });

    if (req.body.phone) {
      const digits = String(req.body.phone).replace(/[^\d+]/g, '');
      if (digits.replace(/\D/g, '').length < 8) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }
      doc.phone = digits;
      doc.phoneSource = 'self_submitted';
    }
    doc.consentStatus = 'accepted';
    doc.joinedAt = new Date();
    await doc.save();

    return res.json({ joined: true, college: doc.college });
  } catch {
    return res.status(404).json({ error: 'Invite not found' });
  }
};