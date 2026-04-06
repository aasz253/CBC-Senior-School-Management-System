/**
 * Event Model - School events calendar
 */
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
    index: true,
  },
  endDate: {
    type: Date, // For multi-day events
  },
  location: {
    type: String,
    required: [true, 'Event location is required'],
    trim: true,
  },
  // Public event visible to community
  isPublic: {
    type: Boolean,
    default: false,
    index: true,
  },
  // Event type
  eventType: {
    type: String,
    enum: ['sports', 'academic', 'cultural', 'meeting', 'holiday', 'exam', 'other'],
    default: 'other',
  },
  // Who created the event
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
  },
  // Target audience
  targetGrades: [{
    type: String,
    enum: ['10', '11', '12', 'all'],
  }],
  // Whether notification was sent
  notificationSent: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
eventSchema.index({ date: 1, isPublic: 1 });
eventSchema.index({ eventType: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
