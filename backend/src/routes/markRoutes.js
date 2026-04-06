const express = require('express');
const router = express.Router();
const {
  getMarks,
  getMark,
  createMark,
  bulkCreateMarks,
  updateMark,
  deleteMark,
  approveMark,
  getStudentSummary,
} = require('../controllers/markController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/summary/:studentId', getStudentSummary);
router.get('/', getMarks);
router.get('/:id', getMark);
router.post('/', authorize('admin', 'teacher'), createMark);
router.post('/bulk', authorize('admin', 'teacher'), bulkCreateMarks);
router.put('/:id', authorize('admin', 'teacher'), updateMark);
router.put('/:id/approve', authorize('admin'), approveMark);
router.delete('/:id', authorize('admin'), deleteMark);

module.exports = router;
