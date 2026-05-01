/**
 * Mark Model - CBC Competency-Based Assessment
 * Stores marks with competency levels for Kenyan CBC system
 */
const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  pathway: {
    type: String,
    enum: ['STEM', 'Arts & Sports', 'Social Sciences'],
    required: [true, 'Pathway is required'],
  },
  grade: {
    type: String,
    enum: ['10', '11', '12'],
    required: [true, 'Grade is required'],
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
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: 0,
    max: 100,
  },
  competencyLevel: {
    type: String,
    enum: ['B', 'A', 'M', 'E'], // Beginning, Approaching, Meeting, Exceeding
  },
  competencyLabel: {
    type: String,
    enum: ['Beginning', 'Approaching', 'Meeting', 'Exceeding'],
  },
  teacherRemark: {
    type: String,
    trim: true,
    maxlength: [500, 'Remark cannot exceed 500 characters'],
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher ID is required'],
  },
  // Assessment type (CAT, End of Term, Project, etc.)
  assessmentType: {
    type: String,
    enum: ['CAT 1', 'CAT 2', 'End of Term', 'Project', 'Assignment', 'Practical'],
    default: 'End of Term',
  },
  // Whether the mark has been approved by admin
  isApproved: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Auto-set competency level based on score
markSchema.pre('save', function(next) {
  if (this.isModified('score') || this.isNew) {
    if (this.score >= 80) {
      this.competencyLevel = 'E';
      this.competencyLabel = 'Exceeding';
    } else if (this.score >= 65) {
      this.competencyLevel = 'M';
      this.competencyLabel = 'Meeting';
    } else if (this.score >= 50) {
      this.competencyLevel = 'A';
      this.competencyLabel = 'Approaching';
    } else {
      this.competencyLevel = 'B';
      this.competencyLabel = 'Beginning';
    }
  }
  next();
});

// Compound indexes for efficient queries
markSchema.index({ studentId: 1, term: 1, year: 1 });
markSchema.index({ studentId: 1, subject: 1, term: 1, year: 1 });
markSchema.index({ grade: 1, term: 1, year: 1, subject: 1 });
markSchema.index({ teacherId: 1, term: 1, year: 1 });

module.exports = mongoose.model('Mark', markSchema);
