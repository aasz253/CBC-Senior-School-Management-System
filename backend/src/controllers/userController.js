/**
 * User Controller
 * CRUD operations for users (admin only)
 */
const User = require('../models/User');

/**
 * @desc    Get students by grade (admin/teacher)
 * @route   GET /api/users/students
 * @access  Private/Admin, Private/Teacher
 */
exports.getStudentsByGrade = async (req, res, next) => {
  try {
    const { grade } = req.query;
    const query = { role: 'student', isActive: true };
    if (grade) query.grade = grade;

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { role, grade, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (grade) query.grade = grade;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: page,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create user (admin only)
 * @route   POST /api/users
 * @access  Private/Admin
 */
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, admissionNumber, grade, pathway, parentPhone, guardianName, assignedClass, assignedSubjects } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      admissionNumber,
      grade,
      pathway,
      parentPhone,
      guardianName,
      assignedClass,
      assignedSubjects: assignedSubjects || [],
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        admissionNumber: user.admissionNumber,
        grade: user.grade,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;

    // Don't allow password update through this route
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle user active status
 * @route   PUT /api/users/:id/toggle-status
 * @access  Private/Admin
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      user: {
        id: user._id,
        name: user.name,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get statistics
 * @route   GET /api/users/stats
 * @access  Private/Admin
 */
exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: 'student', isActive: true });
    const teachers = await User.countDocuments({ role: 'teacher', isActive: true });
    const workers = await User.countDocuments({ role: 'school_worker', isActive: true });
    const communityMembers = await User.countDocuments({ role: 'community_member', isActive: true });

    // Students by grade
    const studentsByGrade = await User.aggregate([
      { $match: { role: 'student', isActive: true } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Students by pathway
    const studentsByPathway = await User.aggregate([
      { $match: { role: 'student', isActive: true, pathway: { $ne: null } } },
      { $group: { _id: '$pathway', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        students,
        teachers,
        workers,
        communityMembers,
        studentsByGrade,
        studentsByPathway,
      },
    });
  } catch (error) {
    next(error);
  }
};
