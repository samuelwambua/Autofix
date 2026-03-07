const express = require('express');
const router = express.Router();
const {
  getAllStaff,
  getAllMechanics,
  getStaffById,
  getMyProfile,
  updateStaff,
  updateMyProfile,
  changePassword,
  toggleStaffStatus,
  deleteStaff,
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── My Profile Routes (any logged in staff) ─────────────
router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.put('/me/change-password', changePassword);

// ─── Mechanics list (supervisor, admin, receptionist) ────
router.get('/mechanics', authorize('admin', 'supervisor', 'receptionist'), getAllMechanics);

// ─── Admin & Supervisor Routes ────────────────────────────
router.get('/', authorize('admin', 'supervisor'), getAllStaff);
router.get('/:id', authorize('admin', 'supervisor'), getStaffById);
router.put('/:id', authorize('admin'), updateStaff);
router.put('/:id/toggle-status', authorize('admin'), toggleStaffStatus);
router.delete('/:id', authorize('admin'), deleteStaff);

module.exports = router;