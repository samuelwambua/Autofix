const { pool } = require('../config/db');
const crypto = require('crypto');

const POINTS_PER_100_KES = 1;
const REFERRAL_BONUS     = 500;

// ─── Get My Loyalty Points ────────────────────────────────
const getMyLoyalty = async (req, res) => {
  try {
    const clientId = req.user.id;

    // Total points balance
    const balance = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN transaction_type IN ('earned','bonus','referral') THEN points ELSE 0 END), 0) AS total_earned,
         COALESCE(SUM(CASE WHEN transaction_type = 'redeemed' THEN points ELSE 0 END), 0) AS total_redeemed
       FROM loyalty_points WHERE client_id = $1`,
      [clientId]
    );

    const earned   = parseInt(balance.rows[0].total_earned);
    const redeemed = parseInt(balance.rows[0].total_redeemed);
    const current  = earned - redeemed;

    // Transaction history
    const history = await pool.query(
      `SELECT lp.*, g.name AS garage_name
       FROM loyalty_points lp
       LEFT JOIN garages g ON lp.garage_id = g.id
       WHERE lp.client_id = $1
       ORDER BY lp.created_at DESC LIMIT 20`,
      [clientId]
    );

    // Get or create referral code
    let referral = await pool.query(
      'SELECT * FROM referrals WHERE referrer_id = $1', [clientId]
    );
    if (referral.rows.length === 0) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      referral = await pool.query(
        `INSERT INTO referrals (referrer_id, referral_code)
         VALUES ($1, $2) RETURNING *`,
        [clientId, code]
      );
    }

    // Referral stats
    const referralStats = await pool.query(
      `SELECT COUNT(*) AS total_referrals,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_referrals
       FROM referrals WHERE referrer_id = $1`,
      [clientId]
    );

    return res.status(200).json({
      success: true,
      data: {
        current_points:  current,
        total_earned:    earned,
        total_redeemed:  redeemed,
        kes_value:       Math.floor(current / 10), // 10 points = KES 1
        referral_code:   referral.rows[0]?.referral_code,
        referral_stats:  referralStats.rows[0],
        history:         history.rows,
        tiers: {
          current: current >= 5000 ? 'Gold' : current >= 1000 ? 'Silver' : 'Bronze',
          next:    current >= 5000 ? null   : current >= 1000 ? { name: 'Gold', points_needed: 5000 - current } : { name: 'Silver', points_needed: 1000 - current },
        },
      },
    });
  } catch (error) {
    console.error('Get My Loyalty Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Award Points (called after invoice paid) ─────────────
const awardPoints = async (req, res) => {
  try {
    const { client_id, amount, description } = req.body;
    const garage_id   = req.garage_id;
    const reference_id = req.body.reference_id || null;

    const points = Math.floor(parseFloat(amount) / 100) * POINTS_PER_100_KES;
    if (points <= 0)
      return res.status(400).json({ success: false, message: 'Amount too low to earn points.' });

    const result = await pool.query(
      `INSERT INTO loyalty_points (client_id, garage_id, points, transaction_type, description, reference_id)
       VALUES ($1, $2, $3, 'earned', $4, $5) RETURNING *`,
      [client_id, garage_id, points,
       description || `Earned ${points} points for KES ${amount} service`,
       reference_id]
    );

    return res.status(201).json({
      success: true,
      message: `${points} points awarded!`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Award Points Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Redeem Points ────────────────────────────────────────
const redeemPoints = async (req, res) => {
  try {
    const { points, description } = req.body;
    const clientId = req.user.id;

    if (!points || points <= 0)
      return res.status(400).json({ success: false, message: 'Invalid points amount.' });

    // Get client garage_id
    const clientData = await pool.query('SELECT garage_id FROM clients WHERE id = $1', [clientId]);
    const garage_id  = clientData.rows[0]?.garage_id || null;

    // Check balance
    const balance = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN transaction_type IN ('earned','bonus','referral') THEN points ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN transaction_type = 'redeemed' THEN points ELSE 0 END), 0) AS current_points
       FROM loyalty_points WHERE client_id = $1`,
      [clientId]
    );

    const current = parseInt(balance.rows[0].current_points);
    if (points > current)
      return res.status(400).json({
        success: false,
        message: `Insufficient points. You have ${current} points.`,
      });

    const kes_discount = Math.floor(points / 10);

    await pool.query(
      `INSERT INTO loyalty_points (client_id, garage_id, points, transaction_type, description)
       VALUES ($1, $2, $3, 'redeemed', $4)`,
      [clientId, garage_id, points,
       description || `Redeemed ${points} points for KES ${kes_discount} discount`]
    );

    return res.status(200).json({
      success: true,
      message: `${points} points redeemed for KES ${kes_discount} discount!`,
      data: { points_redeemed: points, kes_discount, remaining: current - points },
    });
  } catch (error) {
    console.error('Redeem Points Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Apply Referral Code ──────────────────────────────────
const applyReferralCode = async (req, res) => {
  try {
    const { code } = req.body;
    const clientId = req.user.id;

    const referral = await pool.query(
      'SELECT * FROM referrals WHERE referral_code = $1', [code.toUpperCase()]
    );
    if (referral.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Invalid referral code.' });

    if (referral.rows[0].referrer_id === clientId)
      return res.status(400).json({ success: false, message: 'You cannot use your own referral code.' });

    if (referral.rows[0].referred_id)
      return res.status(400).json({ success: false, message: 'This referral code has already been used.' });

    // Update referral
    await pool.query(
      `UPDATE referrals SET referred_id = $1, status = 'completed' WHERE referral_code = $2`,
      [clientId, code.toUpperCase()]
    );

    // Award bonus to referrer
    const referrer = await pool.query('SELECT garage_id FROM clients WHERE id = $1', [referral.rows[0].referrer_id]);
    const garage_id = referrer.rows[0]?.garage_id || null;

    await pool.query(
      `INSERT INTO loyalty_points (client_id, garage_id, points, transaction_type, description)
       VALUES ($1, $2, $3, 'referral', $4)`,
      [referral.rows[0].referrer_id, garage_id, REFERRAL_BONUS,
       `Referral bonus — friend joined AutoFix!`]
    );

    // Award bonus to new user too
    await pool.query(
      `INSERT INTO loyalty_points (client_id, garage_id, points, transaction_type, description)
       VALUES ($1, $2, $3, 'bonus', $4)`,
      [clientId, garage_id, 100, 'Welcome bonus — joined via referral!']
    );

    return res.status(200).json({
      success: true,
      message: `Referral applied! You earned 100 welcome points. Your friend earned ${REFERRAL_BONUS} points!`,
    });
  } catch (error) {
    console.error('Apply Referral Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get Loyalty Overview (Staff) ────────────────────────
const getLoyaltyOverview = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         c.id, c.first_name || ' ' || c.last_name AS client_name, c.phone,
         COALESCE(SUM(CASE WHEN lp.transaction_type IN ('earned','bonus','referral') THEN lp.points ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN lp.transaction_type = 'redeemed' THEN lp.points ELSE 0 END), 0) AS current_points,
         COALESCE(SUM(CASE WHEN lp.transaction_type IN ('earned','bonus','referral') THEN lp.points ELSE 0 END), 0) AS total_earned
       FROM clients c
       LEFT JOIN loyalty_points lp ON lp.client_id = c.id AND lp.garage_id = $1
       WHERE c.garage_id = $1
       GROUP BY c.id, c.first_name, c.last_name, c.phone
       ORDER BY current_points DESC`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get Loyalty Overview Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getMyLoyalty, awardPoints, redeemPoints,
  applyReferralCode, getLoyaltyOverview,
};