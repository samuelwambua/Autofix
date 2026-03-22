const express = require('express');
const router  = express.Router();
const {
  getOrCreateConversation, getMyConversations, getGarageConversations,
  getMessages, sendMessage, getUnreadCount,
} = require('../controllers/chatController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');

router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.post('/conversations',                    authorize('client'), getOrCreateConversation);
router.get('/conversations/my',                  authorize('client'), getMyConversations);

// ─── Staff Routes ─────────────────────────────────────────
router.get('/conversations/garage',  garageScope, authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getGarageConversations);

// ─── Shared Routes ────────────────────────────────────────
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.get('/unread', getUnreadCount);

module.exports = router;