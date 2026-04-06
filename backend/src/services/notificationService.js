/**
 * Notification Service
 * Push notifications via Firebase Cloud Messaging
 * Scheduled tasks for fee reminders and assignment alerts
 */
const cron = require('node-cron');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Fee = require('../models/Fee');

// Firebase Admin SDK (lazy loaded to avoid errors if not configured)
let admin;
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
} catch (error) {
  console.log('Firebase Admin not configured. Push notifications will be skipped.');
}

/**
 * Send push notification to a single user
 */
exports.sendToUser = async (userId, title, body, data = {}) => {
  if (!admin) return;

  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) return;

    const message = {
      token: user.fcmToken,
      notification: { title, body },
      data,
    };

    await admin.messaging().send(message);
    console.log(`Notification sent to ${user.name}: ${title}`);
  } catch (error) {
    console.error('Error sending notification:', error.message);
  }
};

/**
 * Send push notification to multiple users
 */
exports.sendToMultiple = async (userIds, title, body, data = {}) => {
  if (!admin) return;

  try {
    const users = await User.find({ _id: { $in: userIds }, fcmToken: { $exists: true, $ne: null } });
    const tokens = users.map(u => u.fcmToken);

    if (tokens.length === 0) return;

    const message = {
      tokens,
      notification: { title, body },
      data,
    };

    await admin.messaging().sendEachForMulticast(message);
    console.log(`Notification sent to ${tokens.length} users: ${title}`);
  } catch (error) {
    console.error('Error sending batch notification:', error.message);
  }
};

/**
 * Send notification to all students/parents
 */
exports.sendToAllStudents = async (title, body, data = {}) => {
  if (!admin) return;

  try {
    const students = await User.find({ role: 'student', fcmToken: { $exists: true, $ne: null } });
    const tokens = students.map(s => s.fcmToken);

    if (tokens.length === 0) return;

    const message = {
      tokens,
      notification: { title, body },
      data,
    };

    await admin.messaging().sendEachForMulticast(message);
    console.log(`Notification sent to all ${tokens.length} students: ${title}`);
  } catch (error) {
    console.error('Error sending to all students:', error.message);
  }
};

/**
 * Cron: Send fee reminders weekly to students/parents with outstanding balance
 * Runs every Monday at 9:00 AM
 */
cron.schedule('0 9 * * 1', async () => {
  console.log('Running fee reminder job...');
  try {
    const currentYear = new Date().getFullYear();
    const currentTerm = Math.ceil((new Date().getMonth() + 1) / 4);

    const feesWithBalance = await Fee.find({
      year: currentYear,
      term: currentTerm,
      balance: { $gt: 0 },
    }).populate('studentId', 'name fcmToken parentPhone');

    for (const fee of feesWithBalance) {
      const student = fee.studentId;
      if (student && student.fcmToken) {
        await exports.sendToUser(
          student._id,
          'Fee Reminder',
          `Dear ${student.name}, you have an outstanding balance of KES ${fee.balance.toLocaleString()} for Term ${currentTerm}, ${currentYear}. Please pay via M-PESA.`,
          { type: 'fee_reminder', balance: fee.balance.toString() }
        );
      }
    }

    console.log(`Fee reminders sent to ${feesWithBalance.length} students`);
  } catch (error) {
    console.error('Fee reminder job error:', error.message);
  }
});

/**
 * Cron: Send assignment due date reminders 24 hours before deadline
 * Runs every hour
 */
cron.schedule('0 * * * *', async () => {
  console.log('Running assignment reminder job...');
  try {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    const dueAssignments = await Assignment.find({
      dueDate: {
        $gte: new Date(),
        $lte: tomorrow,
      },
      isClosed: false,
      reminderSent: false,
    });

    for (const assignment of dueAssignments) {
      // Get all students in the assigned class
      const students = await User.find({
        role: 'student',
        grade: assignment.grade,
        fcmToken: { $exists: true, $ne: null },
      }).select('_id name fcmToken');

      const studentIds = students.map(s => s._id);

      if (studentIds.length > 0) {
        await exports.sendToMultiple(
          studentIds,
          'Assignment Due Soon',
          `"${assignment.title}" for ${assignment.subject} is due in 24 hours. Don't forget to submit!`,
          { type: 'assignment_reminder', assignmentId: assignment._id.toString() }
        );
      }

      // Mark reminder as sent
      assignment.reminderSent = true;
      await assignment.save();
    }

    console.log(`Assignment reminders sent for ${dueAssignments.length} assignments`);
  } catch (error) {
    console.error('Assignment reminder job error:', error.message);
  }
});

/**
 * Cron: Clean up expired news and events daily
 * Runs at midnight
 */
cron.schedule('0 0 * * *', async () => {
  console.log('Running cleanup job...');
  try {
    const News = require('../models/News');
    const Event = require('../models/Event');

    // Deactivate expired news
    await News.updateMany(
      { expiresAt: { $lte: new Date() }, isActive: true },
      { isActive: false }
    );

    // Remove past events older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await Event.deleteMany({ date: { $lt: thirtyDaysAgo } });

    console.log('Cleanup job completed');
  } catch (error) {
    console.error('Cleanup job error:', error.message);
  }
});
