const express = require('express');
const router  = express.Router();
const { getMySubscription, activateSubscription, getSubscriptionsOverview } = require('../controllers/subscriptionController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');

// ─── Garage Admin — view own subscription ─────────────────
router.get('/my', protect, garageScope, authorize('admin'), getMySubscription);

// ─── Super Admin — manage subscriptions ───────────────────
router.get('/overview',                    protect, authorize('super_admin'), getSubscriptionsOverview);
router.post('/:garageId/activate',         protect, authorize('super_admin'), activateSubscription);

module.exports = router;