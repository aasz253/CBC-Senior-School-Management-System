/**
 * Attendance Controller
 * Daily attendance tracking with role-based access
 */
const Attendance = require('../models/Attendance');
const User = require('../models/User');

/**
 * @desc    Get attendance records - role-based access
 * @route   GET /api/attendance
 * @access  Private
 */
exports.getAttendance = async (req, res, next) => {
  try {
    const { studentId, date, grade, assignedClass, startDate, endDate } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      query.studentId = req.user.id;
    } else if (req.user.role === 'teacher') {
      if (req.user.classTeacherOf) {
        query.grade = req.user.classTeacherOf;
      } else if (req.user.assignedClass) {
        query.assignedClass = req.user.assignedClass;
      }
    }
    // Admin can see all attendance

    if (studentId) query.studentId = studentId;
    if (grade) query.grade = grade;
    if (assignedClass) query.assignedClass = assignedClass;

    // Date range filtering
    if (date) {
      query.date = {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lte: new Date(date).setHours(23, 59, 59, 999),
      };
    }
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'name admissionNumber grade pathway')
      .populate('recordedBy', 'name')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark attendance (single student)
 * @route   POST /api/attendance
 * @access  Private (Teacher/Admin)
 */
exports.markAttendance = async (req, res, next) => {
  try {
    req.body.recordedBy = req.user.id;

    // Verify student exists
    const student = await User.findById(req.body.studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    // Auto-fill grade and class from student
    req.body.grade = student.grade;
    req.body.assignedClass = student.assignedClass || req.body.assignedClass;

    const attendance = await Attendance.create(req.body);

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('studentId', 'name admissionNumber grade')
      .populate('recordedBy', 'name');

    res.status(201).json({
      success: true,
      attendance: populatedAttendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk mark attendance for entire class
 * @route   POST /api/attendance/bulk
 * @access  Private (Teacher/Admin)
 */
exports.bulkMarkAttendance = async (req, res, next) => {
  try {
    const { date, grade, assignedClass, records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Records array is required',
      });
    }

    const attendanceRecords = [];
    for (const record of records) {
      const student = await User.findById(record.studentId);
      attendanceRecords.push({
        studentId: record.studentId,
        date: record.date || date,
        status: record.status,
        grade: grade || (student?.grade?.toString().replace('Grade ', '') || student?.grade),
        assignedClass: assignedClass || student?.assignedClass,
        recordedBy: req.user.id,
        reason: record.reason,
        lateArrivalTime: record.lateArrivalTime,
      });
    }

    // Use bulkWrite for efficiency with upsert
    const operations = attendanceRecords.map(record => ({
      updateOne: {
        filter: {
          studentId: record.studentId,
          date: record.date,
          subject: record.subject || null,
        },
        update: { $set: record },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(operations);

    res.status(201).json({
      success: true,
      count: result.upsertedCount + result.modifiedCount,
      message: 'Attendance recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update attendance record
 * @route   PUT /api/attendance/:id
 * @access  Private (Teacher/Admin)
 */
exports.updateAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('studentId', 'name admissionNumber grade')
      .populate('recordedBy', 'name');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance statistics
 * @route   GET /api/attendance/stats
 * @access  Private
 */
exports.getAttendanceStats = async (req, res, next) => {
  try {
    const { studentId, grade, assignedClass, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role === 'student') {
      query.studentId = req.user.id;
    }
    if (studentId) query.studentId = studentId;
    if (grade) query.grade = grade;
    if (assignedClass) query.assignedClass = assignedClass;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(query);

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const late = attendance.filter(a => a.status === 'Late').length;

    res.status(200).json({
      success: true,
      stats: {
        total,
        present,
        absent,
        late,
        attendanceRate: total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
