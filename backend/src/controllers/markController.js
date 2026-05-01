/**
 * Mark Controller - Full CRUD with position calculation
 */
const Mark = require('../models/Mark');
const User = require('../models/User');
const { calculatePositions } = require('./reportController');

/**
 * @desc    Get marks - role-based
 * @route   GET /api/marks
 * @access  Private
 */
const getMarks = async (req, res) => {
  try {
    const { grade, term, year, subject, assessmentType } = req.query;
    const query = {};

    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    } else if (req.user.role === 'student') {
      query.studentId = req.user.id;
    }

    if (grade) query.grade = grade;
    if (term) query.term = parseInt(term);
    if (year) query.year = parseInt(year);
    if (subject) query.subject = subject;
    if (assessmentType) query.assessmentType = assessmentType;

    const marks = await Mark.find(query)
      .populate('studentId', 'name admissionNumber grade')
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: marks.length, marks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Create mark
 * @route   POST /api/marks
 * @access  Private (Teacher/Admin)
 */
const createMark = async (req, res) => {
  try {
    const markData = { ...req.body };
    if (req.user.role === 'teacher') {
      markData.teacherId = req.user.id;
    }

    const mark = await Mark.create(markData);
    const populated = await Mark.findById(mark._id)
      .populate('studentId', 'name admissionNumber grade')
      .populate('teacherId', 'name');

    res.status(201).json({ success: true, mark: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Bulk create marks
 * @route   POST /api/marks/bulk
 * @access  Private (Teacher/Admin)
 */
const bulkCreateMarks = async (req, res) => {
  try {
    const { marks } = req.body;
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ success: false, message: 'Marks array required' });
    }

    const created = await Mark.insertMany(marks);
    res.status(201).json({ success: true, count: created.length, message: `${created.length} marks created` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Update mark
 * @route   PUT /api/marks/:id
 * @access  Private (Teacher/Admin)
 */
const updateMark = async (req, res) => {
  try {
    const mark = await Mark.findById(req.params.id);
    if (!mark) return res.status(404).json({ success: false, message: 'Mark not found' });

    if (req.user.role === 'teacher' && mark.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updated = await Mark.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('studentId', 'name admissionNumber grade')
      .populate('teacherId', 'name');

    res.json({ success: true, mark: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Delete mark
 * @route   DELETE /api/marks/:id
 * @access  Private (Admin)
 */
const deleteMark = async (req, res) => {
  try {
    const mark = await Mark.findByIdAndDelete(req.params.id);
    if (!mark) return res.status(404).json({ success: false, message: 'Mark not found' });
    res.json({ success: true, message: 'Mark deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Approve mark
 * @route   PUT /api/marks/:id/approve
 * @access  Private (Admin)
 */
const approveMark = async (req, res) => {
  try {
    const mark = await Mark.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true })
      .populate('studentId', 'name')
      .populate('teacherId', 'name');
    if (!mark) return res.status(404).json({ success: false, message: 'Mark not found' });
    res.json({ success: true, mark });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Reject mark
 * @route   PUT /api/marks/:id/reject
 * @access  Private (Admin)
 */
const rejectMark = async (req, res) => {
  try {
    const mark = await Mark.findByIdAndUpdate(req.params.id, { isApproved: false }, { new: true })
      .populate('studentId', 'name')
      .populate('teacherId', 'name');
    if (!mark) return res.status(404).json({ success: false, message: 'Mark not found' });
    res.json({ success: true, mark });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get summary for a student
 * @route   GET /api/marks/summary/:studentId
 * @access  Private
 */
const getStudentSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { term, year } = req.query;

    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const query = { studentId };
    if (term) query.term = parseInt(term);
    if (year) query.year = parseInt(year);

    const marks = await Mark.find(query).sort({ subject: 1 });
    const student = await User.findById(studentId).select('name grade pathway');

    const totalScore = marks.reduce((sum, m) => sum + m.score, 0);
    const mean = marks.length > 0 ? (totalScore / marks.length).toFixed(2) : 0;

    const positions = await calculatePositions(student.grade, parseInt(term), parseInt(year));
    const position = positions.find(p => p.studentId.toString() === studentId);

    res.json({
      success: true,
      data: { student, marks, totalScore, mean, position: position?.position, totalStudents: positions.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Get marks with positions for admin/teacher
 * @route   GET /api/marks/with-positions
 * @access  Private (Admin/Teacher)
 */
const getMarksWithPositions = async (req, res) => {
  try {
    const { grade, term, year } = req.query;
    if (!grade || !term || !year) {
      return res.status(400).json({ success: false, message: 'Grade, term, and year required' });
    }

    const positions = await calculatePositions(grade, parseInt(term), parseInt(year));
    const students = await User.find({ role: 'student', grade }).select('name admissionNumber');

    const result = positions.map(p => {
      const student = students.find(s => s._id.toString() === p.studentId.toString());
      return { ...p, admissionNumber: student?.admissionNumber || 'N/A' };
    });

    res.json({ success: true, count: result.length, positions: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getMarks,
  createMark,
  bulkCreateMarks,
  updateMark,
  deleteMark,
  approveMark,
  rejectMark,
  getStudentSummary,
  getMarksWithPositions,
};
