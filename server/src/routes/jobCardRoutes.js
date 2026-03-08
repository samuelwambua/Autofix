const express = require('express');
const router = express.Router();
const {
  createJobCard,
  getAllJobCards,
  getMyJobCards,
  getJobCardsByVehicle,
  getJobCardById,
  updateJobStatus,
  assignMechanic,
  removeMechanic,
  getJobMechanics,
  addPartsToJob,
  deleteJobCard,
} = require('../controllers/jobCardController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── Mechanic Routes ──────────────────────────────────────
router.get('/my-jobs', authorize('mechanic'), getMyJobCards);
router.put('/:id/status', authorize('mechanic', 'supervisor', 'admin'), updateJobStatus);
router.post('/:id/parts', authorize('mechanic', 'supervisor', 'admin'), addPartsToJob);

// ─── Client Routes ────────────────────────────────────────
router.get('/vehicle/:vehicleId', getJobCardsByVehicle);
router.get('/:id', getJobCardById);

// ─── Staff Only Routes ────────────────────────────────────
router.post('/', authorize('admin', 'supervisor', 'receptionist'), createJobCard);
router.get('/', authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getAllJobCards);
router.get('/:id/mechanics', authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getJobMechanics);
router.post('/:id/assign-mechanic', authorize('admin', 'supervisor'), assignMechanic);
router.delete('/:id/mechanics/:mechanicId', authorize('admin', 'supervisor'), removeMechanic);
router.delete('/:id', authorize('admin'), deleteJobCard);

module.exports = router;