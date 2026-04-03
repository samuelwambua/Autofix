const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/db');
const env    = require('../config/env');

const generateSupplierToken = (id) =>
  jwt.sign({ id, role: 'supplier' }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

// ─── Register Supplier (Step 1) ───────────────────────────
const registerSupplier = async (req, res) => {
  try {
    const {
      business_name, owner_name, email, phone, password,
      address, city, latitude, longitude,
      business_type, specializations,
    } = req.body;

    if (!business_name || !owner_name || !email || !phone || !password)
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });

    // Check uniqueness
    const emailExists = await pool.query('SELECT id FROM suppliers WHERE email = $1', [email]);
    if (emailExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A supplier with this email already exists.' });

    const phoneExists = await pool.query('SELECT id FROM suppliers WHERE phone = $1', [phone]);
    if (phoneExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A supplier with this phone already exists.' });

    const salt     = await bcrypt.genSalt(10);
    const hashed   = await bcrypt.hash(password, salt);

    // Build location geometry if coordinates provided
    const locationQuery = latitude && longitude
      ? `ST_SetSRID(ST_MakePoint(${parseFloat(longitude)}, ${parseFloat(latitude)}), 4326)`
      : 'NULL';

    const result = await pool.query(
      `INSERT INTO suppliers
        (business_name, owner_name, email, phone, password,
         address, city, latitude, longitude, location,
         business_type, specializations, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,${locationQuery},$10,$11,'pending')
       RETURNING id, business_name, owner_name, email, phone,
                 address, city, business_type, specializations,
                 status, is_verified, created_at`,
      [
        business_name, owner_name, email, phone, hashed,
        address || null, city || null,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        business_type || 'spare_parts_dealer',
        specializations ? `{${specializations.join(',')}}` : null,
      ]
    );

    const supplier = result.rows[0];
    const token    = generateSupplierToken(supplier.id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please upload your documents to complete verification.',
      data: { supplier, token },
    });
  } catch (error) {
    console.error('Register Supplier Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Login Supplier ───────────────────────────────────────
const loginSupplier = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password)
      return res.status(400).json({ success: false, message: 'Please provide email/phone and password.' });

    const query = email
      ? 'SELECT * FROM suppliers WHERE email = $1 AND is_active = TRUE'
      : 'SELECT * FROM suppliers WHERE phone = $1 AND is_active = TRUE';

    const result = await pool.query(query, [email || phone]);
    if (result.rows.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const supplier = result.rows[0];
    const isMatch  = await bcrypt.compare(password, supplier.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    if (supplier.status === 'suspended')
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact support.' });

    const token = generateSupplierToken(supplier.id);
    const { password: _, ...supplierWithoutPassword } = supplier;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { supplier: { ...supplierWithoutPassword, role: 'supplier' }, token },
    });
  } catch (error) {
    console.error('Login Supplier Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Upload Documents (Step 2) ────────────────────────────
const uploadDocuments = async (req, res) => {
  try {
    const supplier_id = req.supplier.id;
    const { documents } = req.body;
    // documents = [{ document_type, file_name, file_url, notes }]

    if (!documents || documents.length === 0)
      return res.status(400).json({ success: false, message: 'Please provide at least one document.' });

    const inserted = [];
    for (const doc of documents) {
      const result = await pool.query(
        `INSERT INTO supplier_documents (supplier_id, document_type, file_name, file_url, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [supplier_id, doc.document_type, doc.file_name, doc.file_url || null, doc.notes || null]
      );
      inserted.push(result.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: 'Documents uploaded successfully. Your application is now under review.',
      data: inserted,
    });
  } catch (error) {
    console.error('Upload Documents Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Get My Status (Step 3) ───────────────────────────────
const getMyStatus = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.business_name, s.owner_name, s.email, s.phone,
              s.address, s.city, s.business_type, s.specializations,
              s.status, s.is_verified, s.rejection_reason, s.created_at,
              json_agg(json_build_object(
                'id', sd.id, 'document_type', sd.document_type,
                'file_name', sd.file_name, 'uploaded_at', sd.uploaded_at
              ) ORDER BY sd.uploaded_at) FILTER (WHERE sd.id IS NOT NULL) AS documents
       FROM suppliers s
       LEFT JOIN supplier_documents sd ON sd.supplier_id = s.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [req.supplier.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Supplier not found.' });

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get My Status Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Update Profile ───────────────────────────────────────
const updateSupplierProfile = async (req, res) => {
  try {
    const {
      business_name, owner_name, phone, address,
      city, latitude, longitude, business_type, specializations,
    } = req.body;

    let locationUpdate = '';
    const params = [
      business_name, owner_name, phone, address, city,
      business_type, specializations ? `{${specializations.join(',')}}` : null,
      req.supplier.id,
    ];

    if (latitude && longitude) {
      locationUpdate = `, latitude = ${parseFloat(latitude)}, longitude = ${parseFloat(longitude)},
        location = ST_SetSRID(ST_MakePoint(${parseFloat(longitude)}, ${parseFloat(latitude)}), 4326)`;
    }

    const result = await pool.query(
      `UPDATE suppliers SET
         business_name   = COALESCE($1, business_name),
         owner_name      = COALESCE($2, owner_name),
         phone           = COALESCE($3, phone),
         address         = COALESCE($4, address),
         city            = COALESCE($5, city),
         business_type   = COALESCE($6, business_type),
         specializations = COALESCE($7, specializations),
         updated_at      = NOW()
         ${locationUpdate}
       WHERE id = $8
       RETURNING id, business_name, owner_name, email, phone,
                 address, city, latitude, longitude, business_type,
                 specializations, status, is_verified`,
      params
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Supplier Profile Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = {
  registerSupplier, loginSupplier, uploadDocuments,
  getMyStatus, updateSupplierProfile, generateSupplierToken,
};