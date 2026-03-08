const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getAllInvoices,
  getMyInvoices,
  getInvoiceById,
  recordPayment,
  updateInvoice,
  getBillingSummary,
  deleteInvoice,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── All routes require login ─────────────────────────────
router.use(protect);

// ─── Client Routes ────────────────────────────────────────
router.get('/my-invoices', authorize('client'), getMyInvoices);
router.get('/:id', getInvoiceById);

// ─── Staff Routes ─────────────────────────────────────────
router.post('/', authorize('admin', 'supervisor', 'receptionist'), createInvoice);
router.get('/', authorize('admin', 'supervisor', 'receptionist'), getAllInvoices);
router.get('/summary/billing', authorize('admin', 'supervisor'), getBillingSummary);
router.put('/:id/payment', authorize('admin', 'supervisor', 'receptionist'), recordPayment);
router.put('/:id', authorize('admin', 'supervisor'), updateInvoice);
router.delete('/:id', authorize('admin'), deleteInvoice);

module.exports = router;