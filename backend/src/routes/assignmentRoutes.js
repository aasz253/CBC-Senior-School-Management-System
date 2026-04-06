const express = require('express');
const router = express.Router();
const {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
} = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/', getAssignments);
router.get('/:id', getAssignment);
router.post('/', authorize('admin', 'teacher'), upload.array('attachments', 5), createAssignment);
router.put('/:id', authorize('admin', 'teacher'), updateAssignment);
router.delete('/:id', authorize('admin', 'teacher'), deleteAssignment);

// Submission routes
router.post('/:id/submit', authorize('student'), upload.array('files', 3), submitAssignment);
router.get('/:id/submissions', authorize('admin', 'teacher'), getSubmissions);
router.put('/:assignmentId/submissions/:submissionId', authorize('admin', 'teacher'), gradeSubmission);

module.exports = router;
