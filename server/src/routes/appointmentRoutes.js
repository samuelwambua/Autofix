const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAllAppointments,
  getMyAppointments,
  getAppointmentsByMechanic,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  assignMechanic,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.get('/my-appointments', getMyAppointments);
router.post('/', createAppointment);
router.get('/:id', getAppointmentById);
router.put('/:id/reschedule', rescheduleAppointment);
router.put('/:id/cancel', cancelAppointment);

// ─── Staff Only Routes ────────────────────────────────────
router.get('/', authorize('admin', 'supervisor', 'receptionist', 'mechanic'), getAllAppointments);
router.get('/mechanic/:mechanicId', authorize('admin', 'supervisor', 'receptionist'), getAppointmentsByMechanic);
router.put('/:id/status', authorize('admin', 'supervisor', 'receptionist'), updateAppointmentStatus);
router.put('/:id/assign-mechanic', authorize('admin', 'supervisor', 'receptionist'), assignMechanic);

module.exports = router;