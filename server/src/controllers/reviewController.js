const { pool } = require('../config/db');

// ─── Create Review (Client only) ─────────────────────────
const createReview = async (req, res) => {
  try {
    const { job_id, rating, comment } = req.body;

    // Validate required fields
    if (!job_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Please provide job ID and rating.',
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5.',
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

    // Make sure the job belongs to this client
    if (job.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This job does not belong to you.',
      });
    }

    // Make sure the job is completed before reviewing
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only review a completed job.',
      });
    }

    // Check if client already reviewed this job
    const alreadyReviewed = await pool.query(
      'SELECT id FROM reviews WHERE job_id = $1 AND client_id = $2',
      [job_id, req.user.id]
    );
    if (alreadyReviewed.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this job.',
      });
    }

    const result = await pool.query(
      `INSERT INTO reviews (job_id, client_id, mechanic_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [job_id, req.user.id, job.mechanic_id || null, rating, comment || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Thank you for your feedback!',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create Review Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get All Reviews (Staff only) ────────────────────────
const getAllReviews = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              c.first_name || ' ' || c.last_name AS client_name,
              u.first_name || ' ' || u.last_name AS mechanic_name,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number
       FROM reviews r
       JOIN clients c ON r.client_id = c.id
       JOIN job_cards jc ON r.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       LEFT JOIN users u ON r.mechanic_id = u.id
       ORDER BY r.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Reviews Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get My Reviews (Client viewing their own reviews) ────
const getMyReviews = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              u.first_name || ' ' || u.last_name AS mechanic_name,
              v.make || ' ' || v.model AS vehicle_name,
              v.plate_number,
              jc.description AS job_description
       FROM reviews r
       JOIN job_cards jc ON r.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       LEFT JOIN users u ON r.mechanic_id = u.id
       WHERE r.client_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get My Reviews Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Reviews for a Mechanic ───────────────────────────
const getMechanicReviews = async (req, res) => {
  try {
    const { mechanicId } = req.params;

    // Check mechanic exists
    const mechanicExists = await pool.query(
      'SELECT id, first_name, last_name, specialization FROM users WHERE id = $1 AND role = $2',
      [mechanicId, 'mechanic']
    );
    if (mechanicExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic not found.',
      });
    }

    const result = await pool.query(
      `SELECT r.*,
              c.first_name || ' ' || c.last_name AS client_name,
              v.make || ' ' || v.model AS vehicle_name,
              jc.description AS job_description
       FROM reviews r
       JOIN clients c ON r.client_id = c.id
       JOIN job_cards jc ON r.job_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE r.mechanic_id = $1
       ORDER BY r.created_at DESC`,
      [mechanicId]
    );

    // Calculate average rating
    const avgResult = await pool.query(
      'SELECT ROUND(AVG(rating)::numeric, 1) AS average_rating FROM reviews WHERE mechanic_id = $1',
      [mechanicId]
    );

    return res.status(200).json({
      success: true,
      mechanic: mechanicExists.rows[0],
      average_rating: avgResult.rows[0].average_rating || 0,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get Mechanic Reviews Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Single Review by ID ──────────────────────────────
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

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
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get Review By ID Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Update Review (Client only, own review) ─────────────
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Check if review exists and belongs to this client
    const reviewExists = await pool.query(
      'SELECT * FROM reviews WHERE id = $1',
      [id]
    );
    if (reviewExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    if (reviewExists.rows[0].client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own reviews.',
      });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5.',
      });
    }

    const result = await pool.query(
      `UPDATE reviews
       SET rating  = COALESCE($1, rating),
           comment = COALESCE($2, comment)
       WHERE id = $3
       RETURNING *`,
      [rating, comment, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Review Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Delete Review (Admin or review owner) ────────────────
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if review exists
    const reviewExists = await pool.query(
      'SELECT * FROM reviews WHERE id = $1',
      [id]
    );
    if (reviewExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    // Client can only delete their own review
    if (
      req.user.role === 'client' &&
      reviewExists.rows[0].client_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own reviews.',
      });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Review Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Overall Garage Rating Summary ───────────────────
const getGarageRatingSummary = async (req, res) => {
  try {
    const summary = await pool.query(
      `SELECT
        COUNT(*) AS total_reviews,
        ROUND(AVG(rating)::numeric, 1) AS average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) AS five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) AS four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) AS three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) AS two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) AS one_star
       FROM reviews`
    );

    return res.status(200).json({
      success: true,
      data: summary.rows[0],
    });
  } catch (error) {
    console.error('Get Garage Rating Summary Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  createReview,
  getAllReviews,
  getMyReviews,
  getMechanicReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getGarageRatingSummary,
};