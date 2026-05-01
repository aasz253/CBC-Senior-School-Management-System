const express = require('express');
const router = express.Router();
const { getDetails, updateDetails } = require('../controllers/schoolDetailsController');
const { protect, authorize } = require('../middleware/auth');

// Public - anyone can view
router.get('/', getDetails);

// Admin only - update
router.put('/', protect, authorize('admin'), updateDetails);

module.exports = router;
