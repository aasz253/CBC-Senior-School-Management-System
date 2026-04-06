/**
 * Payment Controller - M-PESA Integration
 * STK Push, callbacks, validation, and payment tracking
 */
const axios = require('axios');
const Payment = require('../models/Payment');
const Fee = require('../models/Fee');
const User = require('../models/User');

/**
 * Generate M-PESA OAuth token
 */
const getMpesaToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      headers: { Authorization: `Basic ${auth}` },
    }
  );

  return response.data.access_token;
};

/**
 * Generate password for STK Push
 * Format: Shortcode + Passkey + Timestamp
 */
const generatePassword = () => {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = getTimestamp();
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
};

/**
 * Generate timestamp in format YYYYMMDDHHmmss
 */
const getTimestamp = () => {
  const date = new Date();
  return date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0') +
    date.getHours().toString().padStart(2, '0') +
    date.getMinutes().toString().padStart(2, '0') +
    date.getSeconds().toString().padStart(2, '0');
};

/**
 * @desc    Initiate STK Push (Lipa Na M-PESA Online)
 * @route   POST /api/payments/mpesa/stkpush
 * @access  Private
 */
exports.initiateStkPush = async (req, res, next) => {
  try {
    const { studentId, amount, phoneNumber } = req.body;

    // Validate amount
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required (minimum KES 1)',
      });
    }

    // Verify student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    // Students can only pay for their own fees
    if (req.user.role === 'student' && studentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only pay for your own fees',
      });
    }

    // Format phone number to 2547XXXXXXXX
    let formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Get M-PESA access token
    const accessToken = await getMpesaToken();
    const password = generatePassword();
    const timestamp = getTimestamp();

    const baseUrl = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    const callbackUrl = `${process.env.MPESA_CALLBACK_URL || req.protocol + '://' + req.get('host')}/api/payments/mpesa/callback`;

    // STK Push request body
    const stkPushBody = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: student.admissionNumber || studentId.toString(),
      TransactionDesc: `School fees payment for ${student.name}`,
    };

    // Send STK Push request
    const response = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      stkPushBody,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription } = response.data;

    // Create pending payment record
    const payment = await Payment.create({
      studentId,
      amount: Math.round(amount),
      paymentMethod: 'mpesa',
      status: 'pending',
      checkoutRequestId: CheckoutRequestID,
      merchantRequestId: MerchantRequestID,
      phoneNumber: formattedPhone,
      term: req.body.term,
      year: req.body.year,
      recordedBy: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: ResponseDescription,
      checkoutRequestId: CheckoutRequestID,
      paymentId: payment._id,
      responseCode,
    });
  } catch (error) {
    console.error('STK Push Error:', error.response?.data || error.message);

    if (error.response?.data) {
      return res.status(400).json({
        success: false,
        message: error.response.data.errorMessage || 'M-PESA request failed',
        errorCode: error.response.data.errorCode,
      });
    }

    next(error);
  }
};

/**
 * @desc    M-PESA Callback URL (called by Safaricom)
 * @route   POST /api/payments/mpesa/callback
 * @access  Public (called by Safaricom)
 */
