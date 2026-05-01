/**
 * Assignment Model - Teacher-created assignments with file attachments
 */
const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
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
  pathway: {
    type: String,
    enum: ['STEM', 'Arts & Sports', 'Social Sciences'],
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  // File attachments (PDF, images, video for Arts)
  attachments: [{
    filename: String,
    originalName: String,
    filePath: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now },
  }],
  // Maximum points/grade
  maxScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  // Whether submissions are still accepted
  isClosed: {
    type: Boolean,
    default: false,
  },
  // Notification sent for due date reminder
  reminderSent: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
assignmentSchema.index({ teacherId: 1, grade: 1, subject: 1 });
assignmentSchema.index({ grade: 1, subject: 1, dueDate: 1 });
assignmentSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
