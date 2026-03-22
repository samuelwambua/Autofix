const { pool } = require('../config/db');

// ─── Create Emergency Request ─────────────────────────────
const createEmergencyRequest = async (req, res) => {
  try {
    const { vehicle_id, latitude, longitude, address, issue_description } = req.body;
    const client_id = req.user.id;

    if (!latitude || !longitude)
      return res.status(400).json({ success: false, message: 'Please provide your location.' });

    // Check for existing active request
    const existing = await pool.query(
      `SELECT id FROM emergency_requests
       WHERE client_id = $1 AND status IN ('pending', 'accepted', 'in_progress')`,
      [client_id]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({
        success: false,
        message: 'You already have an active emergency request.',
        request_id: existing.rows[0].id,
      });

    // Find nearest active garage
    const nearestGarage = await pool.query(
      `SELECT g.id, g.name,
              ST_Distance(
                g.location::geography,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
              ) / 1000 AS distance_km
       FROM garages g
       WHERE g.status = 'active' AND g.location IS NOT NULL
       ORDER BY distance_km ASC LIMIT 1`,
      [parseFloat(latitude), parseFloat(longitude)]
    );

    const garage_id = nearestGarage.rows[0]?.id || null;

    const result = await pool.query(
      `INSERT INTO emergency_requests
        (client_id, garage_id, vehicle_id, latitude, longitude, address, issue_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [client_id, garage_id, vehicle_id || null,
       latitude, longitude, address || null, issue_description || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Emergency request sent! Nearby garages have been notified.',
      data: {
        ...result.rows[0],
        nearest_garage: nearestGarage.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('Create Emergency Request Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get My Emergency Requests (Client) ───────────────────
const getMyEmergencyRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT er.*,
              g.name AS garage_name, g.phone AS garage_phone,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number,
              u.first_name || ' ' || u.last_name AS accepted_by_name
       FROM emergency_requests er
       LEFT JOIN garages g ON er.garage_id = g.id
       LEFT JOIN vehicles v ON er.vehicle_id = v.id
       LEFT JOIN users u ON er.accepted_by = u.id
       WHERE er.client_id = $1
       ORDER BY er.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get My Emergency Requests Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get Active Emergency Requests (Staff) ────────────────
const getActiveEmergencyRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT er.*,
              cl.first_name || ' ' || cl.last_name AS client_name,
              cl.phone AS client_phone,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number,
              u.first_name || ' ' || u.last_name AS accepted_by_name
       FROM emergency_requests er
       JOIN clients cl ON er.client_id = cl.id
       LEFT JOIN vehicles v ON er.vehicle_id = v.id
       LEFT JOIN users u ON er.accepted_by = u.id
       WHERE er.garage_id = $1 AND er.status IN ('pending', 'accepted', 'in_progress')
       ORDER BY er.created_at DESC`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get Active Emergency Requests Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Accept Emergency Request (Staff) ────────────────────
const acceptEmergencyRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await pool.query(
      'SELECT * FROM emergency_requests WHERE id = $1 AND garage_id = $2',
      [id, req.garage_id]
    );
    if (request.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });

    if (request.rows[0].status !== 'pending')
      return res.status(400).json({ success: false, message: 'This request is no longer pending.' });

    const result = await pool.query(
      `UPDATE emergency_requests
       SET status = 'accepted', accepted_by = $1, accepted_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Emergency request accepted. The client has been notified.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Accept Emergency Request Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Update Emergency Status ──────────────────────────────
const updateEmergencyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['in_progress', 'resolved', 'cancelled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status.' });

    const resolved_at = status === 'resolved' ? new Date() : null;

    const result = await pool.query(
      `UPDATE emergency_requests
       SET status = $1, resolved_at = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, resolved_at, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Request not found.' });

    return res.status(200).json({
      success: true,
      message: `Emergency request marked as ${status}.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Emergency Status Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Cancel Emergency Request (Client) ───────────────────
const cancelEmergencyRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE emergency_requests
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND client_id = $2
         AND status IN ('pending', 'accepted')
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Request not found or cannot be cancelled.' });

    return res.status(200).json({ success: true, message: 'Emergency request cancelled.' });
  } catch (error) {
    console.error('Cancel Emergency Request Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  createEmergencyRequest, getMyEmergencyRequests, getActiveEmergencyRequests,
  acceptEmergencyRequest, updateEmergencyStatus, cancelEmergencyRequest,
};