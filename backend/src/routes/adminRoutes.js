const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

const User = require('../models/User');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Mark = require('../models/Mark');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');

// ==================== DASHBOARD STATS ====================

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: 'student', isActive: true });
    const teachers = await User.countDocuments({ role: 'teacher', isActive: true });
    const workers = await User.countDocuments({ role: 'school_worker', isActive: true });
    const communityMembers = await User.countDocuments({ role: 'community_member', isActive: true });

    // Fee stats
    const totalExpected = await Fee.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalPaid = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const feesCollected = totalPaid[0]?.total || 0;
    const totalFeeAmount = totalExpected[0]?.total || 0;
    const pendingFees = Math.max(0, totalFeeAmount - feesCollected);

    // Grade distribution for pie chart
    const studentsByGrade = await User.aggregate([
      { $match: { role: 'student', isActive: true } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const studentsByPathway = await User.aggregate([
      { $match: { role: 'student', isActive: true, pathway: { $ne: null } } },
      { $group: { _id: '$pathway', count: { $sum: 1 } } },
    ]);

    // Recent activity
    const recentPayments = await Payment.find()
      .populate('studentId', 'name')
      .sort({ createdAt: -1 })
      .limit(8)
      .select('studentId amount method createdAt');

    const recentMarks = await Mark.find()
      .populate('studentId', 'name')
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('studentId subject score teacherId createdAt');

    const activity = [
      ...recentPayments.map(p => ({
        type: 'payment',
        description: `Payment of KES ${p.amount} received from ${p.studentId?.name || 'N/A'}`,
        timeAgo: timeAgo(p.createdAt),
      })),
      ...recentMarks.map(m => ({
        type: 'marks',
        description: `${m.teacherId?.name || 'Teacher'} submitted ${m.subject} marks for ${m.studentId?.name || 'N/A'} (${m.score}%)`,
        timeAgo: timeAgo(m.createdAt),
      })),
    ].sort((a, b) => new Date(b.timeAgo) - new Date(a.timeAgo)).slice(0, 10);

    res.json({
      success: true,
      stats: {
        totalStudents: students,
        totalTeachers: teachers,
        totalWorkers: workers,
        totalCommunity: communityMembers,
        totalUsers,
        feesCollected,
        pendingFees,
        totalExpected: totalFeeAmount,
        studentsByGrade: studentsByGrade.map(g => ({ name: g._id || 'Unassigned', value: g.count })),
        studentsByPathway,
        recentActivity: activity,
        academicYear: '2026',
        currentTerm: 'Term 1',
        activePathways: studentsByPathway.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return now.toISOString();
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return new Date(now - minutes * 60000).toISOString();
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return new Date(now - hours * 3600000).toISOString();
  const days = Math.floor(hours / 24);
  return new Date(now - days * 86400000).toISOString();
}

router.get('/activity/recent', async (req, res) => {
  try {
    const recentPayments = await Payment.find()
      .populate('studentId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('studentId amount method createdAt');

    const recentAssignments = await Assignment.find()
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title teacherId grade createdAt');

    const activity = [
      ...recentPayments.map(p => ({
        type: 'payment',
        description: `Payment of KES ${p.amount} received from ${p.studentId?.name || 'N/A'}`,
        date: p.createdAt,
      })),
      ...recentAssignments.map(a => ({
        type: 'assignment',
        description: `New assignment "${a.title}" created for Grade ${a.grade}`,
        date: a.createdAt,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

    res.json(activity);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/fees/collection', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const monthlyCollection = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = monthNames.map((name, i) => {
      const month = monthlyCollection.find(m => m._id === i + 1);
      return {
        month: name,
        collected: month ? month.total : 0,
        pending: month ? Math.max(0, (month.total * 0.2)) : 0,
        transactions: month ? month.count : 0,
      };
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/grades/distribution', async (req, res) => {
  try {
    const distribution = await Mark.aggregate([
      { $group: { _id: '$competencyLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const data = [
      { name: 'Beginning (B)', value: 0, color: '#ef4444' },
      { name: 'Approaching (A)', value: 0, color: '#f59e0b' },
      { name: 'Meeting (M)', value: 0, color: '#10b981' },
      { name: 'Exceeding (E)', value: 0, color: '#3b82f6' },
    ];

    distribution.forEach(d => {
      const idx = data.findIndex(item => item.name.includes(`(${d._id})`));
      if (idx !== -1) data[idx].value = d.count;
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/attendance/trend', async (req, res) => {
  try {
    const attendanceData = await Attendance.aggregate([
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          present: { $sum: '$present' },
          absent: { $sum: '$absent' },
          total: { $sum: { $add: ['$present', '$absent'] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = attendanceData.map(d => ({
      month: monthNames[d._id.month - 1],
      present: d.present,
      absent: d.absent,
      rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== ADMIN FEES ====================

router.get('/fees/stats', async (req, res) => {
  try {
    const totalExpected = await Fee.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalPaid = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const studentsWithBalance = await Fee.countDocuments({ balance: { $gt: 0 } });
    const studentsCleared = await Fee.countDocuments({ balance: { $lte: 0 } });

    const byGrade = await Fee.aggregate([
      { $group: { _id: '$grade', total: { $sum: '$totalAmount' }, balance: { $sum: '$balance' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalExpected: totalExpected[0]?.total || 0,
      totalPaid: totalPaid[0]?.total || 0,
      studentsWithBalance,
      studentsCleared,
      byGrade: byGrade.map(g => ({
        grade: g._id || 'N/A',
        expected: g.total,
        balance: g.balance,
        students: g.count,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/fees/students', async (req, res) => {
  try {
    const { page = 1, limit = 10, grade, search, balanceStatus } = req.query;
    const query = { role: 'student' };
    if (grade && grade !== 'all') query.grade = grade;

    const students = await User.find(query)
      .select('name email grade admissionNumber')
      .skip((page - 1) * limit)
      .limit(limit * 1);

    const studentsWithFees = await Promise.all(
      students.map(async (s) => {
        const fee = await Fee.findOne({ studentId: s._id }).sort({ year: -1, term: -1 });
        return {
          _id: s._id,
          name: s.name,
          email: s.email,
          grade: s.grade,
          admissionNumber: s.admissionNumber,
          balance: fee?.balance || 0,
          totalAmount: fee?.totalAmount || 0,
          paidAmount: fee?.paidAmount || 0,
        };
      })
    );

    const filtered = balanceStatus !== 'all'
      ? studentsWithFees.filter(s => balanceStatus === 'cleared' ? s.balance <= 0 : s.balance > 0)
      : studentsWithFees;

    const total = await User.countDocuments(query);

    res.json({
      students: filtered,
      total: total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/fees/structures', async (req, res) => {
  try {
    const structures = await Fee.distinct('grade')
      .then(async () => {
        return await Fee.aggregate([
          { $group: { _id: { grade: '$grade', term: '$term', year: '$year' }, amount: { $first: '$totalAmount' }, count: { $sum: 1 } } },
          { $sort: { '_id.year': -1, '_id.term': 1, '_id.grade': 1 } },
        ]);
      });

    res.json(structures.map(s => ({
      grade: s._id.grade || 'N/A',
      term: s._id.term || 'N/A',
      year: s._id.year,
      amount: s.amount,
      studentCount: s.count,
    })));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fees/structures', async (req, res) => {
  try {
    const { grade, term, year, amount, description } = req.body;
    const students = await User.find({ role: 'student', grade });

    const fees = students.map(s => ({
      studentId: s._id,
      grade,
      term,
      year,
      totalAmount: amount,
      balance: amount,
      paidAmount: 0,
      description,
    }));

    await Fee.insertMany(fees);
    res.json({ success: true, message: `${fees.length} fee records created` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fees/payments', async (req, res) => {
  try {
    const { studentId, amount, reference, date } = req.body;
    const payment = await Payment.create({
      studentId,
      amount,
      method: 'manual',
      reference: reference || `MAN-${Date.now()}`,
      paymentDate: date || new Date(),
    });

    const fee = await Fee.findOne({ studentId }).sort({ year: -1, term: -1 });
    if (fee) {
      fee.balance -= amount;
      fee.paidAmount += amount;
      await fee.save();
    }

    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== ADMIN MARKS ====================

router.get('/marks', async (req, res) => {
  try {
    const { grade, term, year } = req.query;
    const query = {};
    if (grade) query.grade = grade;
    if (term) query.term = term;
    if (year) query.year = year;

    const marks = await Mark.find(query)
      .populate('studentId', 'name admissionNumber')
      .populate('teacherId', 'name')
      .limit(100)
      .sort({ createdAt: -1 });

    res.json({ marks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/marks/stats', async (req, res) => {
  try {
    const { term, year } = req.query;
    const query = {};
    if (term) query.term = term;
    if (year) query.year = year;

    const totalMarks = await Mark.countDocuments(query);
    const approved = await Mark.countDocuments({ ...query, approved: true });
    const pending = await Mark.countDocuments({ ...query, approved: false });

    res.json({ totalMarks, approved, pending });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/marks/performance', async (req, res) => {
  try {
    const { term, year } = req.query;
    const query = {};
    if (term) query.term = term;
    if (year) query.year = year;

    const byGrade = await Mark.aggregate([
      { $match: query },
      { $group: { _id: '$grade', total: { $sum: 1 }, avgScore: { $avg: '$score' } } },
      { $sort: { _id: 1 } },
    ]);

    const bySubject = await Mark.aggregate([
      { $match: query },
      { $group: { _id: '$subject', total: { $sum: 1 }, avgScore: { $avg: '$score' } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ byGrade, bySubject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/marks/:id/approve', async (req, res) => {
  try {
    const mark = await Mark.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    res.json({ success: true, mark });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/marks/:id/reject', async (req, res) => {
  try {
    const mark = await Mark.findByIdAndUpdate(req.params.id, { approved: false }, { new: true });
    res.json({ success: true, mark });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== ADMIN USERS ====================

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit * 1);

    const total = await User.countDocuments(query);

    res.json({ users, total, totalPages: Math.ceil(total / limit), pages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, phone, password, role, admissionNumber, grade, pathway, assignedClass, assignedSubjects } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

    const user = await User.create({ name, email, phone, password, role, admissionNumber, grade, pathway, assignedClass, assignedSubjects });
    res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { password, ...data } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
