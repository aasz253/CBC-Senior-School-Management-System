/**
 * Payment Model - Records individual M-PESA and other payments
 */
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true,
  },
  feeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fee',
  },
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    unique: true,
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'bank', 'cash', 'cheque'],
    default: 'mpesa',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'reversed'],
    default: 'pending',
    index: true,
  },
  // M-PESA specific fields
  mpesaReceiptNumber: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  checkoutRequestId: {
    type: String, // STK Push request ID
  },
  merchantRequestId: {
    type: String,
  },
  // Callback data from M-PESA
  callbackData: {
    type: mongoose.Schema.Types.Mixed,
  },
  // Error information
  errorMessage: {
    type: String,
  },
  term: {
    type: Number,
    enum: [1, 2, 3],
  },
  year: {
    type: Number,
    min: 2026,
    max: 2030,
  },
  // Who recorded this payment (admin for manual entries)
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes for performance
paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ studentId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ checkoutRequestId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
