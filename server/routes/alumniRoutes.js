const express = require('express');
const { searchAlumni, listAlumni, debugSearch, statsAlumni } = require('../controllers/alumniController');
const { enrichOne, enrichBatch, updateContact } = require('../controllers/enrichController');
const {
  previewInvite, inviteOne, previewBatch, inviteBatch, getJoinInfo, acceptInvite,
} = require('../controllers/inviteController');
const auth = require('../middleware/auth');

const router = express.Router();

// public: the alumnus's join page
router.get('/join/:id', getJoinInfo);
router.post('/join/:id/accept', acceptInvite);

// discovery
router.post('/search', auth, searchAlumni);
router.post('/debug-search', auth, debugSearch);

// invites: preview first, send only on confirm
router.get('/invite-batch/preview', auth, previewBatch);
router.post('/invite-batch', auth, inviteBatch);
router.get('/:id/invite-preview', auth, previewInvite);
router.post('/:id/invite', auth, inviteOne);

// contact details
router.post('/enrich-batch', auth, enrichBatch);
router.post('/:id/enrich', auth, enrichOne);
router.patch('/:id/contact', updateContact);

// data lake
router.get('/stats', auth, statsAlumni);
router.get('/', auth, listAlumni);

module.exports = router;