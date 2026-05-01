const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

const User = require('../models/User');

// Admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: 'student', isActive: true });
    const teachers = await User.countDocuments({ role: 'teacher', isActive: true });
    const workers = await User.countDocuments({ role: 'school_worker', isActive: true });
    const communityMembers = await User.countDocuments({ role: 'community_member', isActive: true });

    const studentsByGrade = await User.aggregate([
      { $match: { role: 'student', isActive: true } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: { totalUsers, students, teachers, workers, communityMembers, studentsByGrade },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
