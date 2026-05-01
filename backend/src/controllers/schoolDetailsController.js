/**
 * School Details Controller
 */
const SchoolDetails = require('../models/SchoolDetails');

// Get school details (public + private)
const getDetails = async (req, res) => {
  try {
    let details = await SchoolDetails.findOne();
    if (!details) {
      details = new SchoolDetails();
      await details.save();
    }
    res.json({ success: true, data: details });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update school details (admin only)
const updateDetails = async (req, res) => {
  try {
    let details = await SchoolDetails.findOne();
    if (!details) {
      details = new SchoolDetails();
    }

    // Handle simple fields
    const fields = [
      'name', 'motto', 'vision', 'mission', 'logo', 'schoolPhoto',
      'principal', 'deputyPrincipal', 'deanOfStudies',
      'gradeMeans', 'sportsClubs', 'coCurricularActivities',
      'studentLeadership', 'staffGallery', 'workersGallery',
      'schoolPhotos', 'location', 'currentTerm', 'gallery',
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        details[field] = req.body[field];
      }
    });

    await details.save();
    res.json({ success: true, data: details, message: 'School details updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDetails,
  updateDetails,
};
