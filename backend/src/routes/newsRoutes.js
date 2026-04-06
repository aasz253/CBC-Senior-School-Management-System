const express = require('express');
const router = express.Router();
const {
  getNews,
  getNewsItem,
  createNews,
  updateNews,
  deleteNews,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/newsController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public routes with optional auth
router.get('/', optionalAuth, getNews);
router.get('/events', optionalAuth, getEvents);
router.get('/:id', optionalAuth, getNewsItem);

// Protected routes
router.use(protect);
router.post('/', authorize('admin'), createNews);
router.put('/:id', authorize('admin'), updateNews);
router.delete('/:id', authorize('admin'), deleteNews);

// Events (protected)
router.post('/events', authorize('admin'), createEvent);
router.put('/events/:id', authorize('admin'), updateEvent);
router.delete('/events/:id', authorize('admin'), deleteEvent);

module.exports = router;
