const { pool } = require('../config/db');

// ─── Admin Dashboard ──────────────────────────────────────
const getAdminDashboard = async (req, res) => {
  try {
    const gid = req.garage_id;

    const counts = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM clients     WHERE is_active = TRUE AND garage_id = $1) AS total_clients,
        (SELECT COUNT(*) FROM users       WHERE is_active = TRUE AND garage_id = $1) AS total_staff,
        (SELECT COUNT(*) FROM vehicles    WHERE garage_id = $1) AS total_vehicles,
        (SELECT COUNT(*) FROM appointments WHERE garage_id = $1) AS total_appointments,
        (SELECT COUNT(*) FROM job_cards   WHERE garage_id = $1) AS total_jobs,
        (SELECT COUNT(*) FROM invoices    WHERE garage_id = $1) AS total_invoices`,
      [gid]
    );

    const appointmentStats = await pool.query(
      `SELECT status, COUNT(*) AS count FROM appointments WHERE garage_id = $1 GROUP BY status`, [gid]
    );

    const jobStats = await pool.query(
      `SELECT status, COUNT(*) AS count FROM job_cards WHERE garage_id = $1 GROUP BY status`, [gid]
    );

    const billingStats = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_billed,
              COALESCE(SUM(CASE WHEN status = 'paid'    THEN total_amount ELSE 0 END), 0) AS total_collected,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0) AS total_pending,
              COUNT(CASE WHEN status = 'paid'    THEN 1 END) AS paid_invoices,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_invoices
       FROM invoices WHERE garage_id = $1`, [gid]
    );

    const inventoryAlerts = await pool.query(
      `SELECT COUNT(*) AS low_stock_count FROM inventory
       WHERE quantity <= reorder_threshold AND garage_id = $1`, [gid]
    );

    const recentJobs = await pool.query(
      `SELECT jc.id, jc.description, jc.status, jc.created_at,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number,
              c.first_name || ' ' || c.last_name AS client_name,
              u.first_name || ' ' || u.last_name AS mechanic_name
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN clients c ON v.client_id = c.id
       LEFT JOIN users u ON jc.mechanic_id = u.id
       WHERE jc.garage_id = $1 ORDER BY jc.created_at DESC LIMIT 5`, [gid]
    );

    const recentAppointments = await pool.query(
      `SELECT a.id, a.service_type, a.appointment_date, a.status,
              c.first_name || ' ' || c.last_name AS client_name,
              v.make || ' ' || v.model AS vehicle_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.garage_id = $1 ORDER BY a.created_at DESC LIMIT 5`, [gid]
    );

    const topMechanics = await pool.query(
      `SELECT u.id, u.first_name || ' ' || u.last_name AS mechanic_name,
              u.specialization,
              COUNT(jc.id) AS completed_jobs,
              ROUND(AVG(r.rating)::numeric, 1) AS average_rating
       FROM users u
       LEFT JOIN job_cards jc ON u.id = jc.mechanic_id AND jc.status = 'completed' AND jc.garage_id = $1
       LEFT JOIN reviews r ON u.id = r.mechanic_id AND r.garage_id = $1
       WHERE u.role = 'mechanic' AND u.is_active = TRUE AND u.garage_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.specialization
       ORDER BY completed_jobs DESC LIMIT 5`, [gid]
    );

    const monthlyRevenue = await pool.query(
      `SELECT TO_CHAR(issued_at, 'Mon YYYY') AS month,
              COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) AS revenue,
              COUNT(*) AS invoices
       FROM invoices
       WHERE issued_at >= NOW() - INTERVAL '6 months' AND garage_id = $1
       GROUP BY TO_CHAR(issued_at, 'Mon YYYY'), DATE_TRUNC('month', issued_at)
       ORDER BY DATE_TRUNC('month', issued_at) ASC`, [gid]
    );

    return res.status(200).json({
      success: true,
      data: {
        counts: counts.rows[0],
        appointment_stats: appointmentStats.rows,
        job_stats: jobStats.rows,
        billing_stats: billingStats.rows[0],
        inventory_alerts: inventoryAlerts.rows[0],
        recent_jobs: recentJobs.rows,
        recent_appointments: recentAppointments.rows,
        top_mechanics: topMechanics.rows,
        monthly_revenue: monthlyRevenue.rows,
      },
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Mechanic Dashboard ───────────────────────────────────
const getMechanicDashboard = async (req, res) => {
  try {
    const mechanicId = req.user.id;
    const gid        = req.garage_id;

    const jobStats = await pool.query(
      `SELECT status, COUNT(*) AS count FROM job_cards
       WHERE mechanic_id = $1 AND garage_id = $2 GROUP BY status`,
      [mechanicId, gid]
    );

    const completedJobs = await pool.query(
      `SELECT COUNT(*) AS total FROM job_cards
       WHERE mechanic_id = $1 AND status = 'completed' AND garage_id = $2`,
      [mechanicId, gid]
    );

    const avgRating = await pool.query(
      `SELECT ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*) AS total_reviews
       FROM reviews WHERE mechanic_id = $1 AND garage_id = $2`,
      [mechanicId, gid]
    );

    const activeJobs = await pool.query(
      `SELECT jc.id, jc.description, jc.status, jc.estimated_completion,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number,
              c.first_name || ' ' || c.last_name AS client_name, c.phone AS client_phone
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN clients c ON v.client_id = c.id
       WHERE jc.mechanic_id = $1 AND jc.status != 'completed' AND jc.garage_id = $2
       ORDER BY jc.created_at DESC`,
      [mechanicId, gid]
    );

    const recentCompleted = await pool.query(
      `SELECT jc.id, jc.description, jc.actual_completion,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number
       FROM job_cards jc JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE jc.mechanic_id = $1 AND jc.status = 'completed' AND jc.garage_id = $2
       ORDER BY jc.actual_completion DESC LIMIT 5`,
      [mechanicId, gid]
    );

    const unreadNotifications = await pool.query(
      `SELECT COUNT(*) AS unread FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [mechanicId]
    );

    return res.status(200).json({
      success: true,
      data: {
        job_stats: jobStats.rows,
        completed_jobs: completedJobs.rows[0].total,
        rating: avgRating.rows[0],
        active_jobs: activeJobs.rows,
        recent_completed: recentCompleted.rows,
        unread_notifications: unreadNotifications.rows[0].unread,
      },
    });
  } catch (error) {
    console.error('Mechanic Dashboard Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Client Dashboard ─────────────────────────────────────
const getClientDashboard = async (req, res) => {
  try {
    const clientId = req.user.id;

    const vehicles = await pool.query(
      'SELECT * FROM vehicles WHERE client_id = $1', [clientId]
    );

    const appointmentStats = await pool.query(
      `SELECT status, COUNT(*) AS count FROM appointments
       WHERE client_id = $1 GROUP BY status`, [clientId]
    );

    const activeAppointments = await pool.query(
      `SELECT a.id, a.service_type, a.appointment_date, a.status,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number
       FROM appointments a JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.client_id = $1 AND a.status NOT IN ('completed', 'cancelled')
       ORDER BY a.appointment_date ASC`, [clientId]
    );

    const activeJobs = await pool.query(
      `SELECT jc.id, jc.description, jc.status, jc.estimated_completion,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number,
              u.first_name || ' ' || u.last_name AS mechanic_name
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN clients c ON v.client_id = c.id
       LEFT JOIN users u ON jc.mechanic_id = u.id
       WHERE c.id = $1 AND jc.status != 'completed'
       ORDER BY jc.created_at DESC`, [clientId]
    );

    const pendingInvoices = await pool.query(
      `SELECT i.id, i.total_amount, i.status, i.issued_at,
              v.make || ' ' || v.model AS vehicle_name, jc.description AS job_description
       FROM invoices i
       JOIN job_cards jc ON i.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE i.client_id = $1 AND i.status != 'paid'
       ORDER BY i.issued_at DESC`, [clientId]
    );

    const totalSpent = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_spent
       FROM invoices WHERE client_id = $1 AND status = 'paid'`, [clientId]
    );

    const unreadNotifications = await pool.query(
      `SELECT COUNT(*) AS unread FROM notifications
       WHERE client_id = $1 AND is_read = FALSE`, [clientId]
    );

    return res.status(200).json({
      success: true,
      data: {
        vehicles: vehicles.rows,
        appointment_stats: appointmentStats.rows,
        active_appointments: activeAppointments.rows,
        active_jobs: activeJobs.rows,
        pending_invoices: pendingInvoices.rows,
        total_spent: totalSpent.rows[0].total_spent,
        unread_notifications: unreadNotifications.rows[0].unread,
      },
    });
  } catch (error) {
    console.error('Client Dashboard Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── Receptionist Dashboard ───────────────────────────────
const getReceptionistDashboard = async (req, res) => {
  try {
    const gid = req.garage_id;

    const todayAppointments = await pool.query(
      `SELECT a.id, a.service_type, a.appointment_date, a.status,
              c.first_name || ' ' || c.last_name AS client_name, c.phone AS client_phone,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE DATE(a.appointment_date) = CURRENT_DATE AND a.garage_id = $1
       ORDER BY a.appointment_date ASC`, [gid]
    );

    const pendingAppointments = await pool.query(
      `SELECT a.id, a.service_type, a.appointment_date, a.status,
              c.first_name || ' ' || c.last_name AS client_name, c.phone AS client_phone,
              v.make || ' ' || v.model AS vehicle_name, v.plate_number
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.status = 'pending' AND a.appointment_date >= NOW() AND a.garage_id = $1
       ORDER BY a.appointment_date ASC LIMIT 10`, [gid]
    );

    const counts = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM appointments WHERE DATE(appointment_date) = CURRENT_DATE AND garage_id = $1) AS todays_appointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'pending' AND garage_id = $1) AS pending_appointments,
        (SELECT COUNT(*) FROM job_cards WHERE status != 'completed' AND garage_id = $1) AS active_jobs,
        (SELECT COUNT(*) FROM invoices WHERE status = 'pending' AND garage_id = $1) AS pending_invoices,
        (SELECT COUNT(*) FROM clients WHERE is_active = TRUE AND garage_id = $1) AS total_clients`,
      [gid]
    );

    const unreadNotifications = await pool.query(
      `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        counts: counts.rows[0],
        todays_appointments: todayAppointments.rows,
        pending_appointments: pendingAppointments.rows,
        unread_notifications: unreadNotifications.rows[0].unread,
      },
    });
  } catch (error) {
    console.error('Receptionist Dashboard Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = { getAdminDashboard, getMechanicDashboard, getClientDashboard, getReceptionistDashboard };