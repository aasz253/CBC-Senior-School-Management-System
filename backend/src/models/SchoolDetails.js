/**
 * School Details Model
 * Stores all public school information displayed to all users
 */
const mongoose = require('mongoose');

const schoolDetailsSchema = new mongoose.Schema({
  // School identity
  name: {
    type: String,
    default: 'CBC Senior School',
  },
  motto: {
    type: String,
    default: 'Excellence in Education',
  },
  vision: {
    type: String,
    default: 'To nurture holistic, competent, and responsible citizens through quality CBC education.',
  },
  mission: {
    type: String,
    default: 'To provide a supportive, inclusive, and innovative learning environment that empowers learners to achieve their full potential.',
  },
  logo: {
    type: String,
    default: '',
  },
  schoolPhoto: {
    type: String,
    default: '',
  },

  // Leadership
  principal: {
    name: { type: String, default: '' },
    photo: { type: String, default: '' },
    message: { type: String, default: '' },
  },
  deputyPrincipal: {
    name: { type: String, default: '' },
    photo: { type: String, default: '' },
  },
  deanOfStudies: {
    name: { type: String, default: '' },
    photo: { type: String, default: '' },
  },

  // Academic performance - mean per grade
  gradeMeans: {
    grade10: { type: Number, default: 0 },
    grade11: { type: Number, default: 0 },
    grade12: { type: Number, default: 0 },
  },

  // Sports clubs
  sportsClubs: [{
    name: { type: String, required: true },
    photo: { type: String, default: '' },
    description: { type: String, default: '' },
  }],

  // Co-curricular activities
  coCurricularActivities: [{
    name: { type: String, required: true },
    photo: { type: String, default: '' },
    description: { type: String, default: '' },
  }],

  // Student leadership
  studentLeadership: {
    president: {
      name: { type: String, default: '' },
      photo: { type: String, default: '' },
    },
    deputyPresident: {
      name: { type: String, default: '' },
      photo: { type: String, default: '' },
    },
  },

  // Staff gallery
  staffGallery: [{
    name: { type: String, required: true },
    role: { type: String, default: 'Teacher' },
    photo: { type: String, default: '' },
  }],

  // Workers & guards gallery
  workersGallery: [{
    name: { type: String, required: true },
    role: { type: String, default: '' },
    photo: { type: String, default: '' },
  }],

  // Building/school photos
  schoolPhotos: [{
    title: { type: String, default: '' },
    photo: { type: String, default: '' },
  }],

  // Location
  location: {
    county: { type: String, default: '' },
    subCounty: { type: String, default: '' },
    address: { type: String, default: '' },
    mapEmbed: { type: String, default: '' },
  },

  // Term dates
  currentTerm: {
    name: { type: String, default: '' },
    year: { type: Number, default: new Date().getFullYear() },
    openingDate: { type: Date },
    closingDate: { type: Date },
  },

  // Gallery (misc)
  gallery: [{
    title: { type: String, default: '' },
    photo: { type: String, default: '' },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('SchoolDetails', schoolDetailsSchema);
