/**
 * Attendance Model - Daily attendance tracking per student
 */
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    required: [true, 'Attendance status is required'],
  },
  grade: {
    type: String,
    enum: ['7', '8', '9', '10', '11', '12'],
    required: [true, 'Grade is required'],
    index: true,
  },
  assignedClass: {
    type: String,
  },
  // Optional: subject-specific attendance
  subject: {
    type: String,
    trim: true,
  },
  // Teacher who recorded attendance
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recording teacher is required'],
  },
  // Reason for absence (optional)
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters'],
  },
  // Late arrival time
  lateArrivalTime: {
    type: String, // e.g., "08:30"
  },
}, {
  timestamps: true,
});

// Prevent duplicate attendance entries for same student/date/subject
attendanceSchema.index({ studentId: 1, date: 1, subject: 1 }, { unique: true });
attendanceSchema.index({ date: 1, grade: 1 });
attendanceSchema.index({ grade: 1, assignedClass: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
