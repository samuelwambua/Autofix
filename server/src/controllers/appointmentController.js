const { pool } = require('../config/db');

// ─── Create Appointment (Client or Staff) ─────────────────
const createAppointment = async (req, res) => {
  try {
    const {
      client_id,
      vehicle_id,
      mechanic_id,
      service_type,
      appointment_date,
      notes,
    } = req.body;

    // Validate required fields
    if (!vehicle_id || !service_type || !appointment_date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide vehicle, service type and appointment date.',
      });
    }

    // If client is booking, use their own ID
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

    // Check if vehicle exists and belongs to the client
    const vehicleExists = await pool.query(
      'SELECT id FROM vehicles WHERE id = $1 AND client_id = $2',
      [vehicle_id, owner_id]
    );
    if (vehicleExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or does not belong to this client.',
      });
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

    // Validate appointment date is in the future
    const appointmentDateTime = new Date(appointment_date);
    if (appointmentDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date must be in the future.',
      });
    }

    // Check if mechanic is already booked at that time
    if (mechanic_id) {
      const mechanicBooked = await pool.query(
        `SELECT id FROM appointments
         WHERE mechanic_id = $1
         AND appointment_date = $2
         AND status NOT IN ('cancelled')`,
        [mechanic_id, appointmentDateTime]
      );
      if (mechanicBooked.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This mechanic is already booked at that date and time.',
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO appointments
        (client_id, vehicle_id, mechanic_id, service_type, appointment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [owner_id, vehicle_id, mechanic_id || null, service_type, appointmentDateTime, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create Appointment Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get All Appointments (Staff only) ───────────────────
const getAllAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              u.first_name || ' ' || u.last_name AS mechanic_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN users u ON a.mechanic_id = u.id
       ORDER BY a.appointment_date ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Appointments Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get My Appointments (Client) ────────────────────────
const getMyAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              u.first_name || ' ' || u.last_name AS mechanic_name
       FROM appointments a
       JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN users u ON a.mechanic_id = u.id
       WHERE a.client_id = $1
       ORDER BY a.appointment_date ASC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get My Appointments Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Appointments by Mechanic (Staff only) ───────────
const getAppointmentsByMechanic = async (req, res) => {
  try {
    const { mechanicId } = req.params;

    // Check mechanic exists
    const mechanicExists = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = $2',
      [mechanicId, 'mechanic']
    );
    if (mechanicExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic not found.',
      });
    }

    const result = await pool.query(
      `SELECT a.*,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.mechanic_id = $1
       ORDER BY a.appointment_date ASC`,
      [mechanicId]
    );

    return res.status(200).json({
      success: true,
      mechanic: mechanicExists.rows[0],
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get Appointments By Mechanic Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Single Appointment by ID ─────────────────────────
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT a.*,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone,
              c.email AS client_email,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              v.color,
              u.first_name || ' ' || u.last_name AS mechanic_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN users u ON a.mechanic_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    // If client is requesting, make sure it's their appointment
    if (req.user.role === 'client' && result.rows[0].client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This appointment does not belong to you.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get Appointment By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Update Appointment Status (Staff only) ───────────────
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const result = await pool.query(
      `UPDATE appointments
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Appointment ${status} successfully.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Appointment Status Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Reschedule Appointment (Client or Staff) ─────────────
const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date } = req.body;

    if (!appointment_date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new appointment date.',
      });
    }

    // Check if appointment exists
    const appointmentExists = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [id]
    );
    if (appointmentExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    // If client is rescheduling, make sure it's their appointment
    if (
      req.user.role === 'client' &&
      appointmentExists.rows[0].client_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This appointment does not belong to you.',
      });
    }

    // Cannot reschedule a cancelled or completed appointment
    if (['cancelled', 'completed'].includes(appointmentExists.rows[0].status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule a ${appointmentExists.rows[0].status} appointment.`,
      });
    }

    // Validate new date is in the future
    const newDate = new Date(appointment_date);
    if (newDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'New appointment date must be in the future.',
      });
    }

    const result = await pool.query(
      `UPDATE appointments
       SET appointment_date = $1, status = 'pending', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newDate, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Reschedule Appointment Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Cancel Appointment (Client or Staff) ─────────────────
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if appointment exists
    const appointmentExists = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [id]
    );
    if (appointmentExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    // If client is cancelling, make sure it's their appointment
    if (
      req.user.role === 'client' &&
      appointmentExists.rows[0].client_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This appointment does not belong to you.',
      });
    }

    // Cannot cancel an already cancelled or completed appointment
    if (['cancelled', 'completed'].includes(appointmentExists.rows[0].status)) {
      return res.status(400).json({
        success: false,
        message: `Appointment is already ${appointmentExists.rows[0].status}.`,
      });
    }

    const result = await pool.query(
      `UPDATE appointments
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Cancel Appointment Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Assign Mechanic to Appointment (Staff only) ──────────
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

    // Check if appointment exists
    const appointmentExists = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [id]
    );
    if (appointmentExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
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
      `UPDATE appointments
       SET mechanic_id = $1, status = 'confirmed', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [mechanic_id, id]
    );

    return res.status(200).json({
      success: true,
      message: `Mechanic ${mechanicExists.rows[0].first_name} ${mechanicExists.rows[0].last_name} assigned successfully.`,
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

module.exports = {
  createAppointment,
  getAllAppointments,
  getMyAppointments,
  getAppointmentsByMechanic,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  assignMechanic,
};