const express = require('express');
const router = express.Router();
const {
  getTimetable,
  getTimetableEntry,
  createTimetableEntry,
  bulkCreateTimetable,
  updateTimetableEntry,
  deleteTimetableEntry,
  getClasses,
} = require('../controllers/timetableController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/classes', getClasses);
router.get('/', getTimetable);
router.get('/:id', getTimetableEntry);
router.post('/', authorize('admin'), createTimetableEntry);
router.post('/bulk', authorize('admin'), bulkCreateTimetable);
router.put('/:id', authorize('admin'), updateTimetableEntry);
router.delete('/:id', authorize('admin'), deleteTimetableEntry);

module.exports = router;
