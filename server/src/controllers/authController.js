const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const generateToken = require('../utils/generateToken');

// ─── Register Staff ───────────────────────────────────────
const registerStaff = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, role, specialization } = req.body;

    if (!first_name || !last_name || !email || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const validRoles = ['admin', 'supervisor', 'mechanic', 'receptionist'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const emailExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });

    const phoneExists = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (phoneExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A user with this phone number already exists.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine garage_id — use requester's garage if available
    const garage_id = req.user?.garage_id || null;

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role, specialization, garage_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, first_name, last_name, email, phone, role, specialization, garage_id, created_at`,
      [first_name, last_name, email, phone, hashedPassword, role, specialization || null, garage_id]
    );

    const user  = result.rows[0];
    const token = generateToken(user.id, user.role, user.garage_id);

    return res.status(201).json({
      success: true,
      message: 'Staff account created successfully.',
      data: { user, token },
    });
  } catch (error) {
    console.error('Register Staff Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Register Client ──────────────────────────────────────
const registerClient = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    if (!first_name || !last_name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const phoneExists = await pool.query('SELECT id FROM clients WHERE phone = $1', [phone]);
    if (phoneExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A client with this phone number already exists.' });

    if (email) {
      const emailExists = await pool.query('SELECT id FROM clients WHERE email = $1', [email]);
      if (emailExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'A client with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Clients registering publicly don't belong to any garage yet
    const result = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, first_name, last_name, email, phone, 'client' AS role, created_at`,
      [first_name, last_name, email || null, phone, hashedPassword]
    );

    const client = result.rows[0];
    const token  = generateToken(client.id, 'client', null);

    return res.status(201).json({
      success: true,
      message: 'Client account created successfully.',
      data: { user: client, token },
    });
  } catch (error) {
    console.error('Register Client Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Register Garage ──────────────────────────────────────
const registerGarage = async (req, res) => {
  try {
    const {
      // Garage details
      garage_name, garage_email, garage_phone, garage_address,
      garage_city, garage_country, latitude, longitude,
      specializations, operating_hours,
      // Admin account details
      first_name, last_name, admin_email, admin_phone, password,
    } = req.body;

    if (!garage_name || !garage_email || !garage_phone || !first_name || !last_name || !admin_phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    // Check garage email uniqueness
    const garageEmailExists = await pool.query('SELECT id FROM garages WHERE email = $1', [garage_email]);
    if (garageEmailExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A garage with this email already exists.' });

    // Check admin email/phone uniqueness
    if (admin_email) {
      const adminEmailExists = await pool.query('SELECT id FROM users WHERE email = $1', [admin_email]);
      if (adminEmailExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    const adminPhoneExists = await pool.query('SELECT id FROM users WHERE phone = $1', [admin_phone]);
    if (adminPhoneExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A user with this phone number already exists.' });

    // Create the garage (pending approval)
    const garageResult = await pool.query(
      `INSERT INTO garages (name, email, phone, address, city, country, latitude, longitude, specializations, operating_hours, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        garage_name, garage_email, garage_phone,
        garage_address || null, garage_city || null, garage_country || 'Kenya',
        latitude || null, longitude || null,
        specializations ? `{${specializations.join(',')}}` : null,
        operating_hours ? JSON.stringify(operating_hours) : null,
      ]
    );

    const garage = garageResult.rows[0];

    // Create the garage admin account
    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const adminResult = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role, garage_id)
       VALUES ($1, $2, $3, $4, $5, 'admin', $6)
       RETURNING id, first_name, last_name, email, phone, role, garage_id`,
      [first_name, last_name, admin_email || null, admin_phone, hashedPassword, garage.id]
    );

    const admin = adminResult.rows[0];
    const token = generateToken(admin.id, 'admin', garage.id);

    return res.status(201).json({
      success: true,
      message: 'Garage registration submitted. Awaiting Super Admin approval.',
      data: { garage, admin, token },
    });
  } catch (error) {
    console.error('Register Garage Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Login ────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({ success: false, message: 'Please provide your email or phone number and password.' });
    }

    let user = null;

    // ── Super Admin login ──────────────────────────────────
    if (email) {
      const superAdminResult = await pool.query(
        'SELECT * FROM super_admins WHERE email = $1 AND is_active = TRUE', [email]
      );
      if (superAdminResult.rows.length > 0) {
        const sa = superAdminResult.rows[0];
        const isMatch = await bcrypt.compare(password, sa.password);
        if (!isMatch)
          return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const { password: _, ...saWithoutPassword } = sa;
        const token = generateToken(sa.id, 'super_admin', null);
        return res.status(200).json({
          success: true,
          message: 'Login successful.',
          data: { user: { ...saWithoutPassword, role: 'super_admin' }, token },
        });
      }
    }

    // ── Staff login ───────────────────────────────────────
    const staffQuery = email
      ? 'SELECT * FROM users WHERE email = $1 AND is_active = TRUE'
      : 'SELECT * FROM users WHERE phone = $1 AND is_active = TRUE';
    const staffResult = await pool.query(staffQuery, [email || phone]);

    if (staffResult.rows.length > 0) {
      user = staffResult.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email/phone and password.' });

      // Check garage is active
      if (user.garage_id) {
        const garageResult = await pool.query('SELECT status FROM garages WHERE id = $1', [user.garage_id]);
        if (garageResult.rows.length > 0 && garageResult.rows[0].status === 'suspended') {
          return res.status(403).json({ success: false, message: 'Your garage has been suspended. Please contact support.' });
        }
      }

      const token = generateToken(user.id, user.role, user.garage_id);
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: { user: { ...userWithoutPassword }, token },
      });
    }

    // ── Client login ──────────────────────────────────────
    const clientQuery = email
      ? 'SELECT * FROM clients WHERE email = $1 AND is_active = TRUE'
      : 'SELECT * FROM clients WHERE phone = $1 AND is_active = TRUE';
    const clientResult = await pool.query(clientQuery, [email || phone]);

    if (clientResult.rows.length > 0) {
      const client = clientResult.rows[0];
      const isMatch = await bcrypt.compare(password, client.password);
      if (!isMatch)
        return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email/phone and password.' });

      const token = generateToken(client.id, 'client', client.garage_id);
      const { password: _, ...clientWithoutPassword } = client;
      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: { user: { ...clientWithoutPassword, role: 'client' }, token },
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Please check your email/phone and password.',
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get Current User ─────────────────────────────────────
const getMe = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: { user: req.user } });
  } catch (error) {
    console.error('GetMe Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = { registerStaff, registerClient, registerGarage, login, getMe };