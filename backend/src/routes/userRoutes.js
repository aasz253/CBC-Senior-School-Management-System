const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getStats,
  getStudentsByGrade,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/students', authorize('admin', 'teacher'), getStudentsByGrade);
router.get('/stats', authorize('admin'), getStats);

router.use(authorize('admin'));
router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.put('/:id/toggle-status', toggleUserStatus);

module.exports = router;
