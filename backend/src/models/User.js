/**
 * User Model
 * Base user model for all roles: admin, teacher, school_worker, student, community_member
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Authentication fields
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password by default
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/, 'Please provide a valid phone number'],
    index: true,
  },

  // Personal information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'school_worker', 'student', 'community_member'],
    default: 'student',
    index: true,
  },

  // Student-specific fields
  admissionNumber: {
    type: String,
    unique: true,
    sparse: true, // Only indexed when present (non-student users won't have this)
    index: true,
  },
  grade: {
    type: String,
    enum: ['10', '11', '12'],
  },
  pathway: {
    type: String,
    enum: ['STEM', 'Arts & Sports', 'Social Sciences'],
  },
  parentPhone: {
    type: String, // For linking parent to student account
  },
  guardianName: {
    type: String,
  },

  // Teacher-specific fields
  assignedClass: {
    type: String, // e.g., "Grade 10A"
  },
  assignedSubjects: [{
    type: String,
  }],

  // Password reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // Refresh token for JWT rotation
  refreshToken: {
    type: String,
    select: false,
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true,
  },

  // FCM token for push notifications
  fcmToken: {
    type: String,
  },

  // Language preference
  language: {
    type: String,
    enum: ['en', 'sw'],
    default: 'en',
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate password reset token
userSchema.methods.generateResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Compound indexes for performance
userSchema.index({ role: 1, grade: 1 });
userSchema.index({ admissionNumber: 1 }, { unique: true, sparse: true });
userSchema.index({ assignedClass: 1, assignedSubjects: 1 });

module.exports = mongoose.model('User', userSchema);
