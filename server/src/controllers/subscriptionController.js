const { pool } = require('../config/db');
const { getSubscriptionStatus, PLAN_LIMITS } = require('../middleware/subscriptionMiddleware');

// ─── Get My Subscription Status ───────────────────────────
const getMySubscription = async (req, res) => {
  try {
    const status = await getSubscriptionStatus(req.garage_id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Garage not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...status,
        plans: {
          basic:   { price: 3000, currency: 'KES', interval: 'month', limits: PLAN_LIMITS.basic },
          premium: { price: 6500, currency: 'KES', interval: 'month', limits: PLAN_LIMITS.premium },
        },
      },
    });
  } catch (error) {
    console.error('Get My Subscription Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Super Admin: Activate Subscription ───────────────────
const activateSubscription = async (req, res) => {
  try {
    const { garageId } = req.params;
    const { plan, months = 1 } = req.body;

    const validPlans = ['basic', 'premium'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    const now     = new Date();
    const ends_at = new Date(now);
    ends_at.setMonth(ends_at.getMonth() + parseInt(months));

    await pool.query(
      `UPDATE garages
       SET subscription_plan     = $1,
           subscription_ends_at  = $2,
           is_locked             = FALSE,
           updated_at            = NOW()
       WHERE id = $3`,
      [plan, ends_at, garageId]
    );

    return res.status(200).json({
      success: true,
      message: `${plan} plan activated for ${months} month(s).`,
      subscription_ends_at: ends_at,
    });
  } catch (error) {
    console.error('Activate Subscription Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Super Admin: Get All Subscriptions Overview ──────────
const getSubscriptionsOverview = async (req, res) => {
  try {
    const now = new Date();

    const result = await pool.query(
      `SELECT
         g.id, g.name, g.city, g.email,
         g.subscription_plan, g.trial_ends_at,
         g.subscription_ends_at, g.is_locked,
         CASE
           WHEN g.is_locked THEN 'locked'
           WHEN g.trial_ends_at > $1 THEN 'trial'
           WHEN g.subscription_ends_at > $1 THEN 'active'
           WHEN g.subscription_plan != 'free' AND (g.subscription_ends_at IS NULL OR g.subscription_ends_at <= $1) THEN 'expired'
           WHEN g.subscription_plan = 'free' AND (g.trial_ends_at IS NULL OR g.trial_ends_at <= $1) THEN 'expired'
           ELSE 'active'
         END AS subscription_status,
         CASE WHEN g.trial_ends_at > $1
           THEN CEIL(EXTRACT(EPOCH FROM (g.trial_ends_at - $1)) / 86400)
           ELSE 0
         END AS trial_days_left,
         CASE WHEN g.subscription_ends_at > $1
           THEN CEIL(EXTRACT(EPOCH FROM (g.subscription_ends_at - $1)) / 86400)
           ELSE 0
         END AS sub_days_left
       FROM garages g
       ORDER BY g.created_at DESC`,
      [now]
    );

    // Summary counts
    const summary = result.rows.reduce((acc, g) => {
      acc[g.subscription_status] = (acc[g.subscription_status] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      summary,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get Subscriptions Overview Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getMySubscription, activateSubscription, getSubscriptionsOverview };