const express = require('express');
const router  = express.Router();
const {
  createEmergencyRequest, getMyEmergencyRequests, getActiveEmergencyRequests,
  acceptEmergencyRequest, updateEmergencyStatus, cancelEmergencyRequest,
} = require('../controllers/emergencyController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');

router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.post('/',         authorize('client'), createEmergencyRequest);
router.get('/my',        authorize('client'), getMyEmergencyRequests);
router.put('/:id/cancel', authorize('client'), cancelEmergencyRequest);
router.put('/:id/status', updateEmergencyStatus);

// ─── Staff Routes ─────────────────────────────────────────
router.get('/active', garageScope, authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getActiveEmergencyRequests);
router.put('/:id/accept', garageScope, authorize('admin', 'supervisor', 'mechanic', 'receptionist'), acceptEmergencyRequest);

module.exports = router;