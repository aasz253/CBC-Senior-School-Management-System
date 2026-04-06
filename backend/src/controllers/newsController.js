/**
 * News Controller
 * School news and announcements with public/private access
 */
const News = require('../models/News');
const Event = require('../models/Event');

/**
 * @desc    Get all news - role-based access
 * @route   GET /api/news
 * @access  Public (public news) / Private (all news for logged-in users)
 */
exports.getNews = async (req, res, next) => {
  try {
    const { category, isPublic, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    // Community members (not logged in) only see public news
    if (!req.user) {
      query.isPublic = true;
    } else if (req.user.role === 'community_member') {
      query.isPublic = true;
    }

    if (category) query.category = category;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';

    // Remove expired news
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ];

    const news = await News.find(query)
      .populate('postedBy', 'name role')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await News.countDocuments(query);

    res.status(200).json({
      success: true,
      count: news.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: page,
      news,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single news item
 * @route   GET /api/news/:id
 * @access  Public (if public) / Private
 */
exports.getNewsItem = async (req, res, next) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('postedBy', 'name role');

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found',
      });
    }

    // Check access for non-public news
    if (!news.isPublic && !req.user) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to view this news',
      });
    }

    if (!news.isPublic && req.user.role === 'community_member') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view internal news',
      });
    }

    res.status(200).json({
      success: true,
      news,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create news
 * @route   POST /api/news
 * @access  Private (Admin/Teacher)
 */
exports.createNews = async (req, res, next) => {
  try {
    req.body.postedBy = req.user.id;

    const news = await News.create(req.body);

    const populatedNews = await News.findById(news._id)
      .populate('postedBy', 'name role');

    // TODO: Send push notification

    res.status(201).json({
      success: true,
      news: populatedNews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update news
 * @route   PUT /api/news/:id
 * @access  Private (Admin)
 */
exports.updateNews = async (req, res, next) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('postedBy', 'name role');

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found',
      });
    }

    res.status(200).json({
      success: true,
      news,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete news
 * @route   DELETE /api/news/:id
 * @access  Private (Admin)
 */
exports.deleteNews = async (req, res, next) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'News deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all events
 * @route   GET /api/news/events
 * @access  Public (public events) / Private (all events)
 */
exports.getEvents = async (req, res, next) => {
  try {
    const { eventType, month, year, isPublic } = req.query;
    const query = {};

    if (!req.user || req.user.role === 'community_member') {
      query.isPublic = true;
    }

    if (eventType) query.eventType = eventType;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';

    // Filter by month/year
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name role')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create event
 * @route   POST /api/news/events
 * @access  Private (Admin)
 */
exports.createEvent = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;

    const event = await Event.create(req.body);

    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'name role');

    res.status(201).json({
      success: true,
      event: populatedEvent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update event
 * @route   PUT /api/news/events/:id
 * @access  Private (Admin)
 */
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name role');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete event
 * @route   DELETE /api/news/events/:id
 * @access  Private (Admin)
 */
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted',
    });
  } catch (error) {
    next(error);
  }
};
