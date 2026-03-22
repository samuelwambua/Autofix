const { pool } = require('../config/db');

// ─── Get All Smart Reminders for Client ───────────────────
const getSmartReminders = async (req, res) => {
  try {
    const clientId = req.user.id;

    // 1. Manual maintenance reminders
    const manualReminders = await pool.query(
      `SELECT mr.*,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number, v.mileage AS current_mileage
       FROM maintenance_reminders mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       WHERE mr.client_id = $1
         AND mr.is_dismissed = FALSE
         AND mr.is_completed = FALSE
       ORDER BY mr.due_date ASC NULLS LAST`,
      [clientId]
    );

    // 2. Insurance expiry alerts (from vehicles)
    const insuranceAlerts = await pool.query(
      `SELECT v.id AS vehicle_id, v.make, v.model, v.plate_number,
              v.insurance_expiry,
              (v.insurance_expiry - CURRENT_DATE) AS days_remaining,
              'insurance_expiry' AS alert_type
       FROM vehicles v
       WHERE v.client_id = $1
         AND v.insurance_expiry IS NOT NULL
         AND v.insurance_expiry <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY v.insurance_expiry ASC`,
      [clientId]
    );

    // 3. Service due alerts (based on last service + 3 months or 5000km)
    const serviceDueAlerts = await pool.query(
      `SELECT v.id AS vehicle_id, v.make, v.model, v.plate_number,
              v.mileage AS current_mileage,
              MAX(jc.created_at) AS last_service_date,
              COUNT(jc.id) AS total_services
       FROM vehicles v
       LEFT JOIN job_cards jc ON jc.vehicle_id = v.id AND jc.status = 'completed'
       WHERE v.client_id = $1
       GROUP BY v.id, v.make, v.model, v.plate_number, v.mileage
       HAVING MAX(jc.created_at) < NOW() - INTERVAL '3 months'
          OR MAX(jc.created_at) IS NULL`,
      [clientId]
    );

    // 4. Pending quotes needing approval
    const pendingQuotes = await pool.query(
      `SELECT q.id, q.total_amount, q.valid_until, q.created_at,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              g.name AS garage_name,
              'pending_quote' AS alert_type
       FROM quotes q
       JOIN job_cards jc ON q.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN garages g ON q.garage_id = g.id
       WHERE q.client_id = $1
         AND q.status IN ('pending', 'revised')
         AND (q.valid_until IS NULL OR q.valid_until > NOW())
       ORDER BY q.created_at DESC`,
      [clientId]
    );

    // 5. Unpaid invoices
    const unpaidInvoices = await pool.query(
      `SELECT i.id, i.total_amount, i.issued_at,
              v.make || ' ' || v.model AS vehicle_name,
              g.name AS garage_name,
              'unpaid_invoice' AS alert_type
       FROM invoices i
       JOIN job_cards jc ON i.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN garages g ON i.garage_id = g.id
       WHERE i.client_id = $1
         AND i.status IN ('pending', 'partially_paid')
       ORDER BY i.issued_at DESC`,
      [clientId]
    );

    // Build unified alerts array with priority
    const alerts = [];

    // High priority — overdue
    insuranceAlerts.rows.forEach(a => {
      const days = parseInt(a.days_remaining);
      alerts.push({
        id:       `insurance-${a.vehicle_id}`,
        type:     'insurance_expiry',
        priority: days <= 0 ? 'critical' : days <= 7 ? 'high' : 'medium',
        title:    days <= 0 ? 'Insurance Expired!' : `Insurance Expiring Soon`,
        message:  days <= 0
          ? `${a.make} ${a.model} (${a.plate_number}) insurance has expired.`
          : `${a.make} ${a.model} (${a.plate_number}) insurance expires in ${days} days.`,
        vehicle_name:  `${a.make} ${a.model}`,
        plate_number:  a.plate_number,
        vehicle_id:    a.vehicle_id,
        days_remaining: days,
        expiry_date:   a.insurance_expiry,
        action:        'renew_insurance',
      });
    });

    pendingQuotes.rows.forEach(q => {
      alerts.push({
        id:       `quote-${q.id}`,
        type:     'pending_quote',
        priority: 'high',
        title:    'Repair Quote Awaiting Approval',
        message:  `KES ${parseFloat(q.total_amount).toLocaleString()} quote from ${q.garage_name} for ${q.vehicle_name} needs your approval.`,
        quote_id:     q.id,
        vehicle_name: q.vehicle_name,
        garage_name:  q.garage_name,
        amount:       q.total_amount,
        valid_until:  q.valid_until,
        action:       'view_quote',
      });
    });

    unpaidInvoices.rows.forEach(i => {
      alerts.push({
        id:       `invoice-${i.id}`,
        type:     'unpaid_invoice',
        priority: 'medium',
        title:    'Unpaid Invoice',
        message:  `KES ${parseFloat(i.total_amount).toLocaleString()} invoice from ${i.garage_name} for ${i.vehicle_name} is pending payment.`,
        invoice_id:   i.id,
        vehicle_name: i.vehicle_name,
        garage_name:  i.garage_name,
        amount:       i.total_amount,
        action:       'pay_invoice',
      });
    });

    manualReminders.rows.forEach(r => {
      const days = r.due_date
        ? Math.ceil((new Date(r.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        : null;
      alerts.push({
        id:           `reminder-${r.id}`,
        type:         'maintenance_reminder',
        priority:     days !== null && days <= 0 ? 'high' : days !== null && days <= 7 ? 'medium' : 'low',
        title:        r.reminder_type,
        message:      `${r.vehicle_name} (${r.plate_number})${r.due_date ? ` — due ${days <= 0 ? 'overdue' : `in ${days} days`}` : ''}${r.due_mileage ? ` or at ${parseInt(r.due_mileage).toLocaleString()}km` : ''}`,
        reminder_id:  r.id,
        vehicle_name: r.vehicle_name,
        plate_number: r.plate_number,
        due_date:     r.due_date,
        due_mileage:  r.due_mileage,
        days_remaining: days,
        action:       'view_vehicle',
        vehicle_id:   r.vehicle_id,
      });
    });

    serviceDueAlerts.rows.forEach(v => {
      if (parseInt(v.total_services) > 0) {
        alerts.push({
          id:           `service-${v.vehicle_id}`,
          type:         'service_due',
          priority:     'low',
          title:        'Service Due',
          message:      `${v.make} ${v.model} (${v.plate_number}) hasn't been serviced in over 3 months.`,
          vehicle_name: `${v.make} ${v.model}`,
          plate_number: v.plate_number,
          vehicle_id:   v.vehicle_id,
          last_service: v.last_service_date,
          action:       'book_service',
        });
      }
    });

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    return res.status(200).json({
      success: true,
      count:   alerts.length,
      unread:  alerts.filter(a => a.priority === 'critical' || a.priority === 'high').length,
      data:    alerts,
    });
  } catch (error) {
    console.error('Get Smart Reminders Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getSmartReminders };