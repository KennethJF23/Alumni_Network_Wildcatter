const mongoose = require('mongoose');

const alumnusSchema = new mongoose.Schema(
  {
    dedupeKey: { type: String, required: true, unique: true, index: true },
    college: { type: String, required: true, index: true },
    name: { type: String, required: true },
    currentTitle: String,
    seniority: {
      type: String,
      enum: ['C-level', 'VP', 'Director', 'Manager', 'Senior', 'Entry', 'Unknown'],
      default: 'Unknown',
    },
    company: String,
    city: { type: String, index: true },
    graduationYear: String,
    linkedinUrl: String,

    // contact details, with where each came from
    email: String,
    emailSource: String, // leadocean | manual | self_submitted | demo_seed | import
    emailStatus: String, // the provider's own deliverability label, e.g. verified / catch_all
    emailType: String, // work | personal
    phone: String,
    phoneSource: String,
    phoneType: String, // mobile | direct | office, as labelled by the provider
    enrichStatus: { type: String, enum: ['found', 'not_found', 'error'] },
    enrichedAt: Date,

    // is this person a former student of `college`?
    alumniStatus: {
      type: String,
      enum: ['alumnus', 'employee', 'student', 'unclear'],
      default: 'alumnus',
    },

    // provenance + data quality
    source: { type: String, default: 'web_search' },
    sourceUrl: String,
    snippet: String,
    confidence: { type: Number, min: 0, max: 1 },

    // invite lifecycle
    consentStatus: {
      type: String,
      enum: ['unverified', 'invited', 'accepted', 'opted_out'],
      default: 'unverified',
    },
    inviteChannel: { type: String, enum: ['email', 'whatsapp', 'linkedin', null], default: null },
    invitedAt: Date,
    joinedAt: Date,
    phoneRequestedAt: Date,
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alumnus', alumnusSchema);