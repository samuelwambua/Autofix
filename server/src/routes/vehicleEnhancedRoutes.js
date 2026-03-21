const express = require('express');
const router  = express.Router();
const {
  getMyVehiclesEnhanced, getVehicleFullProfile, updateVehicleEnhanced,
  addDocument, deleteDocument,
  addReminder, updateReminder, getMyReminders,
  getInsuranceExpiries,
} = require('../controllers/vehicleEnhancedController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');

router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.get('/my-vehicles',        authorize('client'), getMyVehiclesEnhanced);
router.get('/my-reminders',       authorize('client'), getMyReminders);
router.get('/:id/profile',        getVehicleFullProfile);
router.put('/:id/enhanced',       updateVehicleEnhanced);
router.post('/:vehicle_id/documents', addDocument);
router.delete('/documents/:id',       deleteDocument);
router.post('/:vehicle_id/reminders', addReminder);
router.put('/reminders/:id',          updateReminder);

// ─── Staff Routes ─────────────────────────────────────────
router.get('/insurance-expiries', garageScope, authorize('admin', 'supervisor', 'receptionist'), getInsuranceExpiries);

module.exports = router;