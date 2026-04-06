const express = require('express');
const router = express.Router();
const {
  initiateStkPush,
  mpesaCallback,
  mpesaValidation,
  queryStkPush,
  getPayments,
  recordManualPayment,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// Public routes (called by Safaricom)
router.post('/mpesa/callback', mpesaCallback);
router.post('/mpesa/validation', mpesaValidation);

// Protected routes
router.use(protect);

router.get('/', getPayments);
router.post('/mpesa/stkpush', initiateStkPush);
router.get('/mpesa/query/:checkoutRequestId', queryStkPush);
router.post('/manual', authorize('admin'), recordManualPayment);

module.exports = router;
