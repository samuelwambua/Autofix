const express = require('express');
const router = express.Router();
const {
  getAllClients,
  getClientById,
  getMyProfile,
  updateMyProfile,
  changePassword,
  deactivateClient,
} = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── Client Routes (own profile) ─────────────────────────
router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.put('/me/change-password', changePassword);

// ─── Staff Only Routes ────────────────────────────────────
router.get('/', authorize('admin', 'supervisor', 'receptionist'), getAllClients);
router.get('/:id', authorize('admin', 'supervisor', 'receptionist'), getClientById);
router.put('/:id/deactivate', authorize('admin'), deactivateClient);

module.exports = router;