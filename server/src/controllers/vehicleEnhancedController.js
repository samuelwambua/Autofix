const { pool } = require('../config/db');

// ─── Get My Vehicles (enhanced) ───────────────────────────
const getMyVehiclesEnhanced = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*,
              COUNT(DISTINCT jc.id) AS total_jobs,
              MAX(jc.created_at)    AS last_service_date,
              COUNT(DISTINCT vd.id) AS document_count,
              COUNT(DISTINCT mr.id) AS reminder_count,
              COUNT(DISTINCT CASE WHEN mr.is_completed = FALSE AND mr.is_dismissed = FALSE
                THEN mr.id END) AS pending_reminders
       FROM vehicles v
       LEFT JOIN job_cards jc ON jc.vehicle_id = v.id
       LEFT JOIN vehicle_documents vd ON vd.vehicle_id = v.id
       LEFT JOIN maintenance_reminders mr ON mr.vehicle_id = v.id
       WHERE v.client_id = $1
       GROUP BY v.id
       ORDER BY v.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get My Vehicles Enhanced Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Get Vehicle Full Profile ─────────────────────────────
const getVehicleFullProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await pool.query(
      `SELECT v.*,
              c.first_name || ' ' || c.last_name AS owner_name,
              c.phone AS owner_phone
       FROM vehicles v
       JOIN clients c ON v.client_id = c.id
       WHERE v.id = $1`,
      [id]
    );

    if (vehicle.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });

    if (req.user.role === 'client' && vehicle.rows[0].client_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    // Service history
    const serviceHistory = await pool.query(
      `SELECT jc.id, jc.description, jc.status, jc.actual_completion,
              jc.created_at, jc.notes,
              u.first_name || ' ' || u.last_name AS mechanic_name,
              i.total_amount, i.status AS invoice_status
       FROM job_cards jc
       LEFT JOIN users u ON jc.mechanic_id = u.id
       LEFT JOIN invoices i ON i.job_id = jc.id
       WHERE jc.vehicle_id = $1
       ORDER BY jc.created_at DESC`,
      [id]
    );

    // Documents
    const documents = await pool.query(
      `SELECT * FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    // Reminders
    const reminders = await pool.query(
      `SELECT * FROM maintenance_reminders
       WHERE vehicle_id = $1 AND is_dismissed = FALSE
       ORDER BY due_date ASC NULLS LAST`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...vehicle.rows[0],
        service_history: serviceHistory.rows,
        documents:       documents.rows,
        reminders:       reminders.rows,
      },
    });
  } catch (error) {
    console.error('Get Vehicle Full Profile Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Update Vehicle (enhanced fields) ────────────────────
const updateVehicleEnhanced = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      make, model, year, plate_number, color, mileage,
      engine_size, fuel_type, transmission, vin_number,
      purchase_date, insurance_expiry, notes,
    } = req.body;

    const vehicle = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (vehicle.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });

    if (req.user.role === 'client' && vehicle.rows[0].client_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    if (plate_number) {
      const plateExists = await pool.query(
        'SELECT id FROM vehicles WHERE plate_number = $1 AND id != $2',
        [plate_number.toUpperCase(), id]
      );
      if (plateExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'Plate number already in use.' });
    }

    const result = await pool.query(
      `UPDATE vehicles SET
         make             = COALESCE($1,  make),
         model            = COALESCE($2,  model),
         year             = COALESCE($3,  year),
         plate_number     = COALESCE($4,  plate_number),
         color            = COALESCE($5,  color),
         mileage          = COALESCE($6,  mileage),
         engine_size      = COALESCE($7,  engine_size),
         fuel_type        = COALESCE($8,  fuel_type),
         transmission     = COALESCE($9,  transmission),
         vin_number       = COALESCE($10, vin_number),
         purchase_date    = COALESCE($11, purchase_date),
         insurance_expiry = COALESCE($12, insurance_expiry),
         notes            = COALESCE($13, notes),
         updated_at       = NOW()
       WHERE id = $14
       RETURNING *`,
      [make, model, year, plate_number ? plate_number.toUpperCase() : null,
       color, mileage, engine_size, fuel_type, transmission, vin_number,
       purchase_date || null, insurance_expiry || null, notes, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Vehicle Enhanced Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Add Document ─────────────────────────────────────────
const addDocument = async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { document_type, file_name, file_url, expiry_date, notes } = req.body;

    if (!document_type || !file_name)
      return res.status(400).json({ success: false, message: 'Please provide document type and file name.' });

    const vehicle = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicle.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });

    if (req.user.role === 'client' && vehicle.rows[0].client_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const result = await pool.query(
      `INSERT INTO vehicle_documents (vehicle_id, client_id, document_type, file_name, file_url, expiry_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [vehicle_id, vehicle.rows[0].client_id, document_type, file_name,
       file_url || null, expiry_date || null, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Document added successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Add Document Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Delete Document ──────────────────────────────────────
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await pool.query('SELECT * FROM vehicle_documents WHERE id = $1', [id]);
    if (doc.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Document not found.' });

    if (req.user.role === 'client' && doc.rows[0].client_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    await pool.query('DELETE FROM vehicle_documents WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    console.error('Delete Document Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Add Reminder ─────────────────────────────────────────
const addReminder = async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { reminder_type, due_date, due_mileage, notes } = req.body;

    if (!reminder_type)
      return res.status(400).json({ success: false, message: 'Please provide reminder type.' });

    const vehicle = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicle.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });

    const client_id = req.user.role === 'client' ? req.user.id : vehicle.rows[0].client_id;
    const garage_id = req.garage_id || vehicle.rows[0].garage_id || null;

    const result = await pool.query(
      `INSERT INTO maintenance_reminders (vehicle_id, client_id, garage_id, reminder_type, due_date, due_mileage, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [vehicle_id, client_id, garage_id, reminder_type, due_date || null, due_mileage || null, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Reminder set successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Add Reminder Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Complete / Dismiss Reminder ──────────────────────────
const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'complete' or 'dismiss'

    const field = action === 'complete' ? 'is_completed' : 'is_dismissed';
    const result = await pool.query(
      `UPDATE maintenance_reminders SET ${field} = TRUE, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Reminder not found.' });

    return res.status(200).json({
      success: true,
      message: `Reminder ${action === 'complete' ? 'completed' : 'dismissed'}.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Reminder Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Get All Reminders for Client ─────────────────────────
const getMyReminders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mr.*,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number
       FROM maintenance_reminders mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       WHERE mr.client_id = $1 AND mr.is_dismissed = FALSE
       ORDER BY
         CASE WHEN mr.due_date IS NULL THEN 1 ELSE 0 END,
         mr.due_date ASC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get My Reminders Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Get Upcoming Insurance Expiries (Staff) ─────────────
const getInsuranceExpiries = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.id, v.make, v.model, v.plate_number,
              v.insurance_expiry,
              c.first_name || ' ' || c.last_name AS owner_name,
              c.phone AS owner_phone,
              (v.insurance_expiry - CURRENT_DATE) AS days_remaining
       FROM vehicles v
       JOIN clients c ON v.client_id = c.id
       WHERE v.garage_id = $1
         AND v.insurance_expiry IS NOT NULL
         AND v.insurance_expiry >= CURRENT_DATE
       ORDER BY v.insurance_expiry ASC
       LIMIT 20`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Insurance Expiries Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getMyVehiclesEnhanced, getVehicleFullProfile, updateVehicleEnhanced,
  addDocument, deleteDocument,
  addReminder, updateReminder, getMyReminders,
  getInsuranceExpiries,
};