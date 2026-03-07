const express = require('express');
const router = express.Router();
const {
  registerStaff,
  registerClient,
  login,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ─── Public Routes ────────────────────────────────────────
router.post('/register/staff', registerStaff);
router.post('/register/client', registerClient);
router.post('/login', login);

// ─── Protected Routes ─────────────────────────────────────
router.get('/me', protect, getMe);

module.exports = router;