const { findViaLeadocean } = require('./leadoceanService');

// Single entry point, so the controller doesn't care which provider is behind it
async function findContact(alumnus) {
  return findViaLeadocean(alumnus);
}

module.exports = { findContact };