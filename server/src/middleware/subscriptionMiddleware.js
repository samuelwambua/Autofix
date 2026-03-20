const { pool } = require('../config/db');

// ─── Plan Limits ──────────────────────────────────────────
const PLAN_LIMITS = {
  free: {
    staff:     999999,
    clients:   999999,
    jobs:      999999,
    invoices:  999999,
    vehicles:  999999,
    inventory: 999999,
    supervisors: 999999,
  },
  basic: {
    staff:       5,
    clients:     50,
    jobs:        30,   // per month
    invoices:    30,   // per month
    vehicles:    50,
    inventory:   100,
    supervisors: 1,
  },
  premium: {
    staff:       999999,
    clients:     999999,
    jobs:        999999,
    invoices:    999999,
    vehicles:    999999,
    inventory:   999999,
    supervisors: 999999,
  },
};

// ─── Check if Garage is Active & Not Locked ───────────────
const checkSubscription = async (req, res, next) => {
  try {
    // Skip for super admin and public routes
    if (!req.garage_id || req.user?.role === 'super_admin') return next();

    const result = await pool.query(
      `SELECT subscription_plan, trial_ends_at, subscription_ends_at, is_locked, name
       FROM garages WHERE id = $1`,
      [req.garage_id]
    );

    if (result.rows.length === 0) return next();

    const garage = result.rows[0];
    const now    = new Date();

    // Check if garage is manually locked by super admin
    if (garage.is_locked) {
      return res.status(403).json({
        success: false,
        locked: true,
        message: 'Your garage account has been suspended. Please contact support.',
      });
    }

    // Check if still in free trial
    const inTrial = garage.trial_ends_at && new Date(garage.trial_ends_at) > now;

    // Check if paid subscription is active
    const subActive = garage.subscription_ends_at && new Date(garage.subscription_ends_at) > now;

    // If not in trial and no active subscription and not on a paid plan — lock out
    if (!inTrial && !subActive && garage.subscription_plan === 'free') {
      return res.status(403).json({
        success: false,
        locked: true,
        trial_expired: true,
        message: 'Your free trial has expired. Please subscribe to continue using AutoFix.',
        plans: {
          basic:   { price: 3000,  currency: 'KES', interval: 'month' },
          premium: { price: 6500,  currency: 'KES', interval: 'month' },
        },
      });
    }

    // Attach plan info to request for limit checks
    req.garage_plan   = inTrial ? 'free' : garage.subscription_plan;
    req.plan_limits   = PLAN_LIMITS[req.garage_plan] || PLAN_LIMITS.free;
    req.garage_in_trial = inTrial;
    req.trial_ends_at   = garage.trial_ends_at;

    next();
  } catch (error) {
    console.error('Subscription Check Error:', error.message);
    next(); // Don't block on error
  }
};

// ─── Check Resource Limit ─────────────────────────────────
const checkLimit = (resource) => async (req, res, next) => {
  try {
    // Skip for non-POST (only enforce on creation)
    if (req.method !== 'POST') return next();
    if (!req.garage_id || req.user?.role === 'super_admin') return next();

    const limits = req.plan_limits;
    if (!limits) return next();

    const limit = limits[resource];
    if (!limit || limit === 999999) return next();

    let count = 0;
    const gid = req.garage_id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (resource) {
      case 'staff':
        const staffResult = await pool.query(
          'SELECT COUNT(*) FROM users WHERE garage_id = $1', [gid]
        );
        count = parseInt(staffResult.rows[0].count);
        break;

      case 'clients':
        const clientResult = await pool.query(
          'SELECT COUNT(*) FROM clients WHERE garage_id = $1', [gid]
        );
        count = parseInt(clientResult.rows[0].count);
        break;

      case 'vehicles':
        const vehicleResult = await pool.query(
          'SELECT COUNT(*) FROM vehicles WHERE garage_id = $1', [gid]
        );
        count = parseInt(vehicleResult.rows[0].count);
        break;

      case 'jobs':
        const jobResult = await pool.query(
          'SELECT COUNT(*) FROM job_cards WHERE garage_id = $1 AND created_at >= $2',
          [gid, monthStart]
        );
        count = parseInt(jobResult.rows[0].count);
        break;

      case 'invoices':
        const invoiceResult = await pool.query(
          'SELECT COUNT(*) FROM invoices WHERE garage_id = $1 AND created_at >= $2',
          [gid, monthStart]
        );
        count = parseInt(invoiceResult.rows[0].count);
        break;

      case 'inventory':
        const inventoryResult = await pool.query(
          'SELECT COUNT(*) FROM inventory WHERE garage_id = $1', [gid]
        );
        count = parseInt(inventoryResult.rows[0].count);
        break;

      case 'supervisors':
        const supervisorResult = await pool.query(
          "SELECT COUNT(*) FROM users WHERE garage_id = $1 AND role = 'supervisor'", [gid]
        );
        count = parseInt(supervisorResult.rows[0].count);
        break;
    }

    if (count >= limit) {
      const planName = req.garage_plan === 'basic' ? 'Basic' : req.garage_plan;
      return res.status(403).json({
        success: false,
        limit_reached: true,
        resource,
        current: count,
        limit,
        message: `You have reached the ${resource} limit (${limit}) for your ${planName} plan. Upgrade to Premium for unlimited access.`,
        upgrade_to: 'premium',
      });
    }

    next();
  } catch (error) {
    console.error('Check Limit Error:', error.message);
    next();
  }
};

// ─── Get Subscription Status (for frontend) ───────────────
const getSubscriptionStatus = async (garage_id) => {
  try {
    const result = await pool.query(
      `SELECT subscription_plan, trial_ends_at, subscription_ends_at, is_locked
       FROM garages WHERE id = $1`,
      [garage_id]
    );
    if (result.rows.length === 0) return null;

    const g   = result.rows[0];
    const now = new Date();
    const inTrial   = g.trial_ends_at && new Date(g.trial_ends_at) > now;
    const subActive = g.subscription_ends_at && new Date(g.subscription_ends_at) > now;
    const daysLeft  = inTrial
      ? Math.ceil((new Date(g.trial_ends_at) - now) / (1000 * 60 * 60 * 24))
      : null;

    return {
      plan:       g.subscription_plan,
      in_trial:   inTrial,
      sub_active: subActive,
      is_locked:  g.is_locked,
      days_left:  daysLeft,
      trial_ends_at: g.trial_ends_at,
      subscription_ends_at: g.subscription_ends_at,
      limits: PLAN_LIMITS[inTrial ? 'free' : g.subscription_plan] || PLAN_LIMITS.free,
    };
  } catch (error) {
    console.error('Get Subscription Status Error:', error.message);
    return null;
  }
};

module.exports = { checkSubscription, checkLimit, getSubscriptionStatus, PLAN_LIMITS };