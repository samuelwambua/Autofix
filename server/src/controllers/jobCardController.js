const { pool } = require('../config/db');

// ─── Create Job Card ──────────────────────────────────────
const createJobCard = async (req, res) => {
  try {
    const {
      appointment_id,
      vehicle_id,
      mechanic_id,
      description,
      estimated_completion,
      notes,
    } = req.body;

    // Validate required fields
    if (!vehicle_id || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide vehicle ID and job description.',
      });
    }

    // Check if vehicle exists
    const vehicleExists = await pool.query(
      'SELECT id FROM vehicles WHERE id = $1',
      [vehicle_id]
    );
    if (vehicleExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      });
    }

    // Check if appointment exists if provided
    if (appointment_id) {
      const appointmentExists = await pool.query(
        'SELECT id FROM appointments WHERE id = $1',
        [appointment_id]
      );
      if (appointmentExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found.',
        });
      }
    }

    // Check if mechanic exists if provided
    if (mechanic_id) {
      const mechanicExists = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = TRUE',
        [mechanic_id, 'mechanic']
      );
      if (mechanicExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Mechanic not found or is not active.',
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO job_cards
        (appointment_id, vehicle_id, mechanic_id, description, estimated_completion, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        appointment_id || null,
        vehicle_id,
        mechanic_id || null,
        description,
        estimated_completion || null,
        notes || null,
      ]
    );

    // If linked to appointment, update appointment status to confirmed
    if (appointment_id) {
      await pool.query(
        `UPDATE appointments SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
        [appointment_id]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Job card created successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create Job Card Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get All Job Cards (Staff only) ──────────────────────
const getAllJobCards = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT jc.*,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone,
              u.first_name || ' ' || u.last_name AS mechanic_name
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN clients c ON v.client_id = c.id
       LEFT JOIN users u ON jc.mechanic_id = u.id
       ORDER BY jc.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Job Cards Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get My Job Cards (Mechanic viewing their own jobs) ───
const getMyJobCards = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT jc.*,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN clients c ON v.client_id = c.id
       WHERE jc.mechanic_id = $1
       ORDER BY jc.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get My Job Cards Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Job Cards for a Client's Vehicle ─────────────────
const getJobCardsByVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Check vehicle exists
    const vehicleExists = await pool.query(
      `SELECT v.*, c.first_name || ' ' || c.last_name AS owner_name
       FROM vehicles v
       JOIN clients c ON v.client_id = c.id
       WHERE v.id = $1`,
      [vehicleId]
    );
    if (vehicleExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      });
    }

    // If client is requesting, make sure it's their vehicle
    if (
      req.user.role === 'client' &&
      vehicleExists.rows[0].client_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This vehicle does not belong to you.',
      });
    }

    const result = await pool.query(
      `SELECT jc.*,
              u.first_name || ' ' || u.last_name AS mechanic_name
       FROM job_cards jc
       LEFT JOIN users u ON jc.mechanic_id = u.id
       WHERE jc.vehicle_id = $1
       ORDER BY jc.created_at DESC`,
      [vehicleId]
    );

    return res.status(200).json({
      success: true,
      vehicle: vehicleExists.rows[0],
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get Job Cards By Vehicle Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Single Job Card by ID ────────────────────────────
const getJobCardById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT jc.*,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              v.color,
              v.year,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone,
              c.email AS client_email,
              u.first_name || ' ' || u.last_name AS mechanic_name,
              u.specialization AS mechanic_specialization
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN clients c ON v.client_id = c.id
       LEFT JOIN users u ON jc.mechanic_id = u.id
       WHERE jc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job card not found.',
      });
    }

    // If client is requesting, make sure it's their vehicle
    if (
      req.user.role === 'client' &&
      result.rows[0].client_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This job card does not belong to you.',
      });
    }

    // Get parts used in this job
    const partsResult = await pool.query(
      `SELECT jp.*,
              i.name AS part_name,
              i.sku
       FROM job_parts jp
       JOIN inventory i ON jp.part_id = i.id
       WHERE jp.job_id = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        parts_used: partsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get Job Card By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Update Job Card Status ───────────────────────────────
const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, estimated_completion } = req.body;

    const validStatuses = [
      'received',
      'diagnosing',
      'awaiting_parts',
      'in_progress',
      'quality_check',
      'completed',
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Check if job card exists
    const jobExists = await pool.query(
      'SELECT * FROM job_cards WHERE id = $1',
      [id]
    );
    if (jobExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job card not found.',
      });
    }

    // If mechanic is updating, make sure it's their job
    if (
      req.user.role === 'mechanic' &&
      jobExists.rows[0].mechanic_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This job card is not assigned to you.',
      });
    }

    // Set actual completion time if status is completed
    const actual_completion = status === 'completed' ? new Date() : null;

    const result = await pool.query(
      `UPDATE job_cards
       SET status               = $1,
           notes                = COALESCE($2, notes),
           estimated_completion = COALESCE($3, estimated_completion),
           actual_completion    = COALESCE($4, actual_completion),
           updated_at           = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, notes, estimated_completion, actual_completion, id]
    );

    return res.status(200).json({
      success: true,
      message: `Job card status updated to "${status}" successfully.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Job Status Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Assign Mechanic to Job Card ──────────────────────────
const assignMechanic = async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanic_id } = req.body;

    if (!mechanic_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a mechanic ID.',
      });
    }

    // Check if job card exists
    const jobExists = await pool.query(
      'SELECT id FROM job_cards WHERE id = $1',
      [id]
    );
    if (jobExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job card not found.',
      });
    }

    // Check if mechanic exists and is active
    const mechanicExists = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = $2 AND is_active = TRUE',
      [mechanic_id, 'mechanic']
    );
    if (mechanicExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic not found or is not active.',
      });
    }

    const result = await pool.query(
      `UPDATE job_cards
       SET mechanic_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [mechanic_id, id]
    );

    return res.status(200).json({
      success: true,
      message: `Mechanic ${mechanicExists.rows[0].first_name} ${mechanicExists.rows[0].last_name} assigned to job successfully.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Assign Mechanic Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Add Parts to Job Card ────────────────────────────────
const addPartsToJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { part_id, quantity_used } = req.body;

    if (!part_id || !quantity_used) {
      return res.status(400).json({
        success: false,
        message: 'Please provide part ID and quantity used.',
      });
    }

    // Check if job card exists
    const jobExists = await pool.query(
      'SELECT id FROM job_cards WHERE id = $1',
      [id]
    );
    if (jobExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job card not found.',
      });
    }

    // Check if part exists and has enough stock
    const partExists = await pool.query(
      'SELECT * FROM inventory WHERE id = $1',
      [part_id]
    );
    if (partExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Part not found in inventory.',
      });
    }

    const part = partExists.rows[0];
    if (part.quantity < quantity_used) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${part.quantity} units available.`,
      });
    }

    // Add part to job
    const result = await pool.query(
      `INSERT INTO job_parts (job_id, part_id, quantity_used, unit_price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, part_id, quantity_used, part.unit_cost]
    );

    // Deduct from inventory
    await pool.query(
      `UPDATE inventory
       SET quantity = quantity - $1, updated_at = NOW()
       WHERE id = $2`,
      [quantity_used, part_id]
    );

    return res.status(201).json({
      success: true,
      message: `${quantity_used} unit(s) of "${part.name}" added to job and deducted from inventory.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Add Parts To Job Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Delete Job Card (Admin only) ─────────────────────────
const deleteJobCard = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM job_cards WHERE id = $1 RETURNING id, description',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job card not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Job card deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Job Card Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  createJobCard,
  getAllJobCards,
  getMyJobCards,
  getJobCardsByVehicle,
  getJobCardById,
  updateJobStatus,
  assignMechanic,
  addPartsToJob,
  deleteJobCard,
};