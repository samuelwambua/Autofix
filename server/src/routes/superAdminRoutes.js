const express = require('express');
const router  = express.Router();
const {
  createSuperAdmin,
  getSuperAdminDashboard,
  getAllGarages,
  getGarageById,
  approveGarage,
  rejectGarage,
  suspendGarage,
  reactivateGarage,
  updateSubscription,
  verifyGarage,
} = require('../controllers/superAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── Seed route (run once) ────────────────────────────────
router.post('/create', createSuperAdmin);

// ─── All routes below require Super Admin auth ────────────
router.use(protect);
router.use(authorize('super_admin'));

router.get('/dashboard',                        getSuperAdminDashboard);
router.get('/garages',                          getAllGarages);
router.get('/garages/:id',                      getGarageById);
router.put('/garages/:id/approve',              approveGarage);
router.put('/garages/:id/reject',               rejectGarage);
router.put('/garages/:id/suspend',              suspendGarage);
router.put('/garages/:id/reactivate',           reactivateGarage);
router.put('/garages/:id/subscription',         updateSubscription);
router.put('/garages/:id/verify',            verifyGarage);

module.exports = router;