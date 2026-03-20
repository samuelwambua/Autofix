const express = require('express');
const router  = express.Router();
const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  toggleClientStatus,
  deleteClient,
  getMyProfile,
  updateMyProfile,
  changePassword,
  deactivateClient,
} = require('../controllers/clientController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');

router.use(protect);

// ─── Client Routes (own profile) ─────────────────────────
router.get('/me',                getMyProfile);
router.put('/me',                updateMyProfile);
router.put('/me/change-password', changePassword);

// ─── Staff Only Routes ────────────────────────────────────
router.use(garageScope);
router.get('/',    authorize('admin', 'supervisor', 'receptionist'), getAllClients);
router.post('/',   authorize('admin', 'receptionist'), createClient);
router.get('/:id', authorize('admin', 'supervisor', 'receptionist'), getClientById);
router.put('/:id', authorize('admin', 'receptionist'), updateClient);
router.put('/:id/toggle',     authorize('admin'), toggleClientStatus);
router.put('/:id/deactivate', authorize('admin'), deactivateClient);
router.delete('/:id',         authorize('admin'), deleteClient);

module.exports = router;