const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// ─── Get All Staff ────────────────────────────────────────
const getAllStaff = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role, specialization, is_active, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Staff Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get All Mechanics ────────────────────────────────────
const getAllMechanics = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, specialization, is_active, created_at
       FROM users
       WHERE role = 'mechanic'
       ORDER BY first_name ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Mechanics Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Single Staff Member by ID ────────────────────────
const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role, specialization, is_active, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get Staff By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get My Profile (Staff viewing their own profile) ─────
const getMyProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role, specialization, is_active, created_at
       FROM users
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


// ─── Update Staff Member (Admin only) ────────────────────
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, role, specialization } = req.body;

    // Check if staff exists
    const staffExists = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );
    if (staffExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.',
      });
    }

    // Check if email is taken by another user
    if (email) {
      const emailExists = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This email address is already in use.',
        });
      }
    }

    // Check if phone is taken by another user
    if (phone) {
      const phoneExists = await pool.query(
        'SELECT id FROM users WHERE phone = $1 AND id != $2',
        [phone, id]
      );
      if (phoneExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This phone number is already in use.',
        });
      }
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'supervisor', 'mechanic', 'receptionist'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        });
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET first_name     = COALESCE($1, first_name),
           last_name      = COALESCE($2, last_name),
           email          = COALESCE($3, email),
           phone          = COALESCE($4, phone),
           role           = COALESCE($5, role),
           specialization = COALESCE($6, specialization),
           updated_at     = NOW()
       WHERE id = $7
       RETURNING id, first_name, last_name, email, phone, role, specialization, updated_at`,
      [first_name, last_name, email, phone, role, specialization, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Staff member updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Staff Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Update My Own Profile ────────────────────────────────
const updateMyProfile = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, specialization } = req.body;

    // Check if email is taken by another user
    if (email) {
      const emailExists = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );
      if (emailExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This email address is already in use.',
        });
      }
    }

    // Check if phone is taken by another user
    if (phone) {
      const phoneExists = await pool.query(
        'SELECT id FROM users WHERE phone = $1 AND id != $2',
        [phone, req.user.id]
      );
      if (phoneExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This phone number is already in use.',
        });
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET first_name     = COALESCE($1, first_name),
           last_name      = COALESCE($2, last_name),
           email          = COALESCE($3, email),
           phone          = COALESCE($4, phone),
           specialization = COALESCE($5, specialization),
           updated_at     = NOW()
       WHERE id = $6
       RETURNING id, first_name, last_name, email, phone, role, specialization, updated_at`,
      [first_name, last_name, email, phone, specialization, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update My Profile Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Change My Password ───────────────────────────────────
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
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
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

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
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


// ─── Activate / Deactivate Staff (Admin only) ────────────
const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deactivating themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    // Get current status
    const current = await pool.query(
      'SELECT id, is_active, first_name, last_name FROM users WHERE id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.',
      });
    }

    const newStatus = !current.rows[0].is_active;

    const result = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, first_name, last_name, role, is_active`,
      [newStatus, id]
    );

    return res.status(200).json({
      success: true,
      message: `Staff member ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Toggle Staff Status Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Delete Staff Member (Admin only) ────────────────────
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, first_name, last_name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `${result.rows[0].first_name} ${result.rows[0].last_name} has been deleted successfully.`,
    });
  } catch (error) {
    console.error('Delete Staff Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  getAllStaff,
  getAllMechanics,
  getStaffById,
  getMyProfile,
  updateStaff,
  updateMyProfile,
  changePassword,
  toggleStaffStatus,
  deleteStaff,
};