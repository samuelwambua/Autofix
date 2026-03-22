const express = require('express');
const router  = express.Router();
const {
  createWarranty, getMyWarranties, getGarageWarranties,
  fileWarrantyClaim, getWarrantyClaims, updateWarrantyClaim,
} = require('../controllers/warrantyController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');

router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.get('/my',             authorize('client'), getMyWarranties);
router.post('/claims',        authorize('client'), fileWarrantyClaim);

// ─── Staff Routes ─────────────────────────────────────────
router.use(garageScope);
router.get('/',               authorize('admin', 'supervisor', 'mechanic'), getGarageWarranties);
router.post('/',              authorize('admin', 'supervisor', 'mechanic'), createWarranty);
router.get('/claims',         authorize('admin', 'supervisor'), getWarrantyClaims);
router.put('/claims/:id',     authorize('admin', 'supervisor'), updateWarrantyClaim);

module.exports = router;