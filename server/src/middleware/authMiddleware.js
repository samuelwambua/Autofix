const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

// ─── Protect Route Middleware ─────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. No token provided.',
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    // ── Super Admin check ──────────────────────────────────
    if (decoded.role === 'super_admin') {
      const superAdminResult = await pool.query(
        'SELECT id, first_name, last_name, email FROM super_admins WHERE id = $1 AND is_active = TRUE',
        [decoded.id]
      );
      if (superAdminResult.rows.length > 0) {
        req.user = { ...superAdminResult.rows[0], role: 'super_admin', garage_id: null };
        return next();
      }
      return res.status(401).json({ success: false, message: 'Not authorized. Super admin not found.' });
    }

    // ── Staff check ───────────────────────────────────────
    const staffResult = await pool.query(
      `SELECT id, first_name, last_name, email, role, garage_id
       FROM users WHERE id = $1 AND is_active = TRUE`,
      [decoded.id]
    );

    if (staffResult.rows.length > 0) {
      req.user = staffResult.rows[0];
      req.garage_id = staffResult.rows[0].garage_id;
      return next();
    }

    // ── Client check ──────────────────────────────────────
    const clientResult = await pool.query(
      `SELECT id, first_name, last_name, email, garage_id
       FROM clients WHERE id = $1 AND is_active = TRUE`,
      [decoded.id]
    );

    if (clientResult.rows.length > 0) {
      req.user = { ...clientResult.rows[0], role: 'client' };
      req.garage_id = clientResult.rows[0].garage_id;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized. User not found.',
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Token is invalid or expired.',
    });
  }
};

// ─── Role-Based Access Middleware ─────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route is restricted to: ${roles.join(', ')}.`,
      });
    }
    next();
  };
};

// ─── Garage Scope Middleware ──────────────────────────────
// Ensures all queries are scoped to the logged-in user's garage
const garageScope = (req, res, next) => {
  // Super admins bypass garage scoping
  if (req.user.role === 'super_admin') {
    req.garage_id = null;
    return next();
  }

  const garage_id = req.user.garage_id;

  if (!garage_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User is not associated with any garage.',
    });
  }

  req.garage_id = garage_id;
  next();
};

module.exports = { protect, authorize, garageScope };