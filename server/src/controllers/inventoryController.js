const { pool } = require('../config/db');

// ─── Add New Part to Inventory ────────────────────────────
const addPart = async (req, res) => {
  try {
    const {
      name,
      sku,
      quantity,
      unit_cost,
      reorder_threshold,
      supplier_name,
      supplier_contact,
    } = req.body;

    // Validate required fields
    if (!name || !sku || !unit_cost) {
      return res.status(400).json({
        success: false,
        message: 'Please provide part name, SKU and unit cost.',
      });
    }

    // Check if SKU already exists
    const skuExists = await pool.query(
      'SELECT id FROM inventory WHERE sku = $1',
      [sku.toUpperCase()]
    );
    if (skuExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A part with this SKU already exists.',
      });
    }

    const result = await pool.query(
      `INSERT INTO inventory
        (name, sku, quantity, unit_cost, reorder_threshold, supplier_name, supplier_contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        sku.toUpperCase(),
        quantity || 0,
        unit_cost,
        reorder_threshold || 5,
        supplier_name || null,
        supplier_contact || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Part added to inventory successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Add Part Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get All Parts ────────────────────────────────────────
const getAllParts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM inventory
       ORDER BY name ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Parts Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Low Stock Parts ──────────────────────────────────
const getLowStockParts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM inventory
       WHERE quantity <= reorder_threshold
       ORDER BY quantity ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      message: result.rows.length > 0
        ? `${result.rows.length} part(s) are running low on stock.`
        : 'All parts are sufficiently stocked.',
      data: result.rows,
    });
  } catch (error) {
    console.error('Get Low Stock Parts Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Single Part by ID ────────────────────────────────
const getPartById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM inventory WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Part not found.',
      });
    }

    // Get usage history for this part
    const usageHistory = await pool.query(
      `SELECT jp.*,
              jc.description AS job_description,
              jc.created_at AS job_date,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number
       FROM job_parts jp
       JOIN job_cards jc ON jp.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE jp.part_id = $1
       ORDER BY jp.created_at DESC
       LIMIT 10`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        usage_history: usageHistory.rows,
      },
    });
  } catch (error) {
    console.error('Get Part By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Update Part ──────────────────────────────────────────
const updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      sku,
      unit_cost,
      reorder_threshold,
      supplier_name,
      supplier_contact,
    } = req.body;

    // Check if part exists
    const partExists = await pool.query(
      'SELECT id FROM inventory WHERE id = $1',
      [id]
    );
    if (partExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Part not found.',
      });
    }

    // Check if new SKU is taken by another part
    if (sku) {
      const skuExists = await pool.query(
        'SELECT id FROM inventory WHERE sku = $1 AND id != $2',
        [sku.toUpperCase(), id]
      );
      if (skuExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A part with this SKU already exists.',
        });
      }
    }

    const result = await pool.query(
      `UPDATE inventory
       SET name               = COALESCE($1, name),
           sku                = COALESCE($2, sku),
           unit_cost          = COALESCE($3, unit_cost),
           reorder_threshold  = COALESCE($4, reorder_threshold),
           supplier_name      = COALESCE($5, supplier_name),
           supplier_contact   = COALESCE($6, supplier_contact),
           updated_at         = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        name,
        sku ? sku.toUpperCase() : null,
        unit_cost,
        reorder_threshold,
        supplier_name,
        supplier_contact,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Part updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Part Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Restock Part (Add stock) ─────────────────────────────
const restockPart = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid quantity to restock.',
      });
    }

    const partExists = await pool.query(
      'SELECT * FROM inventory WHERE id = $1',
      [id]
    );
    if (partExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Part not found.',
      });
    }

    const result = await pool.query(
      `UPDATE inventory
       SET quantity = quantity + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [quantity, id]
    );

    return res.status(200).json({
      success: true,
      message: `Successfully restocked ${quantity} unit(s) of "${result.rows[0].name}". New quantity: ${result.rows[0].quantity}.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Restock Part Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Delete Part (Admin only) ─────────────────────────────
const deletePart = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if part is used in any job
    const partInUse = await pool.query(
      'SELECT id FROM job_parts WHERE part_id = $1 LIMIT 1',
      [id]
    );
    if (partInUse.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete this part as it has been used in job cards. Consider updating the stock to 0 instead.',
      });
    }

    const result = await pool.query(
      'DELETE FROM inventory WHERE id = $1 RETURNING name, sku',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Part not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Part "${result.rows[0].name}" (${result.rows[0].sku}) deleted successfully.`,
    });
  } catch (error) {
    console.error('Delete Part Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Inventory Summary ────────────────────────────────
const getInventorySummary = async (req, res) => {
  try {
    const summary = await pool.query(
      `SELECT
        COUNT(*) AS total_parts,
        SUM(quantity) AS total_units,
        SUM(quantity * unit_cost) AS total_stock_value,
        COUNT(CASE WHEN quantity <= reorder_threshold THEN 1 END) AS low_stock_count,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) AS out_of_stock_count
       FROM inventory`
    );

    return res.status(200).json({
      success: true,
      data: summary.rows[0],
    });
  } catch (error) {
    console.error('Get Inventory Summary Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  addPart,
  getAllParts,
  getLowStockParts,
  getPartById,
  updatePart,
  restockPart,
  deletePart,
  getInventorySummary,
};