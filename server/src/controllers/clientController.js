const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const getAllClients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_active, created_at
       FROM clients WHERE garage_id = $1 ORDER BY created_at DESC`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get All Clients Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_active, created_at
       FROM clients WHERE id = $1 AND garage_id = $2`,
      [id, req.garage_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Client not found.' });
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get Client By ID Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

const createClient = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;
    if (!first_name || !last_name || !phone || !password)
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });

    const phoneExists = await pool.query('SELECT id FROM clients WHERE phone = $1', [phone]);
    if (phoneExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A client with this phone already exists.' });

    if (email) {
      const emailExists = await pool.query('SELECT id FROM clients WHERE email = $1', [email]);
      if (emailExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'A client with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, password, garage_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, phone, is_active, created_at`,
      [first_name, last_name, email || null, phone, hashedPassword, req.garage_id]
    );
    return res.status(201).json({ success: true, message: 'Client created successfully.', data: result.rows[0] });
  } catch (error) {
    console.error('Create Client Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone } = req.body;

    const clientExists = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND garage_id = $2', [id, req.garage_id]
    );
    if (clientExists.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Client not found.' });

    if (email) {
      const emailExists = await pool.query('SELECT id FROM clients WHERE email = $1 AND id != $2', [email, id]);
      if (emailExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'This email is already in use.' });
    }
    if (phone) {
      const phoneExists = await pool.query('SELECT id FROM clients WHERE phone = $1 AND id != $2', [phone, id]);
      if (phoneExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'This phone is already in use.' });
    }

    const result = await pool.query(
      `UPDATE clients SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
         email = COALESCE($3, email), phone = COALESCE($4, phone), updated_at = NOW()
       WHERE id = $5 RETURNING id, first_name, last_name, email, phone, is_active`,
      [first_name, last_name, email, phone, id]
    );
    return res.status(200).json({ success: true, message: 'Client updated successfully.', data: result.rows[0] });
  } catch (error) {
    console.error('Update Client Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

const toggleClientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await pool.query(
      'SELECT id, is_active, first_name, last_name FROM clients WHERE id = $1 AND garage_id = $2',
      [id, req.garage_id]
    );
    if (current.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Client not found.' });

    const newStatus = !current.rows[0].is_active;
    await pool.query('UPDATE clients SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);
    return res.status(200).json({
      success: true,
      message: `Client ${newStatus ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (error) {
    console.error('Toggle Client Status Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM clients WHERE id = $1 AND garage_id = $2 RETURNING id, first_name, last_name',
      [id, req.garage_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Client not found.' });
    return res.status(200).json({
      success: true,
      message: `${result.rows[0].first_name} ${result.rows[0].last_name} deleted successfully.`,
    });
  } catch (error) {
    console.error('Delete Client Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};



// ─── Client viewing their own profile ────────────────────
const getMyProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_active, created_at
       FROM clients WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get My Profile Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const { first_name, last_name, email, phone } = req.body;
    if (email) {
      const emailExists = await pool.query('SELECT id FROM clients WHERE email = $1 AND id != $2', [email, req.user.id]);
      if (emailExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'This email is already in use.' });
    }
    if (phone) {
      const phoneExists = await pool.query('SELECT id FROM clients WHERE phone = $1 AND id != $2', [phone, req.user.id]);
      if (phoneExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'This phone is already in use.' });
    }
    const result = await pool.query(
      `UPDATE clients SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
         email = COALESCE($3, email), phone = COALESCE($4, phone), updated_at = NOW()
       WHERE id = $5 RETURNING id, first_name, last_name, email, phone`,
      [first_name, last_name, email, phone, req.user.id]
    );
    return res.status(200).json({ success: true, message: 'Profile updated successfully.', data: result.rows[0] });
  } catch (error) {
    console.error('Update My Profile Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ success: false, message: 'Please provide both current and new password.' });
    if (new_password.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

    const result = await pool.query('SELECT password FROM clients WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(current_password, result.rows[0].password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    await pool.query('UPDATE clients SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);
    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change Password Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

const deactivateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE clients SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND garage_id = $2 RETURNING id, first_name, last_name`,
      [id, req.garage_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Client not found.' });
    return res.status(200).json({ success: true, message: 'Client deactivated successfully.' });
  } catch (error) {
    console.error('Deactivate Client Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = {
  getAllClients, getClientById, createClient, updateClient,
  toggleClientStatus, deleteClient,
  getMyProfile, updateMyProfile, changePassword, deactivateClient,
};