const axios   = require('axios');
const { pool } = require('../config/db');

const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_PASSKEY,
  MPESA_SHORTCODE,
  MPESA_ENV,
  MPESA_CALLBACK_URL,
} = process.env;

const BASE_URL = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// ─── Get OAuth Token ──────────────────────────────────────
const getAccessToken = async () => {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  console.log('🔑 Requesting token from:', `${BASE_URL}/oauth/v1/generate`);
  console.log('🔑 Consumer Key (first 10):', MPESA_CONSUMER_KEY?.slice(0, 10));
  console.log('🔑 ENV:', MPESA_ENV);
  try {
    const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    console.log('✅ Token obtained successfully');
    return res.data.access_token;
  } catch (err) {
    console.error('❌ Token Error:', err.response?.status, JSON.stringify(err.response?.data));
    throw err;
  }
};

// ─── Generate Password ────────────────────────────────────
const generatePassword = () => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password  = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
  return { password, timestamp };
};

// ─── STK Push — Subscription Payment ─────────────────────
const stkPushSubscription = async (req, res) => {
  try {
    const { phone, plan, months = 1 } = req.body;
    const garage_id = req.garage_id;

    if (!phone || !plan) {
      return res.status(400).json({ success: false, message: 'Please provide phone number and plan.' });
    }

    const validPlans = ['basic', 'premium'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    const prices = { basic: 3000, premium: 6500 };
    const amount = prices[plan] * parseInt(months);

    // Format phone number — ensure it starts with 254
    let formattedPhone = phone.replace(/\s/g, '').replace(/^0/, '254').replace(/^\+/, '');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = `254${formattedPhone}`;
    }

    const token              = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const stkRes = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            amount,
        PartyA:            formattedPhone,
        PartyB:            MPESA_SHORTCODE,
        PhoneNumber:       formattedPhone,
        CallBackURL:       `${MPESA_CALLBACK_URL}/subscription`,
        AccountReference:  `AutoFix-${plan.toUpperCase()}`,
        TransactionDesc:   `AutoFix ${plan} plan - ${months} month(s)`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription } = stkRes.data;

    if (ResponseCode !== '0') {
      return res.status(400).json({ success: false, message: ResponseDescription });
    }

    // Save pending transaction
    await pool.query(
      `INSERT INTO mpesa_transactions
        (garage_id, phone, amount, merchant_request_id, checkout_request_id,
         subscription_plan, months, transaction_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'subscription', 'pending')`,
      [garage_id, formattedPhone, amount, MerchantRequestID, CheckoutRequestID, plan, months]
    );

    return res.status(200).json({
      success: true,
      message: 'STK Push sent. Please check your phone and enter your M-Pesa PIN.',
      data: {
        checkout_request_id: CheckoutRequestID,
        amount,
        phone: formattedPhone,
        plan,
        months,
      },
    });
  } catch (error) {
    console.error('STK Push Subscription Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.errorMessage || 'Failed to initiate payment. Please try again.',
    });
  }
};


// ─── STK Push — Invoice Payment ───────────────────────────
const stkPushInvoice = async (req, res) => {
  try {
    const { phone, invoice_id } = req.body;
    const garage_id = req.garage_id;

    if (!phone || !invoice_id) {
      return res.status(400).json({ success: false, message: 'Please provide phone and invoice ID.' });
    }

    // Get invoice details
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND garage_id = $2',
      [invoice_id, garage_id]
    );
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const invoice = invoiceResult.rows[0];
    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This invoice is already paid.' });
    }

    const amount = Math.ceil(parseFloat(invoice.total_amount));

    // Format phone
    let formattedPhone = phone.replace(/\s/g, '').replace(/^0/, '254').replace(/^\+/, '');
    if (!formattedPhone.startsWith('254')) formattedPhone = `254${formattedPhone}`;

    const token                   = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const stkRes = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            amount,
        PartyA:            formattedPhone,
        PartyB:            MPESA_SHORTCODE,
        PhoneNumber:       formattedPhone,
        CallBackURL:       `${MPESA_CALLBACK_URL}/invoice`,
        AccountReference:  `INV-${invoice_id.slice(0, 8).toUpperCase()}`,
        TransactionDesc:   `AutoFix Invoice Payment`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription } = stkRes.data;

    if (ResponseCode !== '0') {
      return res.status(400).json({ success: false, message: ResponseDescription });
    }

    // Save pending transaction
    await pool.query(
      `INSERT INTO mpesa_transactions
        (garage_id, invoice_id, phone, amount, merchant_request_id,
         checkout_request_id, transaction_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'invoice', 'pending')`,
      [garage_id, invoice_id, formattedPhone, amount, MerchantRequestID, CheckoutRequestID]
    );

    return res.status(200).json({
      success: true,
      message: 'STK Push sent. Please check your phone and enter your M-Pesa PIN.',
      data: {
        checkout_request_id: CheckoutRequestID,
        amount,
        phone: formattedPhone,
        invoice_id,
      },
    });
  } catch (error) {
    console.error('STK Push Invoice Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.errorMessage || 'Failed to initiate payment. Please try again.',
    });
  }
};


// ─── STK Push Query — Check Payment Status ────────────────
const querySTKStatus = async (req, res) => {
  try {
    const { checkout_request_id } = req.params;

    const token                   = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const queryRes = await axios.post(
      `${BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        CheckoutRequestID: checkout_request_id,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { ResultCode, ResultDesc } = queryRes.data;

    // Get local transaction
    const txResult = await pool.query(
      'SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1',
      [checkout_request_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        result_code: ResultCode,
        result_desc: ResultDesc,
        transaction: txResult.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('STK Query Error:', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Failed to query payment status.' });
  }
};


// ─── Callback — Subscription Payment ─────────────────────
const callbackSubscription = async (req, res) => {
  try {
    const { Body } = req.body;
    const callback = Body?.stkCallback;

    if (!callback) return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    // Find the transaction
    const txResult = await pool.query(
      'SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1',
      [CheckoutRequestID]
    );

    if (txResult.rows.length === 0) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const tx = txResult.rows[0];

    if (ResultCode === 0) {
      // Payment successful — extract receipt number
      const items   = CallbackMetadata?.Item || [];
      const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || null;

      // Update transaction
      await pool.query(
        `UPDATE mpesa_transactions
         SET status = 'completed', result_code = $1, result_desc = $2,
             mpesa_receipt_number = $3, updated_at = NOW()
         WHERE checkout_request_id = $4`,
        [ResultCode, ResultDesc, receipt, CheckoutRequestID]
      );

      // Activate subscription
      const now    = new Date();
      const ends_at = new Date(now);
      ends_at.setMonth(ends_at.getMonth() + (tx.months || 1));

      await pool.query(
        `UPDATE garages
         SET subscription_plan    = $1,
             subscription_ends_at = $2,
             is_locked            = FALSE,
             updated_at           = NOW()
         WHERE id = $3`,
        [tx.subscription_plan, ends_at, tx.garage_id]
      );

      console.log(`✅ Subscription activated: ${tx.subscription_plan} for garage ${tx.garage_id}`);
    } else {
      // Payment failed
      await pool.query(
        `UPDATE mpesa_transactions
         SET status = 'failed', result_code = $1, result_desc = $2, updated_at = NOW()
         WHERE checkout_request_id = $3`,
        [ResultCode, ResultDesc, CheckoutRequestID]
      );
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('M-Pesa Subscription Callback Error:', error.message);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
};


// ─── Callback — Invoice Payment ───────────────────────────
const callbackInvoice = async (req, res) => {
  try {
    const { Body } = req.body;
    const callback = Body?.stkCallback;

    if (!callback) return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    const txResult = await pool.query(
      'SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1',
      [CheckoutRequestID]
    );

    if (txResult.rows.length === 0) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const tx = txResult.rows[0];

    if (ResultCode === 0) {
      const items   = CallbackMetadata?.Item || [];
      const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || null;

      await pool.query(
        `UPDATE mpesa_transactions
         SET status = 'completed', result_code = $1, result_desc = $2,
             mpesa_receipt_number = $3, updated_at = NOW()
         WHERE checkout_request_id = $4`,
        [ResultCode, ResultDesc, receipt, CheckoutRequestID]
      );

      // Mark invoice as paid
      if (tx.invoice_id) {
        await pool.query(
          `UPDATE invoices
           SET status = 'paid', payment_method = 'mpesa',
               paid_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [tx.invoice_id]
        );
      }

      console.log(`✅ Invoice paid via M-Pesa: ${tx.invoice_id}`);
    } else {
      await pool.query(
        `UPDATE mpesa_transactions
         SET status = 'failed', result_code = $1, result_desc = $2, updated_at = NOW()
         WHERE checkout_request_id = $3`,
        [ResultCode, ResultDesc, CheckoutRequestID]
      );
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('M-Pesa Invoice Callback Error:', error.message);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
};


// ─── Get My Transactions ──────────────────────────────────
const getMyTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM mpesa_transactions
       WHERE garage_id = $1
       ORDER BY created_at DESC`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get Transactions Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};


// ─── C2B Register URLs ────────────────────────────────────
const registerC2BURL = async (req, res) => {
  try {
    const token = await getAccessToken();

    const regRes = await axios.post(
      `${BASE_URL}/mpesa/c2b/v1/registerurl`,
      {
        ShortCode:       MPESA_SHORTCODE,
        ResponseType:    'Completed',
        ConfirmationURL: `${MPESA_CALLBACK_URL}/c2b/confirm`,
        ValidationURL:   `${MPESA_CALLBACK_URL}/c2b/validate`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.status(200).json({ success: true, data: regRes.data });
  } catch (error) {
    console.error('C2B Register URL Error:', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Failed to register C2B URLs.' });
  }
};


// ─── C2B Validate ─────────────────────────────────────────
const c2bValidate = async (req, res) => {
  // Always accept
  return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
};


// ─── C2B Confirm ──────────────────────────────────────────
const c2bConfirm = async (req, res) => {
  try {
    const {
      TransID, TransAmount, MSISDN,
      BillRefNumber, BusinessShortCode,
    } = req.body;

    console.log('C2B Payment received:', { TransID, TransAmount, MSISDN, BillRefNumber });

    // Try to match BillRefNumber to a garage or invoice
    // BillRefNumber format: garage email or invoice ID prefix
    await pool.query(
      `INSERT INTO mpesa_transactions
        (phone, amount, mpesa_receipt_number, transaction_type, status)
       VALUES ($1, $2, $3, 'c2b', 'completed')
       ON CONFLICT DO NOTHING`,
      [MSISDN, TransAmount, TransID]
    );

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('C2B Confirm Error:', error.message);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
};

module.exports = {
  stkPushSubscription,
  stkPushInvoice,
  querySTKStatus,
  callbackSubscription,
  callbackInvoice,
  getMyTransactions,
  registerC2BURL,
  c2bValidate,
  c2bConfirm,
};