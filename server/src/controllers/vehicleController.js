const { pool } = require('../config/db');

// ─── Add a Vehicle (Client or Staff) ─────────────────────
const addVehicle = async (req, res) => {
  try {
    const { client_id, make, model, year, plate_number, color, mileage } = req.body;

    // Validate required fields
    if (!make || !model || !year || !plate_number) {
      return res.status(400).json({
        success: false,
        message: 'Please provide make, model, year and plate number.',
      });
    }

    // If client is adding their own vehicle, use their own ID
    const owner_id = req.user.role === 'client' ? req.user.id : client_id;

    if (!owner_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a client ID.',
      });
    }

    // Check if client exists
    const clientExists = await pool.query(
      'SELECT id FROM clients WHERE id = $1',
      [owner_id]
    );
    if (clientExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found.',
      });
    }

    // Check if plate number already exists
    const plateExists = await pool.query(
      'SELECT id FROM vehicles WHERE plate_number = $1',
      [plate_number.toUpperCase()]
    );
    if (plateExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A vehicle with this plate number already exists.',
      });
    }

    // Validate year
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({
        success: false,
        message: `Vehicle year must be between 1900 and ${currentYear + 1}.`,
      });
    }

    const result = await pool.query(
      `INSERT INTO vehicles (client_id, make, model, year, plate_number, color, mileage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [owner_id, make, model, year, plate_number.toUpperCase(), color || null, mileage || 0]
    );

    return res.status(201).json({
      success: true,
      message: 'Vehicle added successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Add Vehicle Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get All Vehicles (Staff only) ───────────────────────
const getAllVehicles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, 
              c.first_name || ' ' || c.last_name AS owner_name,
              c.phone AS owner_phone
       FROM vehicles v
       JOIN clients c ON v.client_id = c.id
       ORDER BY v.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Vehicles Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get My Vehicles (Client viewing their own vehicles) ──
const getMyVehicles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vehicles
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get My Vehicles Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Vehicles by Client ID (Staff only) ───────────────
const getVehiclesByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Check if client exists
    const clientExists = await pool.query(
      'SELECT id, first_name, last_name FROM clients WHERE id = $1',
      [clientId]
    );
    if (clientExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found.',
      });
    }

    const result = await pool.query(
      `SELECT * FROM vehicles
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [clientId]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      client: clientExists.rows[0],
      data: result.rows,
    });
  } catch (error) {
    console.error('Get Vehicles By Client ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Single Vehicle by ID ─────────────────────────────
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT v.*,
              c.first_name || ' ' || c.last_name AS owner_name,
              c.phone AS owner_phone,
              c.email AS owner_email
       FROM vehicles v
       JOIN clients c ON v.client_id = c.id
       WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      });
    }

    // If client is requesting, make sure it's their vehicle
    if (req.user.role === 'client' && result.rows[0].client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This vehicle does not belong to you.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get Vehicle By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Update Vehicle ───────────────────────────────────────
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, year, plate_number, color, mileage } = req.body;

    // Check if vehicle exists
    const vehicleExists = await pool.query(
      'SELECT * FROM vehicles WHERE id = $1',
      [id]
    );
    if (vehicleExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      });
    }

    // If client is updating, make sure it's their vehicle
    if (req.user.role === 'client' && vehicleExists.rows[0].client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This vehicle does not belong to you.',
      });
    }

    // Check if new plate number is taken by another vehicle
    if (plate_number) {
      const plateExists = await pool.query(
        'SELECT id FROM vehicles WHERE plate_number = $1 AND id != $2',
        [plate_number.toUpperCase(), id]
      );
      if (plateExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A vehicle with this plate number already exists.',
        });
      }
    }

    // Validate year if provided
    if (year) {
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear + 1) {
        return res.status(400).json({
          success: false,
          message: `Vehicle year must be between 1900 and ${currentYear + 1}.`,
        });
      }
    }

    const result = await pool.query(
      `UPDATE vehicles
       SET make         = COALESCE($1, make),
           model        = COALESCE($2, model),
           year         = COALESCE($3, year),
           plate_number = COALESCE($4, plate_number),
           color        = COALESCE($5, color),
           mileage      = COALESCE($6, mileage),
           updated_at   = NOW()
       WHERE id = $7
       RETURNING *`,
      [make, model, year, plate_number ? plate_number.toUpperCase() : null, color, mileage, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Vehicle Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Delete Vehicle (Admin or vehicle owner) ─────────────
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle exists
    const vehicleExists = await pool.query(
      'SELECT * FROM vehicles WHERE id = $1',
      [id]
    );
    if (vehicleExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      });
    }

    // If client is deleting, make sure it's their vehicle
    if (req.user.role === 'client' && vehicleExists.rows[0].client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This vehicle does not belong to you.',
      });
    }

    const result = await pool.query(
      'DELETE FROM vehicles WHERE id = $1 RETURNING make, model, plate_number',
      [id]
    );

    return res.status(200).json({
      success: true,
      message: `${result.rows[0].make} ${result.rows[0].model} (${result.rows[0].plate_number}) deleted successfully.`,
    });
  } catch (error) {
    console.error('Delete Vehicle Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  addVehicle,
  getAllVehicles,
  getMyVehicles,
  getVehiclesByClientId,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
};