const express = require('express');
const router = express.Router();
const {
  getAttendance,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  getAttendanceStats,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getAttendanceStats);
router.get('/', getAttendance);
router.post('/', authorize('admin', 'teacher'), markAttendance);
router.post('/bulk', authorize('admin', 'teacher'), bulkMarkAttendance);
router.put('/:id', authorize('admin', 'teacher'), updateAttendance);

module.exports = router;
