const express = require('express');
const router = express.Router();
const {
  addVehicle,
  getAllVehicles,
  getMyVehicles,
  getVehiclesByClientId,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.get('/my-vehicles', getMyVehicles);

// ─── Shared Routes (Staff & Clients) ─────────────────────
router.post('/', addVehicle);
router.get('/:id', getVehicleById);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

// ─── Staff Only Routes ────────────────────────────────────
router.get('/', authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getAllVehicles);
router.get('/client/:clientId', authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getVehiclesByClientId);

module.exports = router;