const { pool } = require('../config/db');

// ─── Create Warranty (Staff — after job completion) ───────
const createWarranty = async (req, res) => {
  try {
    const {
      job_card_id, warranty_period_days = 90,
      warranty_period_km, mileage_at_service, description,
    } = req.body;
    const garage_id = req.garage_id;

    if (!job_card_id)
      return res.status(400).json({ success: false, message: 'Job card ID is required.' });

    const job = await pool.query(
      `SELECT jc.*, v.client_id FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE jc.id = $1 AND jc.garage_id = $2`,
      [job_card_id, garage_id]
    );
    if (job.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Job card not found.' });

    if (job.rows[0].status !== 'completed')
      return res.status(400).json({ success: false, message: 'Warranty can only be created for completed jobs.' });

    // Check existing warranty
    const existing = await pool.query(
      'SELECT id FROM warranties WHERE job_card_id = $1', [job_card_id]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A warranty already exists for this job.' });

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + parseInt(warranty_period_days));

    const result = await pool.query(
      `INSERT INTO warranties
        (job_card_id, client_id, garage_id, warranty_period_days, warranty_period_km,
         mileage_at_service, expires_at, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [job_card_id, job.rows[0].client_id, garage_id,
       warranty_period_days, warranty_period_km || null,
       mileage_at_service || null, expires_at, description || null]
    );

    return res.status(201).json({
      success: true,
      message: `Warranty created — valid for ${warranty_period_days} days.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create Warranty Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get My Warranties (Client) ───────────────────────────
const getMyWarranties = async (req, res) => {
  try {
    // Auto-expire warranties
    await pool.query(
      `UPDATE warranties SET status = 'expired', updated_at = NOW()
       WHERE expires_at < CURRENT_DATE AND status = 'active'`
    );

    const result = await pool.query(
      `SELECT w.*,
              g.name AS garage_name, g.phone AS garage_phone,
              jc.description AS job_description,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number,
              (w.expires_at - CURRENT_DATE) AS days_remaining
       FROM warranties w
       JOIN garages g ON w.garage_id = g.id
       JOIN job_cards jc ON w.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE w.client_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get My Warranties Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get Garage Warranties (Staff) ───────────────────────
const getGarageWarranties = async (req, res) => {
  try {
    await pool.query(
      `UPDATE warranties SET status = 'expired', updated_at = NOW()
       WHERE expires_at < CURRENT_DATE AND status = 'active' AND garage_id = $1`,
      [req.garage_id]
    );

    const result = await pool.query(
      `SELECT w.*,
              c.first_name || ' ' || c.last_name AS client_name, c.phone AS client_phone,
              jc.description AS job_description,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number,
              (w.expires_at - CURRENT_DATE) AS days_remaining,
              COUNT(wc.id) AS claim_count
       FROM warranties w
       JOIN clients c ON w.client_id = c.id
       JOIN job_cards jc ON w.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       LEFT JOIN warranty_claims wc ON wc.warranty_id = w.id
       WHERE w.garage_id = $1
       GROUP BY w.id, c.first_name, c.last_name, c.phone,
                jc.description, v.make, v.model, v.plate_number
       ORDER BY w.created_at DESC`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get Garage Warranties Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── File Warranty Claim (Client) ────────────────────────
const fileWarrantyClaim = async (req, res) => {
  try {
    const { warranty_id, description } = req.body;

    if (!warranty_id || !description)
      return res.status(400).json({ success: false, message: 'Please provide warranty ID and description.' });

    const warranty = await pool.query(
      'SELECT * FROM warranties WHERE id = $1 AND client_id = $2',
      [warranty_id, req.user.id]
    );
    if (warranty.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Warranty not found.' });

    if (warranty.rows[0].status !== 'active')
      return res.status(400).json({ success: false, message: `Cannot claim a ${warranty.rows[0].status} warranty.` });

    const result = await pool.query(
      `INSERT INTO warranty_claims (warranty_id, client_id, garage_id, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [warranty_id, req.user.id, warranty.rows[0].garage_id, description]
    );

    return res.status(201).json({
      success: true,
      message: 'Warranty claim submitted. The garage will review it shortly.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('File Warranty Claim Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get Warranty Claims (Staff) ─────────────────────────
const getWarrantyClaims = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wc.*,
              c.first_name || ' ' || c.last_name AS client_name, c.phone AS client_phone,
              w.warranty_period_days, w.expires_at,
              jc.description AS job_description,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number
       FROM warranty_claims wc
       JOIN warranties w ON wc.warranty_id = w.id
       JOIN clients c ON wc.client_id = c.id
       JOIN job_cards jc ON w.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE wc.garage_id = $1
       ORDER BY wc.created_at DESC`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get Warranty Claims Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Update Warranty Claim (Staff) ───────────────────────
const updateWarrantyClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const validStatuses = ['approved', 'rejected', 'resolved'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status.' });

    const result = await pool.query(
      `UPDATE warranty_claims SET status = $1, resolution_notes = $2, updated_at = NOW()
       WHERE id = $3 AND garage_id = $4 RETURNING *`,
      [status, resolution_notes || null, id, req.garage_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Claim not found.' });

    // If resolved, mark warranty as claimed
    if (status === 'resolved') {
      await pool.query(
        `UPDATE warranties SET status = 'claimed', updated_at = NOW()
         WHERE id = $1`, [result.rows[0].warranty_id]
      );
    }

    return res.status(200).json({
      success: true,
      message: `Claim ${status}.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Warranty Claim Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  createWarranty, getMyWarranties, getGarageWarranties,
  fileWarrantyClaim, getWarrantyClaims, updateWarrantyClaim,
};