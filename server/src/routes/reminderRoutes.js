const express = require('express');
const router  = express.Router();
const { getSmartReminders } = require('../controllers/reminderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/smart', authorize('client'), getSmartReminders);

module.exports = router;