const { pool } = require('../config/db');

// ─── Create Quote ─────────────────────────────────────────
const createQuote = async (req, res) => {
  try {
    const { job_card_id, notes, valid_days = 3, items } = req.body;
    const garage_id  = req.garage_id;
    const created_by = req.user.id;

    if (!job_card_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide job card ID and at least one quote item.',
      });
    }

    // Get job card and client
    const jobResult = await pool.query(
      `SELECT jc.*, v.client_id,
              c.first_name || ' ' || c.last_name AS client_name,
              c.email AS client_email,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN clients c ON v.client_id = c.id
       WHERE jc.id = $1 AND jc.garage_id = $2`,
      [job_card_id, garage_id]
    );

    if (jobResult.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Job card not found.' });

    const job = jobResult.rows[0];

    // Check no pending quote exists
    const existingQuote = await pool.query(
      `SELECT id FROM quotes WHERE job_card_id = $1 AND status IN ('pending', 'revised')`,
      [job_card_id]
    );
    if (existingQuote.rows.length > 0)
      return res.status(400).json({
        success: false,
        message: 'A pending quote already exists for this job card.',
      });

    // Calculate totals from items
    let labour_cost = 0;
    let parts_cost  = 0;

    for (const item of items) {
      item.total_cost = parseFloat(item.quantity || 1) * parseFloat(item.unit_cost);
      if (item.item_type === 'labour') labour_cost += item.total_cost;
      else parts_cost += item.total_cost;
    }

    const total_amount = labour_cost + parts_cost;
    const valid_until  = new Date();
    valid_until.setDate(valid_until.getDate() + parseInt(valid_days));

    // Create quote
    const quoteResult = await pool.query(
      `INSERT INTO quotes
        (job_card_id, client_id, garage_id, created_by, labour_cost, parts_cost,
         total_amount, notes, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [job_card_id, job.client_id, garage_id, created_by,
       labour_cost, parts_cost, total_amount, notes || null, valid_until]
    );

    const quote = quoteResult.rows[0];

    // Insert quote items
    for (const item of items) {
      await pool.query(
        `INSERT INTO quote_items
          (quote_id, item_type, description, quantity, unit_cost, total_cost, part_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [quote.id, item.item_type, item.description,
         item.quantity || 1, item.unit_cost, item.total_cost,
         item.part_id || null]
      );
    }

    // Notify client — update job card status to awaiting_approval
    await pool.query(
      `UPDATE job_cards SET status = 'diagnosing', updated_at = NOW() WHERE id = $1`,
      [job_card_id]
    );

    return res.status(201).json({
      success: true,
      message: `Quote of KES ${total_amount.toLocaleString()} sent to ${job.client_name} for approval.`,
      data: { ...quote, items, job },
    });
  } catch (error) {
    console.error('Create Quote Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get All Quotes (Staff) ───────────────────────────────
const getAllQuotes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              jc.description AS job_description,
              u.first_name || ' ' || u.last_name AS created_by_name
       FROM quotes q
       JOIN clients c ON q.client_id = c.id
       JOIN job_cards jc ON q.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       LEFT JOIN users u ON q.created_by = u.id
       WHERE q.garage_id = $1
       ORDER BY q.created_at DESC`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get All Quotes Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get My Quotes (Client) ───────────────────────────────
const getMyQuotes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              jc.description AS job_description,
              g.name AS garage_name,
              g.phone AS garage_phone
       FROM quotes q
       JOIN job_cards jc ON q.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN garages g ON q.garage_id = g.id
       WHERE q.client_id = $1
       ORDER BY q.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get My Quotes Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get Quote by ID ──────────────────────────────────────
const getQuoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const quoteResult = await pool.query(
      `SELECT q.*,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone AS client_phone, c.email AS client_email,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number, v.year,
              jc.description AS job_description,
              g.name AS garage_name, g.phone AS garage_phone,
              u.first_name || ' ' || u.last_name AS created_by_name
       FROM quotes q
       JOIN clients c ON q.client_id = c.id
       JOIN job_cards jc ON q.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN garages g ON q.garage_id = g.id
       LEFT JOIN users u ON q.created_by = u.id
       WHERE q.id = $1`,
      [id]
    );

    if (quoteResult.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Quote not found.' });

    const quote = quoteResult.rows[0];

    // Access control
    if (req.user.role === 'client' && quote.client_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    if (req.garage_id && quote.garage_id !== req.garage_id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    // Get items
    const itemsResult = await pool.query(
      `SELECT qi.*, i.name AS part_name, i.sku
       FROM quote_items qi
       LEFT JOIN inventory i ON qi.part_id = i.id
       WHERE qi.quote_id = $1 ORDER BY qi.item_type ASC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...quote, items: itemsResult.rows },
    });
  } catch (error) {
    console.error('Get Quote By ID Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Client: Approve Quote ────────────────────────────────
const approveQuote = async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await pool.query(
      'SELECT * FROM quotes WHERE id = $1 AND client_id = $2',
      [id, req.user.id]
    );
    if (quote.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Quote not found.' });

    if (quote.rows[0].status !== 'pending' && quote.rows[0].status !== 'revised')
      return res.status(400).json({ success: false, message: `Cannot approve a ${quote.rows[0].status} quote.` });

    // Check validity
    if (new Date(quote.rows[0].valid_until) < new Date())
      return res.status(400).json({ success: false, message: 'This quote has expired. Please request a new one.' });

    await pool.query(
      `UPDATE quotes SET status = 'approved', approved_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Advance job card to in_progress
    await pool.query(
      `UPDATE job_cards SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
      [quote.rows[0].job_card_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Quote approved! The garage has been notified and work will begin shortly.',
    });
  } catch (error) {
    console.error('Approve Quote Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Client: Reject Quote ─────────────────────────────────
const rejectQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const quote = await pool.query(
      'SELECT * FROM quotes WHERE id = $1 AND client_id = $2',
      [id, req.user.id]
    );
    if (quote.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Quote not found.' });

    if (quote.rows[0].status !== 'pending' && quote.rows[0].status !== 'revised')
      return res.status(400).json({ success: false, message: `Cannot reject a ${quote.rows[0].status} quote.` });

    await pool.query(
      `UPDATE quotes SET status = 'rejected', rejected_at = NOW(),
         rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
      [reason || null, id]
    );

    // Pause job card
    await pool.query(
      `UPDATE job_cards SET status = 'received', updated_at = NOW() WHERE id = $1`,
      [quote.rows[0].job_card_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Quote rejected. The garage has been notified.',
    });
  } catch (error) {
    console.error('Reject Quote Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Client: Request Alternative ─────────────────────────
const requestAlternative = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const quote = await pool.query(
      'SELECT * FROM quotes WHERE id = $1 AND client_id = $2',
      [id, req.user.id]
    );
    if (quote.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Quote not found.' });

    if (quote.rows[0].status !== 'pending' && quote.rows[0].status !== 'revised')
      return res.status(400).json({ success: false, message: 'Cannot request alternative for this quote.' });

    await pool.query(
      `UPDATE quotes
       SET rejection_reason = $1, updated_at = NOW()
       WHERE id = $2`,
      [`[ALTERNATIVE REQUESTED] ${message || 'Client requested a cheaper alternative.'}`, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Alternative request sent to the garage. They will revise the quote shortly.',
    });
  } catch (error) {
    console.error('Request Alternative Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Staff: Revise Quote ──────────────────────────────────
const reviseQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, items } = req.body;

    const quote = await pool.query(
      'SELECT * FROM quotes WHERE id = $1 AND garage_id = $2',
      [id, req.garage_id]
    );
    if (quote.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Quote not found.' });

    if (!['rejected', 'pending'].includes(quote.rows[0].status))
      return res.status(400).json({ success: false, message: 'Can only revise a pending or rejected quote.' });

    // Recalculate totals
    let labour_cost = 0;
    let parts_cost  = 0;

    for (const item of items) {
      item.total_cost = parseFloat(item.quantity || 1) * parseFloat(item.unit_cost);
      if (item.item_type === 'labour') labour_cost += item.total_cost;
      else parts_cost += item.total_cost;
    }

    const total_amount = labour_cost + parts_cost;
    const valid_until  = new Date();
    valid_until.setDate(valid_until.getDate() + 3);

    // Update quote
    await pool.query(
      `UPDATE quotes SET labour_cost = $1, parts_cost = $2, total_amount = $3,
         notes = COALESCE($4, notes), status = 'revised',
         valid_until = $5, updated_at = NOW()
       WHERE id = $6`,
      [labour_cost, parts_cost, total_amount, notes, valid_until, id]
    );

    // Delete old items and insert new ones
    await pool.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);
    for (const item of items) {
      await pool.query(
        `INSERT INTO quote_items (quote_id, item_type, description, quantity, unit_cost, total_cost, part_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, item.item_type, item.description, item.quantity || 1,
         item.unit_cost, item.total_cost, item.part_id || null]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Quote revised and sent back to client for approval.',
    });
  } catch (error) {
    console.error('Revise Quote Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// ─── Get Quote Stats (Staff Dashboard) ───────────────────
const getQuoteStats = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*) AS count,
              COALESCE(SUM(total_amount), 0) AS total_value
       FROM quotes WHERE garage_id = $1 GROUP BY status`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get Quote Stats Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = {
  createQuote, getAllQuotes, getMyQuotes, getQuoteById,
  approveQuote, rejectQuote, requestAlternative,
  reviseQuote, getQuoteStats,
};