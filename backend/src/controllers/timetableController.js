/**
 * Timetable Controller
 * Digital class schedule management
 */
const Timetable = require('../models/Timetable');
const User = require('../models/User');

/**
 * @desc    Get timetable - role-based access
 * @route   GET /api/timetable
 * @access  Private
 */
exports.getTimetable = async (req, res, next) => {
  try {
    const { grade, assignedClass, day, teacherId } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      query.grade = req.user.grade;
      if (req.user.assignedClass) {
        query.assignedClass = req.user.assignedClass;
      }
    } else if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    }
    // Admin can see all timetables

    if (grade) query.grade = grade;
    if (assignedClass) query.assignedClass = assignedClass;
    if (day) query.day = day;
    if (teacherId) query.teacherId = teacherId;

    const timetable = await Timetable.find(query)
      .populate('teacherId', 'name email')
      .sort({ day: 1, period: 1 });

    // Group by day
    const groupedByDay = {};
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    timetable.forEach(entry => {
      if (!groupedByDay[entry.day]) {
        groupedByDay[entry.day] = [];
      }
      groupedByDay[entry.day].push(entry);
    });

    // Sort days in order
    const sortedTimetable = {};
    dayOrder.forEach(day => {
      if (groupedByDay[day]) {
        sortedTimetable[day] = groupedByDay[day];
      }
    });

    res.status(200).json({
      success: true,
      count: timetable.length,
      timetable,
      groupedByDay: sortedTimetable,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single timetable entry
 * @route   GET /api/timetable/:id
 * @access  Private
 */
exports.getTimetableEntry = async (req, res, next) => {
  try {
    const entry = await Timetable.findById(req.params.id)
      .populate('teacherId', 'name email');

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Timetable entry not found',
      });
    }

    res.status(200).json({
      success: true,
      entry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create timetable entry (admin only)
 * @route   POST /api/timetable
 * @access  Private/Admin
 */
exports.createTimetableEntry = async (req, res, next) => {
  try {
    // Verify teacher exists
    const teacher = await User.findById(req.body.teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID',
      });
    }

    const entry = await Timetable.create(req.body);

    const populatedEntry = await Timetable.findById(entry._id)
      .populate('teacherId', 'name');

    res.status(201).json({
      success: true,
      entry: populatedEntry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk create timetable entries
 * @route   POST /api/timetable/bulk
 * @access  Private/Admin
 */
exports.bulkCreateTimetable = async (req, res, next) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Entries array is required',
      });
    }

    const createdEntries = await Timetable.insertMany(entries);

    res.status(201).json({
      success: true,
      count: createdEntries.length,
      message: `${createdEntries.length} timetable entries created`,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate timetable entry detected. An entry already exists for this class/day/period.',
      });
    }
    next(error);
  }
};

/**
 * @desc    Update timetable entry
 * @route   PUT /api/timetable/:id
 * @access  Private/Admin
 */
exports.updateTimetableEntry = async (req, res, next) => {
  try {
    const entry = await Timetable.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('teacherId', 'name');

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Timetable entry not found',
      });
    }

    res.status(200).json({
      success: true,
      entry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete timetable entry
 * @route   DELETE /api/timetable/:id
 * @access  Private/Admin
 */
exports.deleteTimetableEntry = async (req, res, next) => {
  try {
    const entry = await Timetable.findByIdAndDelete(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Timetable entry not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Timetable entry deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all available classes
 * @route   GET /api/timetable/classes
 * @access  Private
 */
exports.getClasses = async (req, res, next) => {
  try {
    const classes = await Timetable.distinct('assignedClass');

    res.status(200).json({
      success: true,
      classes,
    });
  } catch (error) {
    next(error);
  }
};
