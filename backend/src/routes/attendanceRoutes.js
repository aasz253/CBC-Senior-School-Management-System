const express = require('express');
const router = express.Router();
const {
  getAttendance,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  getAttendanceStats,
  getWeeklyAttendance,
  generateWeeklyPTFReport,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getAttendanceStats);
router.get('/weekly', getWeeklyAttendance);
router.get('/weekly-report', generateWeeklyPTFReport);
router.get('/', getAttendance);
router.post('/', authorize('admin', 'teacher'), markAttendance);
router.post('/bulk', authorize('admin', 'teacher'), bulkMarkAttendance);
router.put('/:id', authorize('admin', 'teacher'), updateAttendance);

module.exports = router;
