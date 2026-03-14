const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// ─── Get Supervisor Dashboard ─────────────────────────────
const getSupervisorDashboard = async (req, res) => {
  try {
    const supervisorId = req.user.id;

    // My team (mechanics under this supervisor)
    const teamResult = await pool.query(
      `SELECT id, first_name, last_name, email, phone, specialization, is_active
       FROM users
       WHERE supervisor_id = $1 AND role = 'mechanic'
       ORDER BY first_name ASC`,
      [supervisorId]
    );

    // My clients
    const clientsResult = await pool.query(
      `SELECT COUNT(*) AS total_clients
       FROM clients
       WHERE supervisor_id = $1 AND is_active = TRUE`,
      [supervisorId]
    );

    // My job cards stats
    const jobStatsResult = await pool.query(
      `SELECT jc.status, COUNT(*) AS count
       FROM job_cards jc
       WHERE jc.supervisor_id = $1
       GROUP BY jc.status`,
      [supervisorId]
    );

    // Active jobs (not completed)
    const activeJobsResult = await pool.query(
      `SELECT jc.id, jc.description, jc.status,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              u.first_name || ' ' || u.last_name AS mechanic_name
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       LEFT JOIN users u ON jc.mechanic_id = u.id
       WHERE jc.supervisor_id = $1 AND jc.status != 'completed'
       ORDER BY jc.created_at DESC
       LIMIT 5`,
      [supervisorId]
    );

    // Recent completed jobs
    const recentCompletedResult = await pool.query(
      `SELECT jc.id, jc.description, jc.actual_completion,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE jc.supervisor_id = $1 AND jc.status = 'completed'
       ORDER BY jc.actual_completion DESC
       LIMIT 5`,
      [supervisorId]
    );

    // Billing summary for my jobs
    const billingResult = await pool.query(
      `SELECT
         COUNT(i.id) AS total_invoices,
         COALESCE(SUM(i.total_amount), 0) AS total_billed,
         COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) AS total_collected,
         COALESCE(SUM(CASE WHEN i.status = 'pending' THEN i.total_amount ELSE 0 END), 0) AS total_pending
       FROM job_cards jc
       LEFT JOIN invoices i ON i.job_id = jc.id
       WHERE jc.supervisor_id = $1`,
      [supervisorId]
    );

    // Unread notifications
    const notifResult = await pool.query(
      `SELECT COUNT(*) AS unread
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [supervisorId]
    );

    return res.status(200).json({
      success: true,
      data: {
        team:               teamResult.rows,
        total_clients:      parseInt(clientsResult.rows[0].total_clients),
        job_stats:          jobStatsResult.rows,
        active_jobs:        activeJobsResult.rows,
        recent_completed:   recentCompletedResult.rows,
        billing:            billingResult.rows[0],
        unread_notifications: parseInt(notifResult.rows[0].unread),
      },
    });
  } catch (error) {
    console.error('Get Supervisor Dashboard Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// ─── Get My Team (mechanics under this supervisor) ────────
const getMyTeam = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone,
              specialization, is_active, created_at
       FROM users
       WHERE supervisor_id = $1 AND role = 'mechanic'
       ORDER BY first_name ASC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get My Team Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// ─── Add Mechanic to My Team ──────────────────────────────
const addMechanicToTeam = async (req, res) => {
  try {
    const { mechanic_id } = req.body;
    const supervisorId    = req.user.id;

    if (!mechanic_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a mechanic ID.',
      });
    }

    // Check mechanic exists and is actually a mechanic
    const mechanic = await pool.query(
      `SELECT id, first_name, last_name, supervisor_id
       FROM users WHERE id = $1 AND role = 'mechanic'`,
      [mechanic_id]
    );

    if (mechanic.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic not found.',
      });
    }

    if (mechanic.rows[0].supervisor_id) {
      return res.status(400).json({
        success: false,
        message: 'This mechanic is already assigned to a supervisor.',
      });
    }

    await pool.query(
      `UPDATE users SET supervisor_id = $1, updated_at = NOW() WHERE id = $2`,
      [supervisorId, mechanic_id]
    );

    return res.status(200).json({
      success: true,
      message: `${mechanic.rows[0].first_name} ${mechanic.rows[0].last_name} added to your team.`,
    });
  } catch (error) {
    console.error('Add Mechanic To Team Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// ─── Remove Mechanic from My Team ────────────────────────
const removeMechanicFromTeam = async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const supervisorId   = req.user.id;

    const mechanic = await pool.query(
      `SELECT id, first_name, last_name, supervisor_id
       FROM users WHERE id = $1 AND role = 'mechanic'`,
      [mechanicId]
    );

    if (mechanic.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic not found.',
      });
    }

    if (mechanic.rows[0].supervisor_id !== supervisorId) {
      return res.status(403).json({
        success: false,
        message: 'This mechanic is not on your team.',
      });
    }

    await pool.query(
      `UPDATE users SET supervisor_id = NULL, updated_at = NOW() WHERE id = $1`,
      [mechanicId]
    );

    return res.status(200).json({
      success: true,
      message: `${mechanic.rows[0].first_name} ${mechanic.rows[0].last_name} removed from your team.`,
    });
  } catch (error) {
    console.error('Remove Mechanic From Team Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// ─── Get My Clients ───────────────────────────────────────
const getMyClients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_active, created_at
       FROM clients
       WHERE supervisor_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get My Clients Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// ─── Add Client to My Supervision ────────────────────────
const addClientToSupervision = async (req, res) => {
  try {
    const { client_id } = req.body;
    const supervisorId  = req.user.id;

    if (!client_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a client ID.',
      });
    }

    const client = await pool.query(
      `SELECT id, first_name, last_name, supervisor_id FROM clients WHERE id = $1`,
      [client_id]
    );

    if (client.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found.',
      });
    }

    if (client.rows[0].supervisor_id) {
      return res.status(400).json({
        success: false,
        message: 'This client is already assigned to a supervisor.',
      });
    }

    await pool.query(
      `UPDATE clients SET supervisor_id = $1, updated_at = NOW() WHERE id = $2`,
      [supervisorId, client_id]
    );

    return res.status(200).json({
      success: true,
      message: `${client.rows[0].first_name} ${client.rows[0].last_name} added to your clients.`,
    });
  } catch (error) {
    console.error('Add Client To Supervision Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// ─── Get My Job Cards ─────────────────────────────────────
const getMyJobCards = async (req, res) => {
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
       WHERE jc.supervisor_id = $1
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

// ─── Get My Invoices ──────────────────────────────────────
const getMyInvoices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              jc.description AS job_description
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       JOIN job_cards jc ON i.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE jc.supervisor_id = $1
       ORDER BY i.issued_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get My Invoices Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// ─── Get Unassigned Mechanics (no supervisor yet) ─────────
const getUnassignedMechanics = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, specialization, is_active
       FROM users
       WHERE role = 'mechanic' AND supervisor_id IS NULL AND is_active = TRUE
       ORDER BY first_name ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get Unassigned Mechanics Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// ─── Get Unassigned Clients (no supervisor yet) ───────────
const getUnassignedClients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_active
       FROM clients
       WHERE supervisor_id IS NULL AND is_active = TRUE
       ORDER BY first_name ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get Unassigned Clients Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};




// ═══════════════════════════════════════════════════════════
// ─── MECHANIC CRUD ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

// ─── Create Mechanic (auto-assigned to this supervisor) ───
const createMechanic = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { first_name, last_name, email, phone, password, specialization } = req.body;

    if (!first_name || !last_name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide first name, last name, phone and password.' });
    }

    if (email) {
      const emailExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (emailExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    const phoneExists = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (phoneExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A user with this phone number already exists.' });

    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role, specialization, supervisor_id)
       VALUES ($1, $2, $3, $4, $5, 'mechanic', $6, $7)
       RETURNING id, first_name, last_name, email, phone, role, specialization, is_active, created_at`,
      [first_name, last_name, email || null, phone, hashedPassword, specialization || null, req.user.id]
    );

    return res.status(201).json({ success: true, message: 'Mechanic created and added to your team.', data: result.rows[0] });
  } catch (error) {
    console.error('Create Mechanic Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Update Mechanic (only own team) ─────────────────────
const updateMechanic = async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const { first_name, last_name, email, phone, specialization } = req.body;

    const mechanic = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2 AND supervisor_id = $3',
      [mechanicId, 'mechanic', req.user.id]
    );
    if (mechanic.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Mechanic not found on your team.' });

    if (email) {
      const emailExists = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, mechanicId]);
      if (emailExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'This email is already in use.' });
    }
    if (phone) {
      const phoneExists = await pool.query('SELECT id FROM users WHERE phone = $1 AND id != $2', [phone, mechanicId]);
      if (phoneExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'This phone number is already in use.' });
    }

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
           email = COALESCE($3, email), phone = COALESCE($4, phone),
           specialization = COALESCE($5, specialization), updated_at = NOW()
       WHERE id = $6
       RETURNING id, first_name, last_name, email, phone, specialization, is_active`,
      [first_name, last_name, email, phone, specialization, mechanicId]
    );

    return res.status(200).json({ success: true, message: 'Mechanic updated successfully.', data: result.rows[0] });
  } catch (error) {
    console.error('Update Mechanic Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Toggle Mechanic Status (only own team) ───────────────
const toggleMechanicStatus = async (req, res) => {
  try {
    const { mechanicId } = req.params;

    const mechanic = await pool.query(
      'SELECT id, first_name, last_name, is_active FROM users WHERE id = $1 AND role = $2 AND supervisor_id = $3',
      [mechanicId, 'mechanic', req.user.id]
    );
    if (mechanic.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Mechanic not found on your team.' });

    const newStatus = !mechanic.rows[0].is_active;
    await pool.query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, mechanicId]);

    return res.status(200).json({
      success: true,
      message: `Mechanic ${newStatus ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (error) {
    console.error('Toggle Mechanic Status Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Delete Mechanic (only own team) ─────────────────────
const deleteMechanic = async (req, res) => {
  try {
    const { mechanicId } = req.params;

    const mechanic = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = $2 AND supervisor_id = $3',
      [mechanicId, 'mechanic', req.user.id]
    );
    if (mechanic.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Mechanic not found on your team.' });

    await pool.query('DELETE FROM users WHERE id = $1', [mechanicId]);

    return res.status(200).json({
      success: true,
      message: `${mechanic.rows[0].first_name} ${mechanic.rows[0].last_name} deleted successfully.`,
    });
  } catch (error) {
    console.error('Delete Mechanic Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ═══════════════════════════════════════════════════════════
// ─── CLIENT CRUD ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

// ─── Create Client (auto-assigned to this supervisor) ─────
const createClient = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { first_name, last_name, email, phone, password } = req.body;

    if (!first_name || !last_name || !phone || !password)
      return res.status(400).json({ success: false, message: 'Please provide first name, last name, phone and password.' });

    const phoneExists = await pool.query('SELECT id FROM clients WHERE phone = $1', [phone]);
    if (phoneExists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'A client with this phone already exists.' });

    if (email) {
      const emailExists = await pool.query('SELECT id FROM clients WHERE email = $1', [email]);
      if (emailExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'A client with this email already exists.' });
    }

    const salt           = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, password, supervisor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, phone, is_active, created_at`,
      [first_name, last_name, email || null, phone, hashedPassword, req.user.id]
    );

    return res.status(201).json({ success: true, message: 'Client created and added to your supervision.', data: result.rows[0] });
  } catch (error) {
    console.error('Create Client Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Update Client (only own clients) ────────────────────
const updateClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { first_name, last_name, email, phone } = req.body;

    const client = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND supervisor_id = $2',
      [clientId, req.user.id]
    );
    if (client.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Client not found under your supervision.' });

    if (email) {
      const emailExists = await pool.query('SELECT id FROM clients WHERE email = $1 AND id != $2', [email, clientId]);
      if (emailExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'This email is already in use.' });
    }
    if (phone) {
      const phoneExists = await pool.query('SELECT id FROM clients WHERE phone = $1 AND id != $2', [phone, clientId]);
      if (phoneExists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'This phone number is already in use.' });
    }

    const result = await pool.query(
      `UPDATE clients
       SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
           email = COALESCE($3, email), phone = COALESCE($4, phone), updated_at = NOW()
       WHERE id = $5
       RETURNING id, first_name, last_name, email, phone, is_active`,
      [first_name, last_name, email, phone, clientId]
    );

    return res.status(200).json({ success: true, message: 'Client updated successfully.', data: result.rows[0] });
  } catch (error) {
    console.error('Update Client Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Toggle Client Status (only own clients) ─────────────
const toggleClientStatus = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await pool.query(
      'SELECT id, first_name, last_name, is_active FROM clients WHERE id = $1 AND supervisor_id = $2',
      [clientId, req.user.id]
    );
    if (client.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Client not found under your supervision.' });

    const newStatus = !client.rows[0].is_active;
    await pool.query('UPDATE clients SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, clientId]);

    return res.status(200).json({
      success: true,
      message: `Client ${newStatus ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (error) {
    console.error('Toggle Client Status Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Delete Client (only own clients) ────────────────────
const deleteClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await pool.query(
      'SELECT id, first_name, last_name FROM clients WHERE id = $1 AND supervisor_id = $2',
      [clientId, req.user.id]
    );
    if (client.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Client not found under your supervision.' });

    await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);

    return res.status(200).json({
      success: true,
      message: `${client.rows[0].first_name} ${client.rows[0].last_name} deleted successfully.`,
    });
  } catch (error) {
    console.error('Delete Client Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ═══════════════════════════════════════════════════════════
// ─── VEHICLES (supervisor's clients only) ──────────────────
// ═══════════════════════════════════════════════════════════

const getMyVehicles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*,
              c.first_name || ' ' || c.last_name AS owner_name,
              c.phone AS owner_phone
       FROM vehicles v
       JOIN clients c ON v.client_id = c.id
       WHERE c.supervisor_id = $1
       ORDER BY v.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Supervisor Get Vehicles Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ═══════════════════════════════════════════════════════════
// ─── APPOINTMENTS (supervisor's team mechanics) ─────────────
// ═══════════════════════════════════════════════════════════

const getMyAppointments = async (req, res) => {
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
       WHERE c.supervisor_id = $1
          OR a.mechanic_id IN (
            SELECT id FROM users WHERE supervisor_id = $1 AND role = 'mechanic'
          )
       ORDER BY a.appointment_date ASC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Supervisor Get Appointments Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ═══════════════════════════════════════════════════════════
// ─── REVIEWS (supervisor's team jobs only) ──────────────────
// ═══════════════════════════════════════════════════════════

const getMyReviews = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              c.first_name || ' ' || c.last_name AS client_name,
              u.first_name || ' ' || u.last_name AS mechanic_name,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              jc.description AS job_description
       FROM reviews r
       JOIN clients c ON r.client_id = c.id
       JOIN job_cards jc ON r.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       LEFT JOIN users u ON r.mechanic_id = u.id
       WHERE jc.supervisor_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    // Rating summary
    const summary = await pool.query(
      `SELECT
         COUNT(*) AS total_reviews,
         ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
         COUNT(CASE WHEN r.rating = 5 THEN 1 END) AS five_star,
         COUNT(CASE WHEN r.rating = 4 THEN 1 END) AS four_star,
         COUNT(CASE WHEN r.rating = 3 THEN 1 END) AS three_star,
         COUNT(CASE WHEN r.rating = 2 THEN 1 END) AS two_star,
         COUNT(CASE WHEN r.rating = 1 THEN 1 END) AS one_star
       FROM reviews r
       JOIN job_cards jc ON r.job_id = jc.id
       WHERE jc.supervisor_id = $1`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      summary: summary.rows[0],
      data: result.rows,
    });
  } catch (error) {
    console.error('Supervisor Get Reviews Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = {
  getSupervisorDashboard,
  getMyTeam,
  addMechanicToTeam,
  removeMechanicFromTeam,
  getMyClients,
  addClientToSupervision,
  getMyJobCards,
  getMyInvoices,
  getUnassignedMechanics,
  getUnassignedClients,
  // Mechanic CRUD
  createMechanic,
  updateMechanic,
  toggleMechanicStatus,
  deleteMechanic,
  // Client CRUD
  createClient,
  updateClient,
  toggleClientStatus,
  deleteClient,
  // Vehicles, Appointments, Reviews
  getMyVehicles,
  getMyAppointments,
  getMyReviews,
};