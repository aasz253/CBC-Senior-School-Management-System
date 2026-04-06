/**
 * Fee Controller
 * Fee management with role-based access
 */
const Fee = require('../models/Fee');
const User = require('../models/User');

/**
 * @desc    Get all fees - role-based access
 * @route   GET /api/fees
 * @access  Private (Admin: all, Student: own)
 */
exports.getFees = async (req, res, next) => {
  try {
    const { studentId, term, year, grade, pathway } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      query.studentId = req.user.id;
    }
    // Admin can see all fees

    if (studentId) query.studentId = studentId;
    if (term) query.term = parseInt(term);
    if (year) query.year = parseInt(year);
    if (grade) query.grade = grade;
    if (pathway) query.pathway = pathway;

    const fees = await Fee.find(query)
      .populate('studentId', 'name admissionNumber grade pathway phone parentPhone guardianName')
      .sort({ year: -1, term: 1 });

    res.status(200).json({
      success: true,
      count: fees.length,
      fees,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single fee record
 * @route   GET /api/fees/:id
 * @access  Private
 */
exports.getFee = async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('studentId', 'name admissionNumber grade pathway');

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    // Students can only view their own fees
    if (req.user.role === 'student' && fee.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this fee record',
      });
    }

    res.status(200).json({
      success: true,
      fee,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create fee record (admin only)
 * @route   POST /api/fees
 * @access  Private/Admin
 */
exports.createFee = async (req, res, next) => {
  try {
    const { studentId, term, year, totalDue, feeStructure, grade, pathway } = req.body;

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    // Check if fee record already exists for this student/term/year
    const existingFee = await Fee.findOne({ studentId, term, year });
    if (existingFee) {
      return res.status(400).json({
        success: false,
        message: 'Fee record already exists for this student, term, and year',
      });
    }

    const fee = await Fee.create({
      studentId,
      term,
      year,
      totalDue,
      feeStructure: feeStructure || { tuition: totalDue },
      grade: grade || student.grade,
      pathway: pathway || student.pathway,
    });

    const populatedFee = await Fee.findById(fee._id)
      .populate('studentId', 'name admissionNumber grade pathway');

    res.status(201).json({
      success: true,
      fee: populatedFee,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk create fees for all students in a grade
 * @route   POST /api/fees/bulk
 * @access  Private/Admin
 */
exports.bulkCreateFees = async (req, res, next) => {
  try {
    const { grade, pathway, term, year, totalDue, feeStructure } = req.body;

    // Find all students matching criteria
    const query = { role: 'student', isActive: true };
    if (grade) query.grade = grade;
    if (pathway) query.pathway = pathway;

    const students = await User.find(query).select('_id grade pathway');

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found matching criteria',
      });
    }

    // Check existing fees to avoid duplicates
    const existingFeeStudentIds = await Fee.find({ term, year }).distinct('studentId');
    const newStudents = students.filter(s => !existingFeeStudentIds.includes(s._id.toString()));

    if (newStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Fees already set for all matching students this term',
      });
    }

    // Create fee records
    const feeRecords = newStudents.map(student => ({
      studentId: student._id,
      term,
      year,
      totalDue,
      feeStructure: feeStructure || { tuition: totalDue },
      grade: student.grade,
      pathway: student.pathway,
    }));

    await Fee.insertMany(feeRecords);

    res.status(201).json({
      success: true,
      count: feeRecords.length,
      message: `Fees created for ${feeRecords.length} students`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update fee record
 * @route   PUT /api/fees/:id
 * @access  Private/Admin
 */
exports.updateFee = async (req, res, next) => {
  try {
    const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('studentId', 'name admissionNumber grade pathway');

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    res.status(200).json({
      success: true,
      fee,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete fee record
 * @route   DELETE /api/fees/:id
 * @access  Private/Admin
 */
exports.deleteFee = async (req, res, next) => {
  try {
    const fee = await Fee.findByIdAndDelete(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Fee record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get fee statistics (admin only)
 * @route   GET /api/fees/stats
 * @access  Private/Admin
 */
exports.getFeeStats = async (req, res, next) => {
  try {
    const { term, year } = req.query;
    const query = {};
    if (term) query.term = parseInt(term);
    if (year) query.year = parseInt(year);

    const fees = await Fee.find(query);

    const totalDue = fees.reduce((sum, fee) => sum + fee.totalDue, 0);
    const totalPaid = fees.reduce((sum, fee) => sum + fee.amountPaid, 0);
    const totalBalance = fees.reduce((sum, fee) => sum + (fee.balance || 0), 0);
    const fullyPaid = fees.filter(f => f.isFullyPaid).length;
    const pending = fees.filter(f => !f.isFullyPaid).length;

    res.status(200).json({
      success: true,
      stats: {
        totalStudents: fees.length,
        totalDue,
        totalPaid,
        totalBalance,
        fullyPaid,
        pending,
        collectionRate: totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
