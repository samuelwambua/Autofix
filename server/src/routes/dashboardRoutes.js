const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getMechanicDashboard,
  getClientDashboard,
  getReceptionistDashboard,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── Role Based Dashboards ────────────────────────────────
router.get('/admin', authorize('admin', 'supervisor'), getAdminDashboard);
router.get('/mechanic', authorize('mechanic'), getMechanicDashboard);
router.get('/client', authorize('client'), getClientDashboard);
router.get('/receptionist', authorize('receptionist'), getReceptionistDashboard);

module.exports = router;