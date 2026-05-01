const express = require('express');
const router = express.Router();
const {
  generateStudentReport,
  generateClassReport,
  getStudentReportData,
  generateFeeReport,
  generateMarksReport,
  generatePaymentReport,
  generateFeeStatement,
  generateTimetablePDF,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Student report (student own, teacher/admin any)
router.get('/student/:studentId', generateStudentReport);
router.get('/student/:studentId/fee-statement', generateFeeStatement);
router.get('/data/:studentId', getStudentReportData);

// Class report (admin/teacher only)
router.get('/class/:grade', authorize('admin', 'teacher'), generateClassReport);

// Fee report (admin only)
router.get('/fees/:grade', authorize('admin'), generateFeeReport);

// Marks report (admin/teacher)
router.get('/marks/:grade', authorize('admin', 'teacher'), generateMarksReport);

// Payment report (admin only)
router.get('/payments', authorize('admin'), generatePaymentReport);

// Timetable PDF (all roles)
router.get('/timetable', generateTimetablePDF);

module.exports = router;
