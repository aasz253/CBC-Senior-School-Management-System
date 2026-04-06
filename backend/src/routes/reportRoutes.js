const express = require('express');
const router = express.Router();
const {
  generateReport,
  getClassStudents,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/generate/:studentId/:term/:year', generateReport);
router.get('/class/:grade', authorize('admin'), getClassStudents);

module.exports = router;
