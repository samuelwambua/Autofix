const express = require('express');
const router = express.Router();
const {
  createReview,
  getAllReviews,
  getMyReviews,
  getMechanicReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getGarageRatingSummary,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.post('/', authorize('client'), createReview);
router.get('/my-reviews', authorize('client'), getMyReviews);
router.put('/:id', authorize('client'), updateReview);
router.delete('/:id', deleteReview);

// ─── Staff Routes ─────────────────────────────────────────
router.get('/', authorize('admin', 'supervisor'), getAllReviews);
router.get('/summary', authorize('admin', 'supervisor'), getGarageRatingSummary);
router.get('/mechanic/:mechanicId', authorize('admin', 'supervisor', 'mechanic'), getMechanicReviews);
router.get('/:id', authorize('admin', 'supervisor'), getReviewById);

module.exports = router;