const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const generateToken = require('../utils/generateToken');

// ─── Create Super Admin (run once to seed) ────────────────
const createSuperAdmin = async (req, res) => {
  try {
    const { first_name, last_name, email, password, secret_key } = req.body;

    // Simple secret key guard to prevent unauthorized creation
    if (secret_key !== process.env.SUPER_ADMIN_SECRET) {
      return res.status(403).json({ success: false, message: 'Invalid secret key.' });
    }

    const exists = await pool.query('SELECT id FROM super_admins WHERE email = $1', [email]);
    if (exists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'Super admin with this email already exists.' });

    const salt     = await bcrypt.genSalt(10);
    const hashed   = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO super_admins (first_name, last_name, email, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, first_name, last_name, email, created_at`,
      [first_name, last_name, email, hashed]
    );

    return res.status(201).json({ success: true, message: 'Super admin created.', data: result.rows[0] });
  } catch (error) {
    console.error('Create Super Admin Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Super Admin Dashboard ────────────────────────────────────────────────────
const getSuperAdminDashboard = async (req, res) => {
  try {
    // Garage stats by status
    const garageStats = await pool.query(
      `SELECT status, COUNT(*) AS count FROM garages GROUP BY status`
    );

    // Platform totals
    const totals = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM clients) AS total_clients,
         (SELECT COUNT(*) FROM users)   AS total_staff,
         (SELECT COUNT(*) FROM appointments) AS total_appointments,
         (SELECT COUNT(*) FROM job_cards) AS total_jobs,
         (SELECT COALESCE(SUM(total_amount),0) FROM invoices) AS total_revenue,
         (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE status='paid') AS collected_revenue`
    );

    // Recent & pending garages
    const recentGarages = await pool.query(
      `SELECT id, name, email, phone, city, status, subscription_plan, created_at
       FROM garages ORDER BY created_at DESC LIMIT 5`
    );
    const pendingGarages = await pool.query(
      `SELECT id, name, email, phone, city, created_at
       FROM garages WHERE status = 'pending' ORDER BY created_at ASC`
    );

    // Per-garage breakdown
    const garageBreakdown = await pool.query(
      `SELECT g.id, g.name, g.city, g.status, g.subscription_plan,
              COUNT(DISTINCT u.id)  AS staff_count,
              COUNT(DISTINCT c.id)  AS client_count,
              COUNT(DISTINCT jc.id) AS job_count,
              COALESCE(SUM(i.total_amount), 0) AS total_revenue,
              COALESCE(SUM(CASE WHEN i.status='paid' THEN i.total_amount ELSE 0 END), 0) AS collected_revenue
       FROM garages g
       LEFT JOIN users u    ON u.garage_id  = g.id
       LEFT JOIN clients c  ON c.garage_id  = g.id
       LEFT JOIN job_cards jc ON jc.garage_id = g.id
       LEFT JOIN invoices i  ON i.garage_id  = g.id
       GROUP BY g.id ORDER BY total_revenue DESC`
    );

    // Monthly garage registrations (last 12 months)
    const monthlyGrowth = await pool.query(
      `SELECT TO_CHAR(created_at, 'Mon YYYY') AS month,
              DATE_TRUNC('month', created_at)  AS month_date,
              COUNT(*) AS count
       FROM garages
       WHERE created_at >= NOW() - INTERVAL '12 months'
       GROUP BY month, month_date ORDER BY month_date ASC`
    );

    // Monthly revenue across all garages (last 6 months)
    const monthlyRevenue = await pool.query(
      `SELECT TO_CHAR(issued_at, 'Mon YYYY') AS month,
              DATE_TRUNC('month', issued_at)  AS month_date,
              COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END), 0) AS revenue,
              COUNT(*) AS invoice_count
       FROM invoices
       WHERE issued_at >= NOW() - INTERVAL '6 months'
       GROUP BY month, month_date ORDER BY month_date ASC`
    );

    // Monthly appointments (last 6 months)
    const monthlyAppointments = await pool.query(
      `SELECT TO_CHAR(created_at, 'Mon YYYY') AS month,
              DATE_TRUNC('month', created_at)  AS month_date,
              COUNT(*) AS count,
              COUNT(CASE WHEN status='completed' THEN 1 END) AS completed
       FROM appointments
       WHERE created_at >= NOW() - INTERVAL '6 months'
       GROUP BY month, month_date ORDER BY month_date ASC`
    );

    // Subscription plan distribution
    const planDistribution = await pool.query(
      `SELECT subscription_plan AS plan, COUNT(*) AS count
       FROM garages GROUP BY subscription_plan ORDER BY count DESC`
    );

    // Status distribution for job cards across platform
    const jobStatusDistribution = await pool.query(
      `SELECT status, COUNT(*) AS count FROM job_cards GROUP BY status`
    );

    // Top 5 garages by revenue
    const topGaragesByRevenue = await pool.query(
      `SELECT g.name, g.city,
              COALESCE(SUM(CASE WHEN i.status='paid' THEN i.total_amount ELSE 0 END), 0) AS revenue,
              COUNT(DISTINCT jc.id) AS jobs
       FROM garages g
       LEFT JOIN invoices i  ON i.garage_id  = g.id
       LEFT JOIN job_cards jc ON jc.garage_id = g.id
       GROUP BY g.id ORDER BY revenue DESC LIMIT 5`
    );

    // Top 5 garages by client count
    const topGaragesByClients = await pool.query(
      `SELECT g.name, g.city, COUNT(DISTINCT c.id) AS clients
       FROM garages g
       LEFT JOIN clients c ON c.garage_id = g.id
       GROUP BY g.id ORDER BY clients DESC LIMIT 5`
    );

    // Platform-wide appointment status breakdown
    const appointmentStatus = await pool.query(
      `SELECT status, COUNT(*) AS count FROM appointments GROUP BY status`
    );

    const stats = garageStats.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        garage_stats: {
          total:     (stats.active||0) + (stats.pending||0) + (stats.suspended||0),
          active:    stats.active    || 0,
          pending:   stats.pending   || 0,
          suspended: stats.suspended || 0,
        },
        total_clients:       parseInt(totals.rows[0].total_clients),
        total_staff:         parseInt(totals.rows[0].total_staff),
        total_appointments:  parseInt(totals.rows[0].total_appointments),
        total_jobs:          parseInt(totals.rows[0].total_jobs),
        total_revenue:       parseFloat(totals.rows[0].total_revenue),
        collected_revenue:   parseFloat(totals.rows[0].collected_revenue),
        recent_garages:      recentGarages.rows,
        pending_garages:     pendingGarages.rows,
        garage_breakdown:    garageBreakdown.rows,
        monthly_growth:      monthlyGrowth.rows,
        monthly_revenue:     monthlyRevenue.rows,
        monthly_appointments: monthlyAppointments.rows,
        plan_distribution:   planDistribution.rows,
        job_status_distribution: jobStatusDistribution.rows,
        top_garages_revenue: topGaragesByRevenue.rows,
        top_garages_clients: topGaragesByClients.rows,
        appointment_status:  appointmentStatus.rows,
      },
    });
  } catch (error) {
    console.error('Super Admin Dashboard Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get All Garages ──────────────────────────────────────
const getAllGarages = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         g.*,
         COUNT(DISTINCT u.id) AS staff_count,
         COUNT(DISTINCT c.id) AS client_count,
         COUNT(DISTINCT jc.id) AS job_count,
         COALESCE(SUM(i.total_amount), 0) AS total_revenue
       FROM garages g
       LEFT JOIN users u ON u.garage_id = g.id
       LEFT JOIN clients c ON c.garage_id = g.id
       LEFT JOIN job_cards jc ON jc.garage_id = g.id
       LEFT JOIN invoices i ON i.garage_id = g.id
       GROUP BY g.id
       ORDER BY g.created_at DESC`
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get All Garages Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Get Single Garage ────────────────────────────────────
const getGarageById = async (req, res) => {
  try {
    const { id } = req.params;

    const garage = await pool.query('SELECT * FROM garages WHERE id = $1', [id]);
    if (garage.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Garage not found.' });

    // Staff
    const staff = await pool.query(
      'SELECT id, first_name, last_name, email, phone, role, is_active FROM users WHERE garage_id = $1 ORDER BY role ASC',
      [id]
    );

    // Stats
    const stats = await pool.query(
      `SELECT
         COUNT(DISTINCT c.id) AS clients,
         COUNT(DISTINCT v.id) AS vehicles,
         COUNT(DISTINCT jc.id) AS jobs,
         COALESCE(SUM(i.total_amount), 0) AS revenue
       FROM garages g
       LEFT JOIN clients c ON c.garage_id = $1
       LEFT JOIN vehicles v ON v.garage_id = $1
       LEFT JOIN job_cards jc ON jc.garage_id = $1
       LEFT JOIN invoices i ON i.garage_id = $1
       WHERE g.id = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...garage.rows[0], staff: staff.rows, stats: stats.rows[0] },
    });
  } catch (error) {
    console.error('Get Garage By ID Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Approve Garage ───────────────────────────────────────
const approveGarage = async (req, res) => {
  try {
    const { id } = req.params;

    const garage = await pool.query('SELECT * FROM garages WHERE id = $1', [id]);
    if (garage.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Garage not found.' });

    if (garage.rows[0].status === 'active')
      return res.status(400).json({ success: false, message: 'Garage is already active.' });

    await pool.query(
      `UPDATE garages SET status = 'active', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: `${garage.rows[0].name} has been approved and is now active.`,
    });
  } catch (error) {
    console.error('Approve Garage Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Reject Garage ────────────────────────────────────────
const rejectGarage = async (req, res) => {
  try {
    const { id } = req.params;

    const garage = await pool.query('SELECT * FROM garages WHERE id = $1', [id]);
    if (garage.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Garage not found.' });

    // Delete garage and its admin (cascades)
    await pool.query('DELETE FROM garages WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: `${garage.rows[0].name} registration has been rejected and removed.`,
    });
  } catch (error) {
    console.error('Reject Garage Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Suspend Garage ───────────────────────────────────────
const suspendGarage = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const garage = await pool.query('SELECT * FROM garages WHERE id = $1', [id]);
    if (garage.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Garage not found.' });

    await pool.query(
      `UPDATE garages SET status = 'suspended', updated_at = NOW() WHERE id = $1`, [id]
    );

    return res.status(200).json({
      success: true,
      message: `${garage.rows[0].name} has been suspended.`,
    });
  } catch (error) {
    console.error('Suspend Garage Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Reactivate Garage ────────────────────────────────────
const reactivateGarage = async (req, res) => {
  try {
    const { id } = req.params;

    const garage = await pool.query('SELECT * FROM garages WHERE id = $1', [id]);
    if (garage.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Garage not found.' });

    await pool.query(
      `UPDATE garages SET status = 'active', updated_at = NOW() WHERE id = $1`, [id]
    );

    return res.status(200).json({
      success: true,
      message: `${garage.rows[0].name} has been reactivated.`,
    });
  } catch (error) {
    console.error('Reactivate Garage Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── Update Garage Subscription ───────────────────────────
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { subscription_plan } = req.body;

    const validPlans = ['free', 'basic', 'premium'];
    if (!validPlans.includes(subscription_plan))
      return res.status(400).json({ success: false, message: `Invalid plan. Must be one of: ${validPlans.join(', ')}` });

    const result = await pool.query(
      `UPDATE garages SET subscription_plan = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, subscription_plan`,
      [subscription_plan, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Garage not found.' });

    return res.status(200).json({
      success: true,
      message: `Subscription updated to ${subscription_plan}.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Subscription Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Verify Garage ────────────────────────────────────────
const verifyGarage = async (req, res) => {
  try {
    const { id } = req.params;
    const { trust_score = 80 } = req.body;

    const garage = await pool.query('SELECT * FROM garages WHERE id = $1', [id]);
    if (garage.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Garage not found.' });

    const isVerified = !garage.rows[0].is_verified;

    await pool.query(
      `UPDATE garages SET is_verified = $1, verified_at = $2,
         trust_score = $3, updated_at = NOW() WHERE id = $4`,
      [isVerified, isVerified ? new Date() : null, isVerified ? trust_score : 0, id]
    );

    return res.status(200).json({
      success: true,
      message: `${garage.rows[0].name} has been ${isVerified ? 'verified' : 'unverified'}.`,
    });
  } catch (error) {
    console.error('Verify Garage Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  createSuperAdmin,
  getSuperAdminDashboard,
  getAllGarages,
  getGarageById,
  approveGarage,
  rejectGarage,
  suspendGarage,
  reactivateGarage,
  updateSubscription,
  verifyGarage,
};