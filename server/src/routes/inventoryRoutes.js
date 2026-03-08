const express = require('express');
const router = express.Router();
const {
  addPart,
  getAllParts,
  getLowStockParts,
  getPartById,
  updatePart,
  restockPart,
  deletePart,
  getInventorySummary,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── All Staff Routes ─────────────────────────────────────
router.get('/', authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getAllParts);
router.get('/low-stock', authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getLowStockParts);
router.get('/summary', authorize('admin', 'supervisor'), getInventorySummary);
router.get('/:id', authorize('admin', 'supervisor', 'mechanic', 'receptionist'), getPartById);

// ─── Admin & Supervisor Only Routes ──────────────────────
router.post('/', authorize('admin', 'supervisor'), addPart);
router.put('/:id', authorize('admin', 'supervisor'), updatePart);
router.put('/:id/restock', authorize('admin', 'supervisor', 'mechanic'), restockPart);
router.delete('/:id', authorize('admin'), deletePart);

module.exports = router;