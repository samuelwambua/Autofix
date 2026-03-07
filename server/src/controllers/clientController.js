const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// ─── Get All Clients (Staff only) ────────────────────────
const getAllClients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_active, created_at
       FROM clients
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Clients Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Single Client by ID (Staff or the client themselves) ───
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_active, created_at
       FROM clients
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get Client By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get My Profile (Client viewing their own profile) ───
const getMyProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_active, created_at
       FROM clients
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get My Profile Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Update My Profile (Client updating their own profile) ───
const updateMyProfile = async (req, res) => {
  try {
    const { first_name, last_name, email, phone } = req.body;

    // Check if phone is taken by another client
    if (phone) {
      const phoneExists = await pool.query(
        'SELECT id FROM clients WHERE phone = $1 AND id != $2',
        [phone, req.user.id]
      );
      if (phoneExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This phone number is already in use.',
        });
      }
    }

    // Check if email is taken by another client
    if (email) {
      const emailExists = await pool.query(
        'SELECT id FROM clients WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );
      if (emailExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This email address is already in use.',
        });
      }
    }

    const result = await pool.query(
      `UPDATE clients
       SET first_name = COALESCE($1, first_name),
           last_name  = COALESCE($2, last_name),
           email      = COALESCE($3, email),
           phone      = COALESCE($4, phone),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, first_name, last_name, email, phone, updated_at`,
      [first_name, last_name, email, phone, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Change Password ──────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password.',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    // Get current password from DB
    const result = await pool.query(
      'SELECT password FROM clients WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found.',
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, result.rows[0].password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await pool.query(
      'UPDATE clients SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Change Password Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Deactivate Client Account (Admin only) ──────────────
const deactivateClient = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE clients SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING id, first_name, last_name, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Client account deactivated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Deactivate Client Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  getAllClients,
  getClientById,
  getMyProfile,
  updateMyProfile,
  changePassword,
  deactivateClient,
};