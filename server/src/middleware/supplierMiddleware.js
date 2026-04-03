const jwt    = require('jsonwebtoken');
const env    = require('../config/env');
const { pool } = require('../config/db');

// ─── Protect Supplier Routes ──────────────────────────────
const protectSupplier = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer'))
      token = req.headers.authorization.split(' ')[1];

    if (!token)
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });

    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (decoded.role !== 'supplier')
      return res.status(403).json({ success: false, message: 'Access denied. Supplier account required.' });

    const result = await pool.query(
      `SELECT id, business_name, owner_name, email, phone,
              status, is_verified, is_active, business_type,
              specializations, address, city, latitude, longitude
       FROM suppliers WHERE id = $1 AND is_active = TRUE`,
      [decoded.id]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ success: false, message: 'Supplier account not found.' });

    const supplier = result.rows[0];

    if (supplier.status === 'suspended')
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });

    req.supplier = { ...supplier, role: 'supplier' };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized. Token invalid or expired.' });
  }
};

// ─── Require Active Supplier ──────────────────────────────
const requireActiveSupplier = (req, res, next) => {
  if (req.supplier?.status !== 'active')
    return res.status(403).json({
      success: false,
      pending: true,
      message: 'Your account is pending verification. You will be notified once approved.',
      status: req.supplier?.status,
    });
  next();
};

module.exports = { protectSupplier, requireActiveSupplier };