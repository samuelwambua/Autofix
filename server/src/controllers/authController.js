const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const generateToken = require('../utils/generateToken');

// ─── Register Staff (Admin, Supervisor, Mechanic, Receptionist) ───
const registerStaff = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, role, specialization } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields.',
      });
    }

    // Validate role
    const validRoles = ['admin', 'supervisor', 'mechanic', 'receptionist'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Check if email already exists
    const emailExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (emailExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    // Check if phone already exists
    const phoneExists = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );
    if (phoneExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this phone number already exists.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new staff user
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role, specialization)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, phone, role, specialization, created_at`,
      [first_name, last_name, email, phone, hashedPassword, role, specialization || null]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.role);

    return res.status(201).json({
      success: true,
      message: 'Staff account created successfully.',
      data: { user, token },
    });
  } catch (error) {
    console.error('Register Staff Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Register Client ──────────────────────────────────────
const registerClient = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields.',
      });
    }

    // Check if phone already exists
    const phoneExists = await pool.query(
      'SELECT id FROM clients WHERE phone = $1',
      [phone]
    );
    if (phoneExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A client with this phone number already exists.',
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const emailExists = await pool.query(
        'SELECT id FROM clients WHERE email = $1',
        [email]
      );
      if (emailExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A client with this email already exists.',
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new client
    const result = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, first_name, last_name, email, phone, created_at`,
      [first_name, last_name, email || null, phone, hashedPassword]
    );

    const client = result.rows[0];
    const token = generateToken(client.id, 'client');

    return res.status(201).json({
      success: true,
      message: 'Client account created successfully.',
      data: { user: client, token },
    });
  } catch (error) {
    console.error('Register Client Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Login (Staff & Clients) ──────────────────────────────
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Must provide either email or phone plus password
    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email or phone number and password.',
      });
    }

    let user = null;
    let userType = null;

    // Search in staff (users) table first
    const staffQuery = email
      ? 'SELECT * FROM users WHERE email = $1 AND is_active = TRUE'
      : 'SELECT * FROM users WHERE phone = $1 AND is_active = TRUE';

    const staffResult = await pool.query(staffQuery, [email || phone]);

    if (staffResult.rows.length > 0) {
      user = staffResult.rows[0];
      userType = 'staff';
    } else {
      // Search in clients table
      const clientQuery = email
        ? 'SELECT * FROM clients WHERE email = $1 AND is_active = TRUE'
        : 'SELECT * FROM clients WHERE phone = $1 AND is_active = TRUE';

      const clientResult = await pool.query(clientQuery, [email || phone]);

      if (clientResult.rows.length > 0) {
        user = clientResult.rows[0];
        userType = 'client';
      }
    }

    // User not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your email/phone and password.',
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your email/phone and password.',
      });
    }

    // Generate token
    const role = userType === 'client' ? 'client' : user.role;
    const token = generateToken(user.id, role);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: { ...userWithoutPassword, role },
        token,
      },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Current Logged In User ───────────────────────────
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: { user: req.user },
    });
  } catch (error) {
    console.error('GetMe Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = { registerStaff, registerClient, login, getMe };