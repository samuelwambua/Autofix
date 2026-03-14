const { pool } = require('../config/db');

// ─── Create Appointment (Client or Staff) ─────────────────
const createAppointment = async (req, res) => {
  try {
    const {
      client_id,
      vehicle_id,
      mechanic_id,
      supervisor_id,
      service_type,
      appointment_date,
      notes,
    } = req.body;

    if (!vehicle_id || !service_type || !appointment_date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide vehicle, service type and appointment date.',
      });
    }

    const owner_id = req.user.role === 'client' ? req.user.id : client_id;
    if (!owner_id) {
      return res.status(400).json({ success: false, message: 'Please provide a client ID.' });
    }

    const clientExists = await pool.query('SELECT id FROM clients WHERE id = $1', [owner_id]);
    if (clientExists.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Client not found.' });

    const vehicleExists = await pool.query(
      'SELECT id FROM vehicles WHERE id = $1 AND client_id = $2',
      [vehicle_id, owner_id]
    );
    if (vehicleExists.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Vehicle not found or does not belong to this client.' });

    if (mechanic_id) {
      const mechanicExists = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = TRUE',
        [mechanic_id, 'mechanic']
      );
      if (mechanicExists.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Mechanic not found or is not active.' });
    }

    if (supervisor_id) {
      const supervisorExists = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = TRUE',
        [supervisor_id, 'supervisor']
      );
      if (supervisorExists.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Supervisor not found or is not active.' });
    }

    const appointmentDateTime = new Date(appointment_date);
    if (appointmentDateTime < new Date())
      return res.status(400).json({ success: false, message: 'Appointment date must be in the future.' });

    if (mechanic_id) {
      const mechanicBooked = await pool.query(
        `SELECT id FROM appointments
         WHERE mechanic_id = $1 AND appointment_date = $2 AND status NOT IN ('cancelled')`,
        [mechanic_id, appointmentDateTime]
      );
      if (mechanicBooked.rows.length > 0)
        return res.status(400).json({ success: false, message: 'This mechanic is already booked at that time.' });
    }

    const result = await pool.query(
      `INSERT INTO appointments
        (client_id, vehicle_id, mechanic_id, supervisor_id, service_type, appointment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [owner_id, vehicle_id, mechanic_id || null, supervisor_id || null, service_type, appointmentDateTime, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create Appointment Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get All Appointments (Admin only) ───────────────────
const getAllAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              u.first_name || ' ' || u.last_name AS mechanic_name,
              s.first_name || ' ' || s.last_name AS supervisor_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN users u ON a.mechanic_id = u.id
       LEFT JOIN users s ON a.supervisor_id = s.id
       ORDER BY a.appointment_date ASC`
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get All Appointments Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get My Appointments (Client) ────────────────────────
const getMyAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              u.first_name || ' ' || u.last_name AS mechanic_name,
              s.first_name || ' ' || s.last_name AS supervisor_name
       FROM appointments a
       JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN users u ON a.mechanic_id = u.id
       LEFT JOIN users s ON a.supervisor_id = s.id
       WHERE a.client_id = $1
       ORDER BY a.appointment_date ASC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get My Appointments Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get Appointments by Mechanic ─────────────────────────
const getAppointmentsByMechanic = async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const mechanicExists = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = $2',
      [mechanicId, 'mechanic']
    );
    if (mechanicExists.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Mechanic not found.' });

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
    return res.status(200).json({ success: true, mechanic: mechanicExists.rows[0], count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get Appointments By Mechanic Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get Appointments by Supervisor ──────────────────────
const getAppointmentsBySupervisor = async (req, res) => {
  try {
    // Supervisors see only appointments where they were chosen by the client
    const supervisorId = req.user.role === 'supervisor' ? req.user.id : req.params.supervisorId;

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
       WHERE a.supervisor_id = $1
       ORDER BY a.appointment_date ASC`,
      [supervisorId]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get Appointments By Supervisor Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
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
              v.plate_number, v.color,
              u.first_name || ' ' || u.last_name AS mechanic_name,
              s.first_name || ' ' || s.last_name AS supervisor_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN users u ON a.mechanic_id = u.id
       LEFT JOIN users s ON a.supervisor_id = s.id
       WHERE a.id = $1`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Appointment not found.' });

    if (req.user.role === 'client' && result.rows[0].client_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get Appointment By ID Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Update Appointment Status ────────────────────────────
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

    if (!status || !validStatuses.includes(status))
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });

    // Supervisor can only update appointments assigned to them
    if (req.user.role === 'supervisor') {
      const appt = await pool.query('SELECT supervisor_id FROM appointments WHERE id = $1', [id]);
      if (appt.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Appointment not found.' });
      if (appt.rows[0].supervisor_id !== req.user.id)
        return res.status(403).json({ success: false, message: 'Access denied. This appointment is not assigned to you.' });
    }

    const result = await pool.query(
      `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Appointment not found.' });

    return res.status(200).json({ success: true, message: `Appointment ${status} successfully.`, data: result.rows[0] });
  } catch (error) {
    console.error('Update Appointment Status Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Reschedule Appointment ───────────────────────────────
const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date } = req.body;

    if (!appointment_date)
      return res.status(400).json({ success: false, message: 'Please provide a new appointment date.' });

    const appointmentExists = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (appointmentExists.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Appointment not found.' });

    if (req.user.role === 'client' && appointmentExists.rows[0].client_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    if (['cancelled', 'completed'].includes(appointmentExists.rows[0].status))
      return res.status(400).json({ success: false, message: `Cannot reschedule a ${appointmentExists.rows[0].status} appointment.` });

    const newDate = new Date(appointment_date);
    if (newDate < new Date())
      return res.status(400).json({ success: false, message: 'New appointment date must be in the future.' });

    const result = await pool.query(
      `UPDATE appointments SET appointment_date = $1, status = 'pending', updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newDate, id]
    );
    return res.status(200).json({ success: true, message: 'Appointment rescheduled successfully.', data: result.rows[0] });
  } catch (error) {
    console.error('Reschedule Appointment Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Cancel Appointment ───────────────────────────────────
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointmentExists = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (appointmentExists.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Appointment not found.' });

    if (req.user.role === 'client' && appointmentExists.rows[0].client_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    if (['cancelled', 'completed'].includes(appointmentExists.rows[0].status))
      return res.status(400).json({ success: false, message: `Appointment is already ${appointmentExists.rows[0].status}.` });

    const result = await pool.query(
      `UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.status(200).json({ success: true, message: 'Appointment cancelled successfully.', data: result.rows[0] });
  } catch (error) {
    console.error('Cancel Appointment Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Assign Mechanic to Appointment ──────────────────────
const assignMechanic = async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanic_id } = req.body;

    if (!mechanic_id)
      return res.status(400).json({ success: false, message: 'Please provide a mechanic ID.' });

    const appointmentExists = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (appointmentExists.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Appointment not found.' });

    // Supervisor can only assign mechanics from their team
    if (req.user.role === 'supervisor') {
      if (appointmentExists.rows[0].supervisor_id !== req.user.id)
        return res.status(403).json({ success: false, message: 'This appointment is not assigned to you.' });
      const onTeam = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND supervisor_id = $2 AND role = $3',
        [mechanic_id, req.user.id, 'mechanic']
      );
      if (onTeam.rows.length === 0)
        return res.status(403).json({ success: false, message: 'You can only assign mechanics from your own team.' });
    }

    const mechanicExists = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = $2 AND is_active = TRUE',
      [mechanic_id, 'mechanic']
    );
    if (mechanicExists.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Mechanic not found or is not active.' });

    const result = await pool.query(
      `UPDATE appointments SET mechanic_id = $1, status = 'confirmed', updated_at = NOW() WHERE id = $2 RETURNING *`,
      [mechanic_id, id]
    );
    return res.status(200).json({
      success: true,
      message: `${mechanicExists.rows[0].first_name} ${mechanicExists.rows[0].last_name} assigned successfully.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Assign Mechanic Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get All Active Supervisors (for client booking) ──────
const getActiveSupervisors = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id, u.first_name, u.last_name, u.specialization,
         ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
         COUNT(r.id) AS total_reviews
       FROM users u
       LEFT JOIN job_cards jc ON jc.supervisor_id = u.id
       LEFT JOIN reviews r ON r.job_id = jc.id
       WHERE u.role = 'supervisor' AND u.is_active = TRUE
       GROUP BY u.id, u.first_name, u.last_name, u.specialization
       ORDER BY u.first_name ASC`
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get Active Supervisors Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = {
  createAppointment,
  getAllAppointments,
  getMyAppointments,
  getAppointmentsByMechanic,
  getAppointmentsBySupervisor,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  assignMechanic,
  getActiveSupervisors,
};