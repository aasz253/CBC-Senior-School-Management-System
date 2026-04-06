/**
 * Assignment Controller
 * CRUD for assignments with file upload and submission handling
 */
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const path = require('path');

/**
 * @desc    Get all assignments - role-based access
 * @route   GET /api/assignments
 * @access  Private
 */
exports.getAssignments = async (req, res, next) => {
  try {
    const { grade, subject, assignedClass, status } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    } else if (req.user.role === 'student') {
      query.grade = req.user.grade;
    }

    if (grade) query.grade = grade;
    if (subject) query.subject = subject;
    if (assignedClass) query.assignedClass = assignedClass;

    // Filter by status (pending, overdue, completed)
    if (status === 'pending') {
      query.dueDate = { $gt: new Date() };
      query.isClosed = false;
    } else if (status === 'overdue') {
      query.dueDate = { $lte: new Date() };
      query.isClosed = false;
    } else if (status === 'completed') {
      query.isClosed = true;
    }

    const assignments = await Assignment.find(query)
      .populate('teacherId', 'name')
      .sort({ dueDate: 1 });

    // For students, include submission status
    if (req.user.role === 'student') {
      const assignmentsWithSubmission = await Promise.all(
        assignments.map(async (assignment) => {
          const submission = await Submission.findOne({
            assignmentId: assignment._id,
            studentId: req.user.id,
          });
          return {
            ...assignment.toObject(),
            submissionStatus: submission ? (submission.isGraded ? 'graded' : 'submitted') : 'pending',
            submission,
          };
        })
      );

      return res.status(200).json({
        success: true,
        count: assignmentsWithSubmission.length,
        assignments: assignmentsWithSubmission,
      });
    }

    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single assignment
 * @route   GET /api/assignments/:id
 * @access  Private
 */
exports.getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('teacherId', 'name email');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    res.status(200).json({
      success: true,
      assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create assignment
 * @route   POST /api/assignments
 * @access  Private (Teacher/Admin)
 */
exports.createAssignment = async (req, res, next) => {
  try {
    req.body.teacherId = req.user.id;

    const assignment = await Assignment.create(req.body);

    // Handle file attachments if uploaded
    if (req.files && req.files.length > 0) {
      assignment.attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype,
        fileSize: file.size,
      }));
      await assignment.save();
    }

    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('teacherId', 'name');

    // TODO: Send notification to students

    res.status(201).json({
      success: true,
      assignment: populatedAssignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update assignment
 * @route   PUT /api/assignments/:id
 * @access  Private (Teacher who created it or Admin)
 */
exports.updateAssignment = async (req, res, next) => {
  try {
    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Only the creator or admin can update
    if (req.user.role === 'teacher' && assignment.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this assignment',
      });
    }

    assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('teacherId', 'name');

    res.status(200).json({
      success: true,
      assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete assignment
 * @route   DELETE /api/assignments/:id
 * @access  Private (Teacher who created it or Admin)
 */
exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Only creator or admin can delete
    if (req.user.role === 'teacher' && assignment.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this assignment',
      });
    }

    // Delete associated submissions
    await Submission.deleteMany({ assignmentId: assignment._id });
    await Assignment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Assignment and all submissions deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit assignment
 * @route   POST /api/assignments/:id/submit
 * @access  Private (Student)
 */
exports.submitAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      assignmentId: assignment._id,
      studentId: req.user.id,
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this assignment',
      });
    }

    // Create submission
    const submission = await Submission.create({
      assignmentId: assignment._id,
      studentId: req.user.id,
      textContent: req.body.textContent,
      files: req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype,
        fileSize: file.size,
      })) : [],
    });

    const populatedSubmission = await Submission.findById(submission._id)
      .populate('assignmentId', 'title subject dueDate');

    res.status(201).json({
      success: true,
      submission: populatedSubmission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get submissions for an assignment
 * @route   GET /api/assignments/:id/submissions
 * @access  Private (Teacher who created it or Admin)
 */
exports.getSubmissions = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Authorization check
    if (req.user.role === 'teacher' && assignment.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view submissions',
      });
    }

    const submissions = await Submission.find({ assignmentId: assignment._id })
      .populate('studentId', 'name admissionNumber grade')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Grade a submission
 * @route   PUT /api/assignments/:assignmentId/submissions/:submissionId
 * @access  Private (Teacher)
 */
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { grade, feedback } = req.body;

    const submission = await Submission.findById(req.params.submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    // Verify teacher owns the assignment
    const assignment = await Assignment.findById(submission.assignmentId);
    if (req.user.role === 'teacher' && assignment.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to grade this submission',
      });
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedBy = req.user.id;
    submission.isGraded = true;
    submission.gradedAt = new Date();
    await submission.save();

    const populatedSubmission = await Submission.findById(submission._id)
      .populate('studentId', 'name admissionNumber')
      .populate('assignmentId', 'title subject');

    res.status(200).json({
      success: true,
      submission: populatedSubmission,
    });
  } catch (error) {
    next(error);
  }
};
