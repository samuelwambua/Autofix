const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAllAppointments,
  getMyAppointments,
  getAppointmentsByMechanic,
  getAppointmentsBySupervisor,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  assignMechanic,
  getActiveSupervisors,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// ─── Public to all logged-in users ───────────────────────
router.get('/supervisors', getActiveSupervisors);

// ─── Client Routes ────────────────────────────────────────
router.get('/my-appointments', getMyAppointments);
router.post('/', createAppointment);
router.get('/:id', getAppointmentById);
router.put('/:id/reschedule', rescheduleAppointment);
router.put('/:id/cancel', cancelAppointment);

// ─── Supervisor Routes ────────────────────────────────────
router.get('/supervisor/my', authorize('supervisor'), getAppointmentsBySupervisor);

// ─── Staff Only Routes ────────────────────────────────────
router.get('/', authorize('admin', 'supervisor', 'receptionist', 'mechanic'), getAllAppointments);
router.get('/mechanic/:mechanicId', authorize('admin', 'supervisor', 'receptionist'), getAppointmentsByMechanic);
router.put('/:id/status', authorize('admin', 'supervisor', 'receptionist'), updateAppointmentStatus);
router.put('/:id/assign-mechanic', authorize('admin', 'supervisor', 'receptionist'), assignMechanic);

module.exports = router;