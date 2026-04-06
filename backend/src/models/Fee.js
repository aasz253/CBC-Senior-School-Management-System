/**
 * Fee Model - Tracks student fee obligations per term/year
 */
const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true,
  },
  term: {
    type: Number,
    enum: [1, 2, 3],
    required: [true, 'Term is required'],
    index: true,
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    default: 2026,
    min: 2026,
    max: 2030,
    index: true,
  },
  totalDue: {
    type: Number,
    required: [true, 'Total fee amount is required'],
    min: 0,
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0,
  },
  balance: {
    type: Number,
    min: 0,
  },
  // Fee breakdown
  feeStructure: {
    tuition: { type: Number, default: 0 },
    boarding: { type: Number, default: 0 },
    lunch: { type: Number, default: 0 },
    activities: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  // Whether fees are fully paid
  isFullyPaid: {
    type: Boolean,
    default: false,
  },
  grade: {
    type: String,
    enum: ['10', '11', '12'],
  },
  pathway: {
    type: String,
    enum: ['STEM', 'Arts & Sports', 'Social Sciences'],
  },
}, {
  timestamps: true,
});

// Auto-calculate balance before saving
feeSchema.pre('save', function(next) {
  this.balance = Math.max(0, this.totalDue - this.amountPaid);
  this.isFullyPaid = this.balance <= 0;
  next();
});

// Compound indexes
feeSchema.index({ studentId: 1, term: 1, year: 1 }, { unique: true });
feeSchema.index({ grade: 1, term: 1, year: 1 });

module.exports = mongoose.model('Fee', feeSchema);