exports.mpesaCallback = async (req, res, next) => {
  try {
    const callbackData = req.body;

    // Log the callback for debugging
    console.log('M-PESA Callback received:', JSON.stringify(callbackData, null, 2));

    // Handle the callback structure
    const body = callbackData.Body;
    if (!body) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    const stkCallback = body.stkCallback;
    if (!stkCallback) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // Find the payment record
    const payment = await Payment.findOne({ checkoutRequestId });

    if (!payment) {
      console.error('Payment not found for checkoutRequestId:', checkoutRequestId);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    // Handle different result codes
    if (resultCode !== 0) {
      // Payment failed/cancelled
      payment.status = resultCode === 1032 ? 'cancelled' : 'failed';
      payment.errorMessage = resultDesc;
      payment.callbackData = callbackData;
      await payment.save();

      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    // Payment successful - extract callback metadata
    const callbackMetadata = body.stkCallback.CallbackMetadata;
    let transactionId, mpesaReceiptNumber, transactionAmount, phoneNumber;

    if (callbackMetadata && callbackMetadata.Item) {
      callbackMetadata.Item.forEach(item => {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'Amount':
            transactionAmount = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value;
            break;
        }
      });
    }

    // Use CheckoutRequestID as transaction ID if not provided
    transactionId = mpesaReceiptNumber || checkoutRequestId;

    // Check for duplicate transaction (idempotency)
    const existingPayment = await Payment.findOne({
      transactionId,
      status: 'completed',
    });

    if (existingPayment) {
      console.log('Duplicate payment detected:', transactionId);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    // Update payment record
    payment.status = 'completed';
    payment.transactionId = transactionId;
    payment.mpesaReceiptNumber = mpesaReceiptNumber;
    payment.amount = transactionAmount || payment.amount;
    payment.phoneNumber = phoneNumber || payment.phoneNumber;
    payment.callbackData = callbackData;
    await payment.save();

    // Update the student's fee balance
    await updateFeeBalance(payment.studentId, payment.amount, payment.term, payment.year);

    console.log(`Payment completed: ${transactionId}, Amount: ${payment.amount}`);

    // TODO: Send push notification to student/parent

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('Callback processing error:', error);
    // Always return 200 to Safaricom to prevent retries
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  }
};

/**
 * @desc    M-PESA Validation URL (called by Safaricom before callback)
 * @route   POST /api/payments/mpesa/validation
 * @access  Public (called by Safaricom)
 */
exports.mpesaValidation = async (req, res, next) => {
  try {
    const validationData = req.body;
    console.log('M-PESA Validation:', JSON.stringify(validationData, null, 2));

    // Accept the transaction (return ResultCode: 0)
    // Add custom validation logic here if needed
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  }
};

/**
 * @desc    Query STK Push transaction status
 * @route   GET /api/payments/mpesa/query/:checkoutRequestId
 * @access  Private
 */
exports.queryStkPush = async (req, res, next) => {
  try {
    const { checkoutRequestId } = req.params;

    const accessToken = await getMpesaToken();
    const baseUrl = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    const response = await axios.post(
      `${baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: generatePassword(),
        Timestamp: getTimestamp(),
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all payments (admin) or own payments (student)
 * @route   GET /api/payments
 * @access  Private
 */
exports.getPayments = async (req, res, next) => {
  try {
    const { studentId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      query.studentId = req.user.id;
    } else if (studentId) {
      query.studentId = studentId;
    }

    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('studentId', 'name admissionNumber grade pathway')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: payments.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: page,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record manual payment (admin only - for cash/bank/cheque)
 * @route   POST /api/payments/manual
 * @access  Private/Admin
 */
exports.recordManualPayment = async (req, res, next) => {
  try {
    const { studentId, amount, paymentMethod, transactionId, term, year } = req.body;

    // Verify student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    // Check for duplicate transaction ID
    if (transactionId) {
      const existing = await Payment.findOne({ transactionId });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID already exists',
        });
      }
    }

    const payment = await Payment.create({
      studentId,
      amount,
      paymentMethod: paymentMethod || 'cash',
      transactionId: transactionId || `MANUAL-${Date.now()}`,
      status: 'completed',
      term,
      year,
      recordedBy: req.user.id,
    });

    // Update fee balance
    await updateFeeBalance(studentId, amount, term, year);

    const populatedPayment = await Payment.findById(payment._id)
      .populate('studentId', 'name admissionNumber grade pathway')
      .populate('recordedBy', 'name');

    res.status(201).json({
      success: true,
      payment: populatedPayment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Update student's fee balance after payment
 */
async function updateFeeBalance(studentId, amount, term, year) {
  // Find the fee record for this student/term/year
  const feeQuery = { studentId };
  if (term) feeQuery.term = term;
  if (year) feeQuery.year = year;

  // If no term/year specified, find the oldest unpaid fee
  let fee = await Fee.findOne(feeQuery).sort({ year: 1, term: 1 });

  if (!fee) {
    // Create a new fee record if none exists
    fee = await Fee.create({
      studentId,
      term: term || 1,
      year: year || new Date().getFullYear(),
      totalDue: 0, // Will be updated by admin
      amountPaid: amount,
    });
  }

  // Update amount paid
  fee.amountPaid = (fee.amountPaid || 0) + amount;
  await fee.save();
}
