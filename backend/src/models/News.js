/**
 * News Model - School news and announcements
 */
const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'News title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  content: {
    type: String,
    required: [true, 'News content is required'],
    trim: true,
  },
  // Public news visible to community members
  isPublic: {
    type: Boolean,
    default: false,
    index: true,
  },
  // Category for organization
  category: {
    type: String,
    enum: ['general', 'academic', 'sports', 'events', 'fees', 'exams', 'holiday'],
    default: 'general',
  },
  // Who posted the news
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required'],
  },
  // Pin to top of news feed
  isPinned: {
    type: Boolean,
    default: false,
  },
  // Optional image
  imageUrl: {
    type: String,
  },
  // Expiry date for time-sensitive news
  expiresAt: {
    type: Date,
  },
  // Whether still active
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
newsSchema.index({ isPublic: 1, createdAt: -1 });
newsSchema.index({ category: 1, createdAt: -1 });
newsSchema.index({ isPinned: 1, createdAt: -1 });
newsSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('News', newsSchema);
