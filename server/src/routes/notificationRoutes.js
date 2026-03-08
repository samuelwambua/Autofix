const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendNotificationToClient,
  sendNotificationToStaff,
  getAllNotifications,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── All Users Routes ─────────────────────────────────────
router.get('/my-notifications', getMyNotifications);
router.put('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.delete('/delete-all', deleteAllNotifications);
router.delete('/:id', deleteNotification);

// ─── Staff Only Routes ────────────────────────────────────
router.get('/', authorize('admin', 'supervisor'), getAllNotifications);
router.post('/send-client', authorize('admin', 'supervisor', 'receptionist'), sendNotificationToClient);
router.post('/send-staff', authorize('admin'), sendNotificationToStaff);

module.exports = router;