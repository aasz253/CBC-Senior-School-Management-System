const express = require('express');
const router = express.Router();
const {
  generateStudentReport,
  generateClassReport,
  getStudentReportData,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Student report (student own, teacher/admin any)
router.get('/student/:studentId', generateStudentReport);
router.get('/data/:studentId', getStudentReportData);

// Class report (admin/teacher only)
router.get('/class/:grade', authorize('admin', 'teacher'), generateClassReport);

module.exports = router;
