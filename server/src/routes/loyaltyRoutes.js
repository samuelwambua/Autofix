const express = require('express');
const router  = express.Router();
const {
  getMyLoyalty, awardPoints, redeemPoints,
  applyReferralCode, getLoyaltyOverview,
} = require('../controllers/loyaltyController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');

router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.get('/my',        authorize('client'), getMyLoyalty);
router.post('/redeem',   authorize('client'), redeemPoints);
router.post('/referral', authorize('client'), applyReferralCode);

// ─── Staff Routes ─────────────────────────────────────────
router.get('/overview',  garageScope, authorize('admin', 'supervisor'), getLoyaltyOverview);
router.post('/award',    garageScope, authorize('admin', 'supervisor', 'receptionist'), awardPoints);

module.exports = router;