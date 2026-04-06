/**
 * Submission Model - Student assignment submissions with grading
 */
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment ID is required'],
    index: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true,
  },
  // Submitted files
  files: [{
    filename: String,
    originalName: String,
    filePath: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now },
  }],
  // Text submission (optional)
  textContent: {
    type: String,
    trim: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  // Whether submitted after deadline
  isLate: {
    type: Boolean,
    default: false,
  },
  // Grading
  grade: {
    type: Number,
    min: 0,
  },
  competencyLevel: {
    type: String,
    enum: ['B', 'A', 'M', 'E'],
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters'],
  },
  // Whether graded by teacher
  isGraded: {
    type: Boolean,
    default: false,
  },
  gradedAt: Date,
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Auto-detect late submission
submissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Assignment = mongoose.model('Assignment');
    const assignment = await Assignment.findById(this.assignmentId);
    if (assignment && this.submittedAt > assignment.dueDate) {
      this.isLate = true;
    }
  }
  next();
});

// Auto-set competency level when graded
submissionSchema.pre('save', function(next) {
  if (this.isModified('grade') && this.grade !== undefined && this.grade !== null) {
    const assignment = this.$parent();
    const maxScore = assignment.maxScore || 100;
    const percentage = (this.grade / maxScore) * 100;

    if (percentage >= 80) {
      this.competencyLevel = 'E';
    } else if (percentage >= 65) {
      this.competencyLevel = 'M';
    } else if (percentage >= 50) {
      this.competencyLevel = 'A';
    } else {
      this.competencyLevel = 'B';
    }
    this.isGraded = true;
    this.gradedAt = new Date();
  }
  next();
});

// Compound indexes
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, isGraded: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
