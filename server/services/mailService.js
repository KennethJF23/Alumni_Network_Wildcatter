const nodemailer = require('nodemailer');

const APP_NAME = 'AlumniLoop';

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Generic app invitation: no sender name, no sender college.
// askPhone adds one line requesting their mobile number.
function buildInvite(doc, askPhone = false) {
  const link = `${process.env.APP_URL}/join/${doc._id}`;
  const first = (doc.name || '').split(' ')[0] || 'there';

  const subject = `You're invited to the ${doc.college} alumni network on ${APP_NAME}`;
  const intro = `${doc.college} alumni are connecting on ${APP_NAME}, a free app to find batchmates, share referrals and mentor juniors.`;
  const phoneLine = 'Please also share your mobile number when you join, so alumni can reach you on WhatsApp.';

  const text = [
    `Hi ${first},`,
    intro,
    `Join and get the app: ${link}`,
    ...(askPhone ? [phoneLine] : []),
    `See you inside,\nThe ${APP_NAME} team`,
  ].join('\n\n');

  const html = `<p>Hi ${esc(first)},</p>
<p>${esc(intro)}</p>
<p><a href="${link}" style="background:#ff7a3d;color:#1b1b3a;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">Join &amp; get the app</a></p>
${askPhone ? `<p>${esc(phoneLine)}</p>` : ''}
<p>See you inside,<br>The ${APP_NAME} team</p>`;

  const whatsappText = `Hi ${first}, ${intro} Join and get the app: ${link}`;

  return { subject, text, html, whatsappText, link };
}

function waLink(doc, text) {
  const digits = String(doc.phone || '').replace(/\D/g, '');
  const num = digits.length === 10 ? `91${digits}` : digits; // bare 10-digit number: assume India
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function blocked(doc) {
  if (doc.consentStatus === 'opted_out') return 'opted_out';
  if (doc.consentStatus === 'accepted') return 'already_joined';
  return null;
}

// Real send. Only call this after the user confirmed the preview.
async function sendInvite(doc, { askPhone = false } = {}) {
  if (!doc.email) return { sent: false, reason: 'no_email' };
  const b = blocked(doc);
  if (b) return { sent: false, reason: b };

  const inv = buildInvite(doc, askPhone);
  try {
    await getTransporter().sendMail({
      from: `"${APP_NAME}" <${process.env.SMTP_USER}>`,
      to: doc.email,
      subject: inv.subject,
      text: inv.text,
      html: inv.html,
    });
    doc.consentStatus = 'invited';
    doc.inviteChannel = 'email';
    doc.invitedAt = new Date();
    if (askPhone) doc.phoneRequestedAt = new Date();
    await doc.save();
    return { sent: true };
  } catch (err) {
    console.error(`Mail failed for ${doc.name}:`, err.message);
    return { sent: false, reason: 'send_failed', error: err.message };
  }
}

// WhatsApp is opened by the user's own device; we only record that it happened
async function markWhatsapp(doc) {
  if (!doc.phone) return { sent: false, reason: 'no_phone' };
  const b = blocked(doc);
  if (b) return { sent: false, reason: b };
  doc.consentStatus = 'invited';
  doc.inviteChannel = 'whatsapp';
  doc.invitedAt = new Date();
  await doc.save();
  return { sent: true };
}

module.exports = { buildInvite, sendInvite, markWhatsapp, waLink };