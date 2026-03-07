const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');

// ─── Protect Route Middleware ─────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
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

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Check if user is a staff member
    const staffResult = await pool.query(
      'SELECT id, first_name, last_name, email, role FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );

    if (staffResult.rows.length > 0) {
      req.user = staffResult.rows[0];
      return next();
    }

    // Check if user is a client
    const clientResult = await pool.query(
      'SELECT id, first_name, last_name, email FROM clients WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );

    if (clientResult.rows.length > 0) {
      req.user = { ...clientResult.rows[0], role: 'client' };
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

module.exports = { protect, authorize };