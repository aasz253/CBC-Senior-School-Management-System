/**
 * Mark Controller
 * CBC competency-based marks management with role-based access
 */
const Mark = require('../models/Mark');
const User = require('../models/User');

/**
 * @desc    Get marks - role-based access
 * @route   GET /api/marks
 * @access  Private (Admin: all, Teacher: own class/subject, Student: own)
 */
exports.getMarks = async (req, res, next) => {
  try {
    const { studentId, subject, grade, term, year, assessmentType } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      // Students can only see their own marks
      query.studentId = req.user.id;
    } else if (req.user.role === 'teacher') {
      // Teachers can only see marks for their assigned class/subjects
      if (req.user.assignedClass) {
        // Filter by class if teacher has assigned class
        const students = await User.find({
          role: 'student',
          assignedClass: req.user.assignedClass,
        }).select('_id');
        query.studentId = { $in: students.map(s => s._id) };
      }
      if (req.user.assignedSubjects && req.user.assignedSubjects.length > 0) {
        query.subject = { $in: req.user.assignedSubjects };
      }
    }
    // Admin can see all marks (no additional filter)

    // Apply additional filters
    if (studentId) query.studentId = studentId;
    if (subject) query.subject = subject;
    if (grade) query.grade = grade;
    if (term) query.term = term;
    if (year) query.year = year;
    if (assessmentType) query.assessmentType = assessmentType;

    const marks = await Mark.find(query)
      .populate('studentId', 'name admissionNumber grade pathway')
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: marks.length,
      marks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single mark
 * @route   GET /api/marks/:id
 * @access  Private
 */
exports.getMark = async (req, res, next) => {
  try {
    const mark = await Mark.findById(req.params.id)
      .populate('studentId', 'name admissionNumber grade pathway')
      .populate('teacherId', 'name');

    if (!mark) {
      return res.status(404).json({
        success: false,
        message: 'Mark not found',
      });
    }

    // Role-based access check
    if (req.user.role === 'student' && mark.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this mark',
      });
    }

    res.status(200).json({
      success: true,
      mark,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create mark (teacher or admin)
 * @route   POST /api/marks
 * @access  Private (Teacher/Admin)
 */
exports.createMark = async (req, res, next) => {
  try {
    // Add teacher ID from authenticated user
    req.body.teacherId = req.user.id;

    // Verify student exists and is actually a student
    const student = await User.findById(req.body.studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    // Teacher authorization check
    if (req.user.role === 'teacher') {
      const isAuthorized =
        req.user.assignedSubjects.includes(req.body.subject) ||
        req.user.role === 'admin';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to enter marks for this subject',
        });
      }
    }

    const mark = await Mark.create(req.body);

    const populatedMark = await Mark.findById(mark._id)
      .populate('studentId', 'name admissionNumber grade pathway')
      .populate('teacherId', 'name');

    res.status(201).json({
      success: true,
      mark: populatedMark,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk create marks (for entering marks for entire class)
 * @route   POST /api/marks/bulk
 * @access  Private (Teacher/Admin)
 */
exports.bulkCreateMarks = async (req, res, next) => {
  try {
    const { marks } = req.body;

    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Marks array is required',
      });
    }

    // Add teacher ID to all marks
    const marksWithTeacher = marks.map(mark => ({
      ...mark,
      teacherId: req.user.id,
    }));

    const createdMarks = await Mark.insertMany(marksWithTeacher);

    res.status(201).json({
      success: true,
      count: createdMarks.length,
      message: `${createdMarks.length} marks created successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update mark
 * @route   PUT /api/marks/:id
 * @access  Private (Teacher who created it or Admin)
 */
exports.updateMark = async (req, res, next) => {
  try {
    let mark = await Mark.findById(req.params.id);

    if (!mark) {
      return res.status(404).json({
        success: false,
        message: 'Mark not found',
      });
    }

    // Authorization: only the teacher who created it or admin can update
    if (req.user.role === 'teacher' && mark.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this mark',
      });
    }

    mark = await Mark.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('studentId', 'name admissionNumber grade pathway')
      .populate('teacherId', 'name');

    res.status(200).json({
      success: true,
      mark,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete mark
 * @route   DELETE /api/marks/:id
 * @access  Private/Admin
 */
exports.deleteMark = async (req, res, next) => {
  try {
    const mark = await Mark.findByIdAndDelete(req.params.id);

    if (!mark) {
      return res.status(404).json({
        success: false,
        message: 'Mark not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mark deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve mark (admin only)
 * @route   PUT /api/marks/:id/approve
 * @access  Private/Admin
 */
exports.approveMark = async (req, res, next) => {
  try {
    const mark = await Mark.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).populate('studentId', 'name admissionNumber')
      .populate('teacherId', 'name');

    if (!mark) {
      return res.status(404).json({
        success: false,
        message: 'Mark not found',
      });
    }

    res.status(200).json({
      success: true,
      mark,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student marks summary
 * @route   GET /api/marks/summary/:studentId
 * @access  Private
 */
exports.getStudentSummary = async (req, res, next) => {
  try {
    // Students can only view their own summary
    if (req.user.role === 'student' && req.params.studentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this summary',
      });
    }

    const { term, year } = req.query;
    const query = { studentId: req.params.studentId };
    if (term) query.term = parseInt(term);
    if (year) query.year = parseInt(year);

    const marks = await Mark.find(query).sort({ subject: 1 });

    // Calculate summary statistics
    const summary = {};
    marks.forEach(mark => {
      const key = `${mark.term}-${mark.year}`;
      if (!summary[key]) {
        summary[key] = { term: mark.term, year: mark.year, subjects: [], average: 0 };
      }
      summary[key].subjects.push({
        subject: mark.subject,
        score: mark.score,
        competencyLevel: mark.competencyLevel,
        competencyLabel: mark.competencyLabel,
        teacherRemark: mark.teacherRemark,
        assessmentType: mark.assessmentType,
      });
    });

    // Calculate averages
    Object.values(summary).forEach(termSummary => {
      const total = termSummary.subjects.reduce((sum, s) => sum + s.score, 0);
      termSummary.average = termSummary.subjects.length > 0 ? (total / termSummary.subjects.length).toFixed(1) : 0;
    });

    res.status(200).json({
      success: true,
      summary: Object.values(summary),
    });
  } catch (error) {
    next(error);
  }
};
