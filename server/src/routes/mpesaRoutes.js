const express = require('express');
const router  = express.Router();
const {
  stkPushSubscription,
  stkPushInvoice,
  querySTKStatus,
  callbackSubscription,
  callbackInvoice,
  getMyTransactions,
  registerC2BURL,
  c2bValidate,
  c2bConfirm,
} = require('../controllers/mpesaController');
const { protect, authorize, garageScope } = require('../middleware/authMiddleware');

// ─── Public Callback Routes (called by Safaricom) ─────────
router.post('/callback/subscription', callbackSubscription);
router.post('/callback/invoice',      callbackInvoice);
router.post('/callback/c2b/validate', c2bValidate);
router.post('/callback/c2b/confirm',  c2bConfirm);

// ─── Protected Routes (Garage Staff) ─────────────────────
router.use(protect, garageScope);

router.post('/stk/subscription',             authorize('admin'), stkPushSubscription);
router.post('/stk/invoice',                  authorize('admin', 'receptionist'), stkPushInvoice);
router.get('/status/:checkout_request_id',   authorize('admin', 'receptionist'), querySTKStatus);
router.get('/transactions',                  authorize('admin'), getMyTransactions);
router.post('/c2b/register',                 authorize('admin'), registerC2BURL);

module.exports = router;