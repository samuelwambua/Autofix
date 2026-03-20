const express = require('express');
const router  = express.Router();
const {
  getNearbyGarages,
  getAllActiveGarages,
  getGarageProfile,
  updateGarageProfile,
} = require('../controllers/garageController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');

// ─── Public Routes (no auth needed) ──────────────────────
router.get('/nearby',   getNearbyGarages);
router.get('/',         getAllActiveGarages);
router.get('/:id',      getGarageProfile);

// ─── Garage Admin Only ────────────────────────────────────
router.put('/profile', protect, garageScope, authorize('admin'), updateGarageProfile);

module.exports = router;