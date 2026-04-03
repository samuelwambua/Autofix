const express = require('express');
const router  = express.Router();
const {
  registerSupplier, loginSupplier, uploadDocuments,
  getMyStatus, updateSupplierProfile,
} = require('../controllers/supplierAuthController');
const { protectSupplier } = require('../middleware/supplierMiddleware');

// ─── Public Routes ────────────────────────────────────────
router.post('/register', registerSupplier);
router.post('/login',    loginSupplier);

// ─── Protected Routes ─────────────────────────────────────
router.get('/status',         protectSupplier, getMyStatus);
router.post('/documents',     protectSupplier, uploadDocuments);
router.put('/profile',        protectSupplier, updateSupplierProfile);

module.exports = router;