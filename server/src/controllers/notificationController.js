const { pool } = require('../config/db');

// ─── Create Notification (Internal helper function) ───────
const createNotification = async ({ user_id, client_id, type, message }) => {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, client_id, type, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id || null, client_id || null, type, message]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Create Notification Error:', error.message);
  }
};


// ─── Get My Notifications (Staff or Client) ───────────────
const getMyNotifications = async (req, res) => {
  try {
    let result;

    if (req.user.role === 'client') {
      result = await pool.query(
        `SELECT * FROM notifications
         WHERE client_id = $1
         ORDER BY created_at DESC`,
        [req.user.id]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [req.user.id]
      );
    }

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      unread: result.rows.filter(n => !n.is_read).length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get My Notifications Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Mark Notification as Read ────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if notification exists and belongs to the user
    const notifExists = await pool.query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    if (notifExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    const notif = notifExists.rows[0];

    // Make sure the notification belongs to the requesting user
    if (
      (req.user.role === 'client' && notif.client_id !== req.user.id) ||
      (req.user.role !== 'client' && notif.user_id !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This notification does not belong to you.',
      });
    }

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Mark As Read Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Mark All Notifications as Read ──────────────────────
const markAllAsRead = async (req, res) => {
  try {
    let result;

    if (req.user.role === 'client') {
      result = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE client_id = $1 AND is_read = FALSE
         RETURNING id`,
        [req.user.id]
      );
    } else {
      result = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE user_id = $1 AND is_read = FALSE
         RETURNING id`,
        [req.user.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: `${result.rows.length} notification(s) marked as read.`,
    });
  } catch (error) {
    console.error('Mark All As Read Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Delete a Notification ────────────────────────────────
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if notification exists and belongs to the user
    const notifExists = await pool.query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    if (notifExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    const notif = notifExists.rows[0];

    // Make sure the notification belongs to the requesting user
    if (
      (req.user.role === 'client' && notif.client_id !== req.user.id) ||
      (req.user.role !== 'client' && notif.user_id !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This notification does not belong to you.',
      });
    }

    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Notification Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Delete All My Notifications ─────────────────────────
const deleteAllNotifications = async (req, res) => {
  try {
    let result;

    if (req.user.role === 'client') {
      result = await pool.query(
        'DELETE FROM notifications WHERE client_id = $1 RETURNING id',
        [req.user.id]
      );
    } else {
      result = await pool.query(
        'DELETE FROM notifications WHERE user_id = $1 RETURNING id',
        [req.user.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: `${result.rows.length} notification(s) deleted successfully.`,
    });
  } catch (error) {
    console.error('Delete All Notifications Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Send Notification to a Client (Staff only) ───────────
const sendNotificationToClient = async (req, res) => {
  try {
    const { client_id, type, message } = req.body;

    if (!client_id || !type || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide client ID, type and message.',
      });
    }

    // Check if client exists
    const clientExists = await pool.query(
      'SELECT id, first_name, last_name FROM clients WHERE id = $1',
      [client_id]
    );
    if (clientExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found.',
      });
    }

    const result = await pool.query(
      `INSERT INTO notifications (client_id, type, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [client_id, type, message]
    );

    return res.status(201).json({
      success: true,
      message: `Notification sent to ${clientExists.rows[0].first_name} ${clientExists.rows[0].last_name} successfully.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Send Notification To Client Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Send Notification to a Staff Member (Admin only) ─────
const sendNotificationToStaff = async (req, res) => {
  try {
    const { user_id, type, message } = req.body;

    if (!user_id || !type || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID, type and message.',
      });
    }

    // Check if staff member exists
    const staffExists = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1',
      [user_id]
    );
    if (staffExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.',
      });
    }

    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, type, message]
    );

    return res.status(201).json({
      success: true,
      message: `Notification sent to ${staffExists.rows[0].first_name} ${staffExists.rows[0].last_name} successfully.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Send Notification To Staff Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get All Notifications (Admin only) ───────────────────
const getAllNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*,
              u.first_name || ' ' || u.last_name AS staff_name,
              c.first_name || ' ' || c.last_name AS client_name
       FROM notifications n
       LEFT JOIN users u ON n.user_id = u.id
       LEFT JOIN clients c ON n.client_id = c.id
       ORDER BY n.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Notifications Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendNotificationToClient,
  sendNotificationToStaff,
  getAllNotifications,
};