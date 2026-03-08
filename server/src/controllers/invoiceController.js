const { pool } = require('../config/db');

// ─── Create Invoice ───────────────────────────────────────
const createInvoice = async (req, res) => {
  try {
    const {
      job_id,
      labour_cost,
      notes,
    } = req.body;

    if (!job_id || labour_cost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide job ID and labour cost.',
      });
    }

    // Check if job card exists and is completed
    const jobExists = await pool.query(
      `SELECT jc.*, v.client_id
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE jc.id = $1`,
      [job_id]
    );
    if (jobExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job card not found.',
      });
    }

    const job = jobExists.rows[0];

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'An invoice can only be created for a completed job.',
      });
    }

    // Check if invoice already exists for this job
    const invoiceExists = await pool.query(
      'SELECT id FROM invoices WHERE job_id = $1',
      [job_id]
    );
    if (invoiceExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An invoice already exists for this job.',
      });
    }

    // Calculate parts cost from job_parts
    const partsResult = await pool.query(
      `SELECT COALESCE(SUM(quantity_used * unit_price), 0) AS parts_cost
       FROM job_parts
       WHERE job_id = $1`,
      [job_id]
    );

    const parts_cost = parseFloat(partsResult.rows[0].parts_cost);
    const total_amount = parseFloat(labour_cost) + parts_cost;

    const paid_at = status === 'paid' ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO invoices
        (job_id, client_id, labour_cost, parts_cost, total_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        job_id,
        job.client_id,
        labour_cost,
        parts_cost,
        total_amount,
        notes || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create Invoice Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get All Invoices (Staff only) ───────────────────────
const getAllInvoices = async (req, res) => {
  try {
    const paid_at = status === 'paid' ? new Date() : null;

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
       ORDER BY i.issued_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Invoices Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get My Invoices (Client only) ───────────────────────
const getMyInvoices = async (req, res) => {
  try {
    const paid_at = status === 'paid' ? new Date() : null;

    const result = await pool.query(
      `SELECT i.*,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              jc.description AS job_description
       FROM invoices i
       JOIN job_cards jc ON i.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE i.client_id = $1
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


// ─── Get Single Invoice by ID ─────────────────────────────
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const paid_at = status === 'paid' ? new Date() : null;

    const result = await pool.query(
      `SELECT i.*,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone,
              c.email AS client_email,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              v.year,
              jc.description AS job_description,
              jc.actual_completion,
              u.first_name || ' ' || u.last_name AS mechanic_name
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       JOIN job_cards jc ON i.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       LEFT JOIN users u ON jc.mechanic_id = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    // If client is requesting, make sure it's their invoice
    if (
      req.user.role === 'client' &&
      result.rows[0].client_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This invoice does not belong to you.',
      });
    }

    // Get parts breakdown
    const partsResult = await pool.query(
      `SELECT jp.quantity_used, jp.unit_price,
              jp.quantity_used * jp.unit_price AS subtotal,
              i.name AS part_name,
              i.sku
       FROM job_parts jp
       JOIN inventory i ON jp.part_id = i.id
       WHERE jp.job_id = $1`,
      [result.rows[0].job_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        parts_breakdown: partsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get Invoice By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Record Payment ───────────────────────────────────────
const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, amount_paid } = req.body;

    const validMethods = ['cash', 'mpesa', 'card', 'invoice_credit'];

    if (!payment_method || !amount_paid) {
      return res.status(400).json({
        success: false,
        message: 'Please provide payment method and amount paid.',
      });
    }

    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`,
      });
    }

    // Check if invoice exists
    const invoiceExists = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    if (invoiceExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    const invoice = invoiceExists.rows[0];

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This invoice has already been fully paid.',
      });
    }

    // Determine payment status
    const paid_amount = parseFloat(amount_paid);
    const total = parseFloat(invoice.total_amount);
    let status;

    if (paid_amount >= total) {
      status = 'paid';
    } else if (paid_amount > 0) {
      status = 'partially_paid';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Amount paid must be greater than 0.',
      });
    }

    const paid_at = status === 'paid' ? new Date() : null;

    const result = await pool.query(
      `UPDATE invoices
       SET payment_method = $1,
           status         = $2,
           paid_at        = $3,
           updated_at     = NOW()
       WHERE id = $4
       RETURNING *`,
      [payment_method, status, paid_at, id]
    );

    return res.status(200).json({
      success: true,
      message: status === 'paid'
        ? 'Payment recorded. Invoice fully paid!'
        : `Partial payment of KES ${paid_amount.toLocaleString()} recorded. Balance: KES ${(total - paid_amount).toLocaleString()}`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Record Payment Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Update Invoice (Admin/Supervisor only) ───────────────
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { labour_cost, notes } = req.body;

    const invoiceExists = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    if (invoiceExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    if (invoiceExists.rows[0].status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a paid invoice.',
      });
    }

    // Recalculate total if labour cost changed
    let total_amount = parseFloat(invoiceExists.rows[0].total_amount);
    let new_labour_cost = parseFloat(invoiceExists.rows[0].labour_cost);

    if (labour_cost !== undefined) {
      new_labour_cost = parseFloat(labour_cost);
      const parts_cost = parseFloat(invoiceExists.rows[0].parts_cost);
      total_amount = new_labour_cost + parts_cost;
    }

    const paid_at = status === 'paid' ? new Date() : null;

    const result = await pool.query(
      `UPDATE invoices
       SET labour_cost  = $1,
           total_amount = $2,
           notes        = COALESCE($3, notes),
           updated_at   = NOW()
       WHERE id = $4
       RETURNING *`,
      [new_labour_cost, total_amount, notes, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Invoice updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Invoice Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Billing Summary (Admin only) ────────────────────
const getBillingSummary = async (req, res) => {
  try {
    const summary = await pool.query(
      `SELECT
        COUNT(*) AS total_invoices,
        SUM(total_amount) AS total_billed,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS total_collected,
        SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) AS total_pending,
        SUM(CASE WHEN status = 'partially_paid' THEN total_amount ELSE 0 END) AS total_partial,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paid_invoices,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_invoices,
        COUNT(CASE WHEN status = 'partially_paid' THEN 1 END) AS partial_invoices
       FROM invoices`
    );

    return res.status(200).json({
      success: true,
      data: summary.rows[0],
    });
  } catch (error) {
    console.error('Get Billing Summary Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Delete Invoice (Admin only) ─────────────────────────
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceExists = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    if (invoiceExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    if (invoiceExists.rows[0].status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a paid invoice.',
      });
    }

    await pool.query('DELETE FROM invoices WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Invoice Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  getMyInvoices,
  getInvoiceById,
  recordPayment,
  updateInvoice,
  getBillingSummary,
  deleteInvoice,
};