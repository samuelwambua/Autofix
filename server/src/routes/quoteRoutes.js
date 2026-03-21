const express = require('express');
const router  = express.Router();
const {
  createQuote, getAllQuotes, getMyQuotes, getQuoteById,
  approveQuote, rejectQuote, requestAlternative,
  reviseQuote, getQuoteStats,
} = require('../controllers/quoteController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');

router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.get('/my-quotes',              authorize('client'), getMyQuotes);
router.get('/:id',                    getQuoteById);
router.put('/:id/approve',            authorize('client'), approveQuote);
router.put('/:id/reject',             authorize('client'), rejectQuote);
router.put('/:id/request-alternative', authorize('client'), requestAlternative);

// ─── Staff Routes ─────────────────────────────────────────
router.use(garageScope, checkSubscription);
router.get('/',          authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getAllQuotes);
router.get('/stats',     authorize('admin', 'supervisor'), getQuoteStats);
router.post('/',         authorize('admin', 'supervisor', 'mechanic', 'receptionist'), createQuote);
router.put('/:id/revise', authorize('admin', 'supervisor', 'mechanic'), reviseQuote);

module.exports = router;