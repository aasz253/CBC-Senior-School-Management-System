/**
 * Timetable Model - Digital class schedule
 */
const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  grade: {
    type: String,
    enum: ['10', '11', '12'],
    required: [true, 'Grade is required'],
    index: true,
  },
  assignedClass: {
    type: String, // e.g., "Grade 10A"
    required: [true, 'Class is required'],
    index: true,
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    required: [true, 'Day is required'],
  },
  period: {
    type: Number,
    required: [true, 'Period number is required'],
    min: 1,
    max: 30,
  },
  startTime: {
    type: String, // e.g., "08:00"
    required: [true, 'Start time is required'],
  },
  endTime: {
    type: String, // e.g., "08:40"
    required: [true, 'End time is required'],
  },
  subject: {
    type: String,
    trim: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required'],
    index: true,
  },
  room: {
    type: String,
    trim: true,
  },
  // Whether this is a regular or special period
  periodType: {
    type: String,
    enum: ['regular', 'break', 'lunch', 'assembly', 'games'],
    default: 'regular',
  },
}, {
  timestamps: true,
});

// Prevent duplicate entries for same class/day/period
timetableSchema.index({ assignedClass: 1, day: 1, period: 1 }, { unique: true });
timetableSchema.index({ teacherId: 1, day: 1, period: 1 });
timetableSchema.index({ grade: 1, assignedClass: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
