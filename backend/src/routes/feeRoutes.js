const express = require('express');
const router = express.Router();
const {
  getFees,
  getFee,
  createFee,
  bulkCreateFees,
  updateFee,
  deleteFee,
  getFeeStats,
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/stats', authorize('admin'), getFeeStats);
router.get('/', getFees);
router.get('/:id', getFee);
router.post('/', authorize('admin'), createFee);
router.post('/bulk', authorize('admin'), bulkCreateFees);
router.put('/:id', authorize('admin'), updateFee);
router.delete('/:id', authorize('admin'), deleteFee);

module.exports = router;
