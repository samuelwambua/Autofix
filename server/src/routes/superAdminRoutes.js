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
  getAllSuppliers, getSupplierById,
  approveSupplier, rejectSupplier,
  requestSupplierInfo, suspendSupplier,
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

// ─── Supplier Management ──────────────────────────────────
router.get('/suppliers',                     getAllSuppliers);
router.get('/suppliers/:id',                 getSupplierById);
router.put('/suppliers/:id/approve',         approveSupplier);
router.put('/suppliers/:id/reject',          rejectSupplier);
router.put('/suppliers/:id/request-info',    requestSupplierInfo);
router.put('/suppliers/:id/suspend',         suspendSupplier);

module.exports = router;