const { pool } = require('../config/db');

// ─── Get Nearby Garages (Public — no auth needed) ─────────
const getNearbyGarages = async (req, res) => {
  try {
    const { lat, lng, radius = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude.',
      });
    }

    const latitude  = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm  = parseFloat(radius);

    // Use PostGIS ST_DWithin for fast spatial query
    // ST_DWithin uses meters, so multiply km by 1000
    const result = await pool.query(
      `SELECT
         g.id, g.name, g.email, g.phone,
         g.address, g.city, g.country,
         g.latitude, g.longitude,
         g.specializations, g.operating_hours,
         g.status, g.subscription_plan,
         -- Distance in km
         ROUND(
           (ST_Distance(
             g.location::geography,
             ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
           ) / 1000)::numeric, 2
         ) AS distance_km,
         -- Average rating from reviews
         ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
         COUNT(DISTINCT r.id) AS total_reviews,
         COUNT(DISTINCT jc.id) AS total_jobs,
         g.is_verified, g.trust_score,
         -- Most Trusted Score: combines rating(40%) + reviews(20%) + jobs(20%) + trust_score(20%)
         ROUND((
           COALESCE(AVG(r.rating), 0) * 0.4 +
           LEAST(COUNT(DISTINCT r.id) / 10.0, 1) * 2 +
           LEAST(COUNT(DISTINCT jc.id) / 50.0, 1) * 2 +
           COALESCE(g.trust_score, 0) / 100.0 * 2
         )::numeric, 2) AS most_trusted_score
       FROM garages g
       LEFT JOIN job_cards jc ON jc.garage_id = g.id
       LEFT JOIN reviews r ON r.garage_id = g.id
       WHERE g.status = 'active'
         AND g.location IS NOT NULL
         AND ST_DWithin(
           g.location::geography,
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           $3 * 1000
         )
       GROUP BY g.id
       ORDER BY distance_km ASC`,
      [latitude, longitude, radiusKm]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      user_location: { latitude, longitude },
      radius_km: radiusKm,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get Nearby Garages Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get All Active Garages (Public map listing) ──────────
const getAllActiveGarages = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         g.id, g.name, g.email, g.phone,
         g.address, g.city, g.country,
         g.latitude, g.longitude,
         g.specializations, g.operating_hours,
         g.status, g.subscription_plan,
         ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
         COUNT(DISTINCT r.id) AS total_reviews,
         COUNT(DISTINCT jc.id) AS total_jobs,
         g.is_verified, g.trust_score,
         ROUND((
           COALESCE(AVG(r.rating), 0) * 0.4 +
           LEAST(COUNT(DISTINCT r.id) / 10.0, 1) * 2 +
           LEAST(COUNT(DISTINCT jc.id) / 50.0, 1) * 2 +
           COALESCE(g.trust_score, 0) / 100.0 * 2
         )::numeric, 2) AS most_trusted_score
       FROM garages g
       LEFT JOIN reviews r ON r.garage_id = g.id
       LEFT JOIN job_cards jc ON jc.garage_id = g.id
       WHERE g.status = 'active' AND g.location IS NOT NULL
       GROUP BY g.id
       ORDER BY g.name ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get All Active Garages Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Get Public Garage Profile ────────────────────────────
const getGarageProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const garage = await pool.query(
      `SELECT
         g.id, g.name, g.email, g.phone,
         g.address, g.city, g.country,
         g.latitude, g.longitude,
         g.specializations, g.operating_hours,
         g.status, g.subscription_plan,
         ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
         COUNT(DISTINCT r.id) AS total_reviews,
         COUNT(DISTINCT jc.id) AS total_jobs_completed
       FROM garages g
       LEFT JOIN reviews r ON r.garage_id = g.id
       LEFT JOIN job_cards jc ON jc.garage_id = g.id AND jc.status = 'completed'
       WHERE g.id = $1 AND g.status = 'active'
       GROUP BY g.id`,
      [id]
    );

    if (garage.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Garage not found.',
      });
    }

    // Get recent reviews for this garage
    const reviews = await pool.query(
      `SELECT r.rating, r.comment, r.created_at,
              c.first_name || ' ' || c.last_name AS client_name
       FROM reviews r
       JOIN clients c ON r.client_id = c.id
       WHERE r.garage_id = $1
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [id]
    );

    // Rating breakdown
    const ratingBreakdown = await pool.query(
      `SELECT
         COUNT(CASE WHEN rating = 5 THEN 1 END) AS five_star,
         COUNT(CASE WHEN rating = 4 THEN 1 END) AS four_star,
         COUNT(CASE WHEN rating = 3 THEN 1 END) AS three_star,
         COUNT(CASE WHEN rating = 2 THEN 1 END) AS two_star,
         COUNT(CASE WHEN rating = 1 THEN 1 END) AS one_star
       FROM reviews WHERE garage_id = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...garage.rows[0],
        recent_reviews: reviews.rows,
        rating_breakdown: ratingBreakdown.rows[0],
      },
    });
  } catch (error) {
    console.error('Get Garage Profile Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};


// ─── Update Garage Profile (Garage Admin only) ────────────
const updateGarageProfile = async (req, res) => {
  try {
    const garage_id = req.garage_id;
    const {
      name, phone, address, city,
      latitude, longitude,
      specializations, operating_hours,
    } = req.body;

    // Update location geometry if coordinates provided
    let locationUpdate = '';
    const params = [
      name, phone, address, city,
      specializations ? `{${specializations.join(',')}}` : null,
      operating_hours ? JSON.stringify(operating_hours) : null,
      garage_id,
    ];

    if (latitude && longitude) {
      locationUpdate = `, latitude = $8, longitude = $9,
        location = ST_SetSRID(ST_MakePoint($9, $8), 4326)`;
      params.push(parseFloat(latitude), parseFloat(longitude));
    }

    const result = await pool.query(
      `UPDATE garages
       SET name             = COALESCE($1, name),
           phone            = COALESCE($2, phone),
           address          = COALESCE($3, address),
           city             = COALESCE($4, city),
           specializations  = COALESCE($5, specializations),
           operating_hours  = COALESCE($6::jsonb, operating_hours),
           updated_at       = NOW()
           ${locationUpdate}
       WHERE id = $7
       RETURNING id, name, phone, address, city, latitude, longitude,
                 specializations, operating_hours, status`,
      params
    );

    return res.status(200).json({
      success: true,
      message: 'Garage profile updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update Garage Profile Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  getNearbyGarages,
  getAllActiveGarages,
  getGarageProfile,
  updateGarageProfile,
};