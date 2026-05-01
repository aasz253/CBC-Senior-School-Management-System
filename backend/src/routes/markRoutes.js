const express = require('express');
const router = express.Router();
const {
  getMarks,
  createMark,
  bulkCreateMarks,
  updateMark,
  deleteMark,
  approveMark,
  rejectMark,
  getStudentSummary,
  getMarksWithPositions,
} = require('../controllers/markController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getMarks);
router.get('/with-positions', authorize('admin', 'teacher'), getMarksWithPositions);
router.get('/summary/:studentId', getStudentSummary);
router.post('/', authorize('admin', 'teacher'), createMark);
router.post('/bulk', authorize('admin', 'teacher'), bulkCreateMarks);
router.put('/:id', authorize('admin', 'teacher'), updateMark);
router.delete('/:id', authorize('admin'), deleteMark);
router.put('/:id/approve', authorize('admin'), approveMark);
router.put('/:id/reject', authorize('admin'), rejectMark);

module.exports = router;
