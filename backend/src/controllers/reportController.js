/**
 * Report Controller
 * Generates PDF report cards with CBC format, positions, means, and auto-remarks
 */
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Mark = require('../models/Mark');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Timetable = require('../models/Timetable');
const SchoolDetails = require('../models/SchoolDetails');

/**
 * Calculate positions for all students in a class
 */
const calculatePositions = async (grade, term, year) => {
  const students = await User.find({ role: 'student', grade }).select('_id name');
  const positions = [];

  for (const student of students) {
    const marks = await Mark.find({ studentId: student._id, grade, term, year });
    if (marks.length === 0) continue;

    const totalScore = marks.reduce((sum, m) => sum + m.score, 0);
    const mean = marks.length > 0 ? (totalScore / marks.length) : 0;

    positions.push({ studentId: student._id, name: student.name, totalScore, mean, marksCount: marks.length });
  }

  // Sort by mean descending
  positions.sort((a, b) => b.mean - a.mean);

  // Assign positions
  positions.forEach((p, i) => { p.position = i + 1; });

  return positions;
};

/**
 * Generate auto remark based on performance
 */
const generateRemark = (mean, position, totalStudents) => {
  if (mean >= 80) return 'Outstanding performance. Keep up the excellent work!';
  if (mean >= 70) return 'Very good performance. Maintain this momentum.';
  if (mean >= 60) return 'Good performance. There is room for improvement.';
  if (mean >= 50) return 'Satisfactory. Needs to put in more effort.';
  if (mean >= 40) return 'Below average. Requires dedication and improvement.';
  return 'Poor performance. Needs serious commitment and support.';
};

/**
 * Get competency level from score
 */
const getCompetency = (score) => {
  if (score >= 80) return { level: 'E', label: 'Exceeding' };
  if (score >= 65) return { level: 'M', label: 'Meeting' };
  if (score >= 50) return { level: 'A', label: 'Approaching' };
  return { level: 'B', label: 'Beginning' };
};

/**
 * @desc    Generate student PDF report card
 * @route   GET /api/reports/student/:studentId
 * @access  Private (Student own, Teacher/Admin any)
 */
const generateStudentReport = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { term, year } = req.query;

    if (!term || !year) {
      return res.status(400).json({ success: false, message: 'Term and year are required' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Authorization check
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const school = await SchoolDetails.findOne();
    const marks = await Mark.find({ studentId, grade: student.grade, term: parseInt(term), year: parseInt(year) })
      .sort({ subject: 1 });

    if (marks.length === 0) {
      return res.status(404).json({ success: false, message: 'No marks found for this term' });
    }

    // Pre-calculate subject positions
    const subjectPositions = {};
    for (const mark of marks) {
      const subjectMarks = await Mark.find({ grade: student.grade, term: parseInt(term), year: parseInt(year), subject: mark.subject });
      subjectMarks.sort((a, b) => b.score - a.score);
      const pos = subjectMarks.findIndex(m => m.studentId.toString() === studentId) + 1;
      subjectPositions[mark.subject] = { position: pos, total: subjectMarks.length };
    }

    const positions = await calculatePositions(student.grade, parseInt(term), parseInt(year));
    const studentPosition = positions.find(p => p.studentId.toString() === studentId);
    const totalStudents = positions.length;

    // Calculate mean and totals
    const totalScore = marks.reduce((sum, m) => sum + m.score, 0);
    const mean = marks.length > 0 ? (totalScore / marks.length).toFixed(2) : 0;

    // Fee info
    const fee = await Fee.findOne({ studentId, term: parseInt(term), year: parseInt(year) });

    // Find class teacher (first teacher assigned to this grade)
    const classTeacher = await User.findOne({ role: 'teacher', grade: student.grade }).select('name');

    // Create PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${student.name.replace(/\s+/g, '_')}_T${term}_${year}.pdf`);
    doc.pipe(res);

    // Header with school info
    const drawHeader = () => {
      if (school?.logo) {
        try { doc.image(school.logo, 40, 30, { width: 60 }); } catch (e) {}
      }
      doc.font('Helvetica-Bold').fontSize(18).text(school?.name || 'CBC Senior School', 110, 35, { align: 'center' });
      doc.font('Helvetica').fontSize(10).text(school?.motto || 'Excellence in Education', 110, 55, { align: 'center' });
      doc.fontSize(9).text(school?.location?.address || '', 110, 68, { align: 'center' });
      doc.moveTo(40, 85).lineTo(555, 85).stroke();
    };

    drawHeader();

    // Student details
    doc.font('Helvetica-Bold').fontSize(12).text('STUDENT REPORT CARD', 40, 100);
    doc.font('Helvetica').fontSize(10);
    const studentDetails = [
      [`Name: ${student.name}`, `Admission No: ${student.admissionNumber || 'N/A'}`],
      [`Grade: ${student.grade}`, `Term: ${term}, ${year}`],
      [`Pathway: ${student.pathway || 'N/A'}`, `Date Generated: ${new Date().toLocaleDateString('en-KE')}`],
      [`Total Students in Class: ${totalStudents}`, `Position: ${studentPosition?.position || 'N/A'} out of ${totalStudents}`],
    ];
    studentDetails.forEach((row, i) => {
      doc.text(row[0], 40, 118 + i * 16);
      doc.text(row[1], 310, 118 + i * 16);
    });

    // Marks table
    const tableTop = 180;
    doc.font('Helvetica-Bold').fontSize(10);
    const colWidths = { subject: 140, score: 70, competency: 100, position: 70, remark: 130 };
    let x = 40;
    const headers = ['Subject', 'Score', 'Competency', 'Position', 'Remark'];
    const cols = [colWidths.subject, colWidths.score, colWidths.competency, colWidths.position, colWidths.remark];

    // Table header background
    doc.rect(x, tableTop, 515, 20).fill('#16a34a');
    doc.fillColor('white');
    cols.reduce((cx, w, i) => {
      doc.font('Helvetica-Bold').fontSize(9).text(headers[i], cx + 4, tableTop + 5, { width: w - 8 });
      return cx + w;
    }, x);
    doc.fillColor('black');

    // Table rows
    let y = tableTop + 20;
    marks.forEach((mark, i) => {
      const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(x, y, 515, 18).fill(bgColor);
      doc.fillColor('black');

      const subPos = subjectPositions[mark.subject];
      const comp = getCompetency(mark.score);
      const row = [mark.subject, mark.score.toString(), `${comp.level} - ${comp.label}`, `${subPos?.position || '-'}/${subPos?.total || '-'}`, mark.teacherRemark || ''];

      doc.font('Helvetica').fontSize(9);
      cols.reduce((cx, w, ci) => {
        doc.text(row[ci] || '', cx + 3, y + 3, { width: w - 6, ellipsis: true });
        return cx + w;
      }, x);

      doc.moveTo(x, y + 18).lineTo(x + 515, y + 18).strokeColor('#e5e7eb').lineWidth(0.5).stroke().strokeColor('black').lineWidth(1);
      y += 18;
    });

    // Totals row
    doc.rect(x, y, 515, 18).fill('#dcfce7');
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('TOTAL / MEAN', x + 4, y + 4, { width: colWidths.subject });
    doc.text(totalScore.toString(), x + colWidths.subject + 4, y + 4, { width: colWidths.score });
    doc.text(mean.toString(), x + colWidths.subject + colWidths.score + 4, y + 4, { width: colWidths.competency });
    doc.text(`${studentPosition?.position || '-'}/${totalStudents}`, x + colWidths.subject + colWidths.score + colWidths.competency + 4, y + 4, { width: colWidths.position });

    y += 30;

    // Remarks
    doc.font('Helvetica-Bold').fontSize(11).text('REMARKS', 40, y);
    y += 18;
    const autoRemark = generateRemark(parseFloat(mean), studentPosition?.position, totalStudents);
    doc.font('Helvetica').fontSize(10).text(`Class Teacher's Remark: ${classTeacher ? classTeacher.name : 'N/A'}`, 40, y);
    y += 16;
    doc.text(`Comment: ${autoRemark}`, 40, y);
    y += 24;
    doc.text(`Principal's Remark: ${school?.principal?.name || 'Principal'}`, 40, y);
    if (school?.principal?.message) {
      y += 16;
      doc.font('Helvetica-Oblique').fontSize(9).text(`"${school.principal.message}"`, 40, y);
    }

    // Fee summary
    y += 30;
    doc.font('Helvetica-Bold').fontSize(11).text('FEE SUMMARY', 40, y);
    y += 18;
    if (fee) {
      doc.font('Helvetica').fontSize(10);
      doc.text(`Total Fee: KES ${fee.totalDue.toLocaleString()}`, 40, y); y += 16;
      doc.text(`Amount Paid: KES ${fee.amountPaid.toLocaleString()}`, 40, y); y += 16;
      doc.text(`Balance: KES ${fee.balance.toLocaleString()}`, 40, y); y += 16;
      doc.text(`Status: ${fee.isFullyPaid ? 'CLEARED' : 'OUTSTANDING'}`, 40, y);
    } else {
      doc.font('Helvetica').fontSize(10).text('No fee records for this term.', 40, y);
    }

    // Footer
    doc.font('Helvetica-Oblique').fontSize(8).text(
      `Generated on ${new Date().toLocaleString('en-KE')} | CBC Senior School Management System`,
      40, 740, { align: 'center' }
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate class position report (for admin/teacher)
 * @route   GET /api/reports/class/:grade
 * @access  Private (Teacher/Admin)
 */
const generateClassReport = async (req, res, next) => {
  try {
    const { grade } = req.params;
    const { term, year } = req.query;

    if (!term || !year) {
      return res.status(400).json({ success: false, message: 'Term and year are required' });
    }

    const school = await SchoolDetails.findOne();
    const positions = await calculatePositions(grade, parseInt(term), parseInt(year));

    if (positions.length === 0) {
      return res.status(404).json({ success: false, message: 'No marks found for this class' });
    }

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=class_report_Grade_${grade}_T${term}_${year}.pdf`);
    doc.pipe(res);

    // Header
    doc.font('Helvetica-Bold').fontSize(18).text(school?.name || 'CBC Senior School', 40, 40);
    doc.font('Helvetica').fontSize(12).text(`Grade ${grade} - Class Position Report`, 40, 65);
    doc.fontSize(10).text(`Term ${term}, ${year} | Generated: ${new Date().toLocaleDateString('en-KE')}`, 40, 82);
    doc.moveTo(40, 95).lineTo(555, 95).stroke();

    // Table
    const tableTop = 110;
    doc.rect(40, tableTop, 515, 20).fill('#16a34a');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9);
    ['Position', 'Student Name', 'Mean Score', 'Subjects', 'Competency', 'Remark'].forEach((h, i) => {
      const xs = [44, 104, 224, 294, 354, 404];
      doc.text(h, xs[i], tableTop + 5);
    });
    doc.fillColor('black');

    let y = tableTop + 20;
    positions.forEach((p, i) => {
      if (i % 2 === 0) { doc.rect(40, y, 515, 18).fill('#f9fafb'); doc.fillColor('black'); }

      const comp = getCompetency(p.mean);
      const remark = generateRemark(p.mean, p.position, positions.length);

      doc.font('Helvetica').fontSize(8);
      doc.text(`${p.position}`, 44, y + 4);
      doc.text(p.name, 104, y + 4, { width: 115, ellipsis: true });
      doc.text(p.mean.toFixed(2), 224, y + 4);
      doc.text(`${p.marksCount}`, 294, y + 4);
      doc.text(`${comp.level}`, 354, y + 4);
      doc.text(remark.substring(0, 40), 404, y + 4, { width: 145, ellipsis: true });

      doc.moveTo(40, y + 18).lineTo(555, y + 18).strokeColor('#e5e7eb').lineWidth(0.5).stroke().strokeColor('black').lineWidth(1);
      y += 18;
    });

    // Summary
    y += 15;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total Students: ${positions.length}`, 40, y); y += 16;
    const classMean = positions.reduce((s, p) => s + p.mean, 0) / positions.length;
    doc.text(`Class Mean: ${classMean.toFixed(2)}`, 40, y);

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student report data (JSON, for frontend display)
 * @route   GET /api/reports/data/:studentId
 * @access  Private
 */
const getStudentReportData = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { term, year } = req.query;

    if (!term || !year) {
      return res.status(400).json({ success: false, message: 'Term and year are required' });
    }

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const marks = await Mark.find({ studentId, grade: student.grade, term: parseInt(term), year: parseInt(year) })
      .sort({ subject: 1 });

    const positions = await calculatePositions(student.grade, parseInt(term), parseInt(year));
    const studentPosition = positions.find(p => p.studentId.toString() === studentId);

    const totalScore = marks.reduce((sum, m) => sum + m.score, 0);
    const mean = marks.length > 0 ? (totalScore / marks.length).toFixed(2) : 0;

    const marksWithPositions = marks.map(mark => {
      const subjectMarks = positions
        .map(p => p.marks?.find(m => m.subject === mark.subject)?.score)
        .filter(Boolean);
      // Simplified: use all marks for subject position
      return {
        ...mark.toObject(),
        competency: getCompetency(mark.score),
      };
    });

    const fee = await Fee.findOne({ studentId, term: parseInt(term), year: parseInt(year) });
    const classTeacher = await User.findOne({ role: 'teacher', grade: student.grade }).select('name');
    const school = await SchoolDetails.findOne().select('name motto logo principal');

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          admissionNumber: student.admissionNumber,
          grade: student.grade,
          pathway: student.pathway,
        },
        term: parseInt(term),
        year: parseInt(year),
        marks: marksWithPositions,
        totalScore,
        mean,
        position: studentPosition?.position,
        totalStudents: positions.length,
        remark: generateRemark(parseFloat(mean), studentPosition?.position, positions.length),
        fee: fee ? { totalDue: fee.totalDue, amountPaid: fee.amountPaid, balance: fee.balance, isFullyPaid: fee.isFullyPaid } : null,
        classTeacher: classTeacher?.name,
        school: {
          name: school?.name,
          motto: school?.motto,
          logo: school?.logo,
          principalName: school?.principal?.name,
          principalMessage: school?.principal?.message,
        },
        dateGenerated: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate class fee report PDF
 * @route   GET /api/reports/fees/:grade
 * @access  Private (Admin)
 */
const generateFeeReport = async (req, res, next) => {
  try {
    const { grade } = req.params;
    const { term, year } = req.query;

    if (!term || !year) {
      return res.status(400).json({ success: false, message: 'Term and year are required' });
    }

    const school = await SchoolDetails.findOne();
    const gradeValue = grade.startsWith('Grade ') ? grade.replace('Grade ', '') : grade;

    const students = await User.find({ role: 'student', grade: gradeValue })
      .select('name admissionNumber')
      .sort({ name: 1 });

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'No students found for this class' });
    }

    const fees = await Fee.find({ grade: gradeValue, term: parseInt(term), year: parseInt(year) });

    // Create PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fee_report_Grade_${gradeValue}_T${term}_${year}.pdf`);
    doc.pipe(res);

    // Header
    if (school?.logo) {
      try { doc.image(school.logo, 40, 30, { width: 60 }); } catch (e) {}
    }
    doc.font('Helvetica-Bold').fontSize(18).text(school?.name || 'CBC Senior School', 110, 35, { align: 'center' });
    doc.font('Helvetica').fontSize(10).text(school?.motto || 'Excellence in Education', 110, 55, { align: 'center' });
    doc.moveTo(40, 85).lineTo(555, 85).stroke();

    // Report title
    doc.font('Helvetica-Bold').fontSize(14).text('FEE STATUS REPORT', 40, 100);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Class: Grade ${gradeValue}`, 40, 122);
    doc.text(`Term: ${term}, ${year}`, 250, 122);
    doc.text(`Date Generated: ${new Date().toLocaleDateString('en-KE')}`, 410, 122);

    // Table
    const tableTop = 145;
    doc.font('Helvetica-Bold').fontSize(9);
    const colWidths = { no: 30, name: 140, adm: 100, total: 80, paid: 80, balance: 90, status: 80 };
    let x = 40;
    const headers = ['#', 'Student Name', 'Adm. No.', 'Total Fee', 'Paid', 'Balance', 'Status'];
    const cols = [colWidths.no, colWidths.name, colWidths.adm, colWidths.total, colWidths.paid, colWidths.balance, colWidths.status];

    // Table header background
    doc.rect(x, tableTop, 600, 18).fill('#16a34a');
    doc.fillColor('white');
    cols.reduce((cx, w, i) => {
      doc.font('Helvetica-Bold').fontSize(8).text(headers[i], cx + 2, tableTop + 4, { width: w - 4 });
      return cx + w;
    }, x);
    doc.fillColor('black');

    // Build student fee map
    const feeMap = {};
    fees.forEach(f => { feeMap[f.studentId.toString()] = f; });

    let y = tableTop + 18;
    let totalCollected = 0;
    let totalExpected = 0;
    let totalBalance = 0;

    students.forEach((s, i) => {
      if (y > 720) {
        doc.addPage();
        y = 40;
        doc.rect(x, y, 600, 18).fill('#16a34a');
        doc.fillColor('white');
        cols.reduce((cx, w, ci) => {
          doc.font('Helvetica-Bold').fontSize(8).text(headers[ci], cx + 2, y + 4, { width: w - 4 });
          return cx + w;
        }, x);
        doc.fillColor('black');
        y += 18;
      }

      const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(x, y, 600, 16).fill(bgColor);
      doc.fillColor('black');

      const fee = feeMap[s._id.toString()];
      const paid = fee?.amountPaid || 0;
      const totalDue = fee?.totalDue || 0;
      const balance = fee?.balance || totalDue;
      const status = balance <= 0 ? 'CLEARED' : paid > 0 ? 'PARTIAL' : 'UNPAID';

      totalCollected += paid;
      totalExpected += totalDue;
      totalBalance += balance;

      doc.font('Helvetica').fontSize(8);
      doc.text(`${i + 1}`, x + 2, y + 3, { width: colWidths.no });
      doc.text(s.name, x + colWidths.no + 2, y + 3, { width: colWidths.name - 4, ellipsis: true });
      doc.text(s.admissionNumber || 'N/A', x + colWidths.no + colWidths.name + 2, y + 3, { width: colWidths.adm - 4 });
      doc.text(`KES ${totalDue.toLocaleString()}`, x + colWidths.no + colWidths.name + colWidths.adm + 2, y + 3, { width: colWidths.total - 4 });
      doc.text(`KES ${paid.toLocaleString()}`, x + colWidths.no + colWidths.name + colWidths.adm + colWidths.total + 2, y + 3, { width: colWidths.paid - 4 });
      doc.text(`KES ${balance.toLocaleString()}`, x + colWidths.no + colWidths.name + colWidths.adm + colWidths.total + colWidths.paid + 2, y + 3, { width: colWidths.balance - 4 });

      // Status color
      const statusColor = status === 'CLEARED' ? '#16a34a' : status === 'PARTIAL' ? '#f59e0b' : '#ef4444';
      doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(8).text(
        status,
        x + colWidths.no + colWidths.name + colWidths.adm + colWidths.total + colWidths.paid + colWidths.balance + 2,
        y + 3,
        { width: colWidths.status - 4 }
      );
      doc.fillColor('black');

      doc.moveTo(x, y + 16).lineTo(x + 600, y + 16).strokeColor('#e5e7eb').lineWidth(0.5).stroke().strokeColor('black').lineWidth(1);
      y += 16;
    });

    // Totals row
    y += 8;
    doc.rect(x, y, 600, 18).fill('#dcfce7');
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9);
    doc.text('TOTALS', x + 2, y + 4, { width: colWidths.no + colWidths.name + colWidths.adm });
    doc.text(`KES ${totalExpected.toLocaleString()}`, x + colWidths.no + colWidths.name + colWidths.adm + 2, y + 4, { width: colWidths.total - 4 });
    doc.text(`KES ${totalCollected.toLocaleString()}`, x + colWidths.no + colWidths.name + colWidths.adm + colWidths.total + 2, y + 4, { width: colWidths.paid - 4 });
    doc.text(`KES ${totalBalance.toLocaleString()}`, x + colWidths.no + colWidths.name + colWidths.adm + colWidths.total + colWidths.paid + 2, y + 4, { width: colWidths.balance - 4 });

    y += 28;
    doc.font('Helvetica').fontSize(10);
    doc.text(`Total Students: ${students.length}`, 40, y);
    doc.text(`Collection Rate: ${totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : 0}%`, 300, y);

    // Footer
    doc.font('Helvetica-Oblique').fontSize(8).text(
      `Generated on ${new Date().toLocaleString('en-KE')} | CBC Senior School Management System`,
      40, 760, { align: 'center' }
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate class marks report PDF
 * @route   GET /api/reports/marks/:grade
 * @access  Private (Admin/Teacher)
 */
const generateMarksReport = async (req, res, next) => {
  try {
    const { grade } = req.params;
    const { term, year, subject } = req.query;

    if (!term || !year) {
      return res.status(400).json({ success: false, message: 'Term and year are required' });
    }

    const school = await SchoolDetails.findOne();
    const gradeValue = grade.startsWith('Grade ') ? grade.replace('Grade ', '') : grade;

    const students = await User.find({ role: 'student', grade: gradeValue })
      .select('name admissionNumber')
      .sort({ name: 1 });

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'No students found for this class' });
    }

    const markQuery = { grade: gradeValue, term: parseInt(term), year: parseInt(year) };
    if (subject && subject !== 'all') markQuery.subject = subject;

    const marks = await Mark.find(markQuery)
      .populate('studentId', 'name admissionNumber');

    // Build student -> marks map
    const studentMarksMap = {};
    marks.forEach(m => {
      const sid = m.studentId?._id?.toString();
      if (!sid) return;
      if (!studentMarksMap[sid]) studentMarksMap[sid] = [];
      studentMarksMap[sid].push(m);
    });

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=marks_report_Grade_${gradeValue}_T${term}_${year}.pdf`);
    doc.pipe(res);

    // Header with logo
    if (school?.logo) {
      try { doc.image(school.logo, 40, 30, { width: 60 }); } catch (e) {}
    }
    doc.font('Helvetica-Bold').fontSize(18).text(school?.name || 'CBC Senior School', 110, 35, { align: 'center' });
    doc.font('Helvetica').fontSize(10).text(school?.motto || 'Excellence in Education', 110, 55, { align: 'center' });
    doc.moveTo(40, 85).lineTo(555, 85).stroke();

    // Report title
    doc.font('Helvetica-Bold').fontSize(14).text('MARKS REPORT', 40, 100);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Class: Grade ${gradeValue}`, 40, 122);
    doc.text(`Term: ${term}, ${year}`, 250, 122);
    if (subject && subject !== 'all') doc.text(`Subject: ${subject}`, 410, 122);
    doc.text(`Date: ${new Date().toLocaleDateString('en-KE')}`, 410, 122);

    // Group marks by subject for table columns
    const allSubjects = [...new Set(marks.map(m => m.subject).sort())];

    // Table header
    const tableTop = 145;
    doc.font('Helvetica-Bold').fontSize(8);
    const baseCols = [30, 130, 80]; // No, Name, Adm No
    const subjectWidth = allSubjects.length > 0 ? Math.floor((555 - baseCols.reduce((a, b) => a + b, 0)) / allSubjects.length) : 80;
    const cols = [...baseCols, ...allSubjects.map(() => subjectWidth)];
    const headers = ['#', 'Student Name', 'Adm. No.', ...allSubjects];

    let x = 40;
    doc.rect(x, tableTop, 515, 18).fill('#16a34a');
    doc.fillColor('white');
    cols.reduce((cx, w, i) => {
      doc.font('Helvetica-Bold').fontSize(7).text(headers[i], cx + 2, tableTop + 5, { width: w - 4 });
      return cx + w;
    }, x);
    doc.fillColor('black');

    let y = tableTop + 18;
    let grandTotal = 0;
    let grandCount = 0;

    students.forEach((s, i) => {
      if (y > 730) {
        doc.addPage();
        y = 40;
        doc.rect(x, y, 515, 18).fill('#16a34a');
        doc.fillColor('white');
        cols.reduce((cx, w, ci) => {
          doc.font('Helvetica-Bold').fontSize(7).text(headers[ci], cx + 2, y + 5, { width: w - 4 });
          return cx + w;
        }, x);
        doc.fillColor('black');
        y += 18;
      }

      const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(x, y, 515, 15).fill(bgColor);
      doc.fillColor('black');

      const sMarks = studentMarksMap[s._id.toString()] || [];
      const markBySubject = {};
      sMarks.forEach(m => { markBySubject[m.subject] = m.score; });

      doc.font('Helvetica').fontSize(7);
      doc.text(`${i + 1}`, x + 2, y + 3, { width: baseCols[0] - 4 });
      doc.text(s.name, x + baseCols[0] + 2, y + 3, { width: baseCols[1] - 4, ellipsis: true });
      doc.text(s.admissionNumber || 'N/A', x + baseCols[0] + baseCols[1] + 2, y + 3, { width: baseCols[2] - 4 });

      let offsetX = baseCols[0] + baseCols[1] + baseCols[2];
      allSubjects.forEach(sub => {
        const score = markBySubject[sub];
        if (score !== undefined) {
          grandTotal += score;
          grandCount++;
        }
        doc.text(score !== undefined ? score.toString() : '-', x + offsetX + 2, y + 3, { width: subjectWidth - 4 });
        offsetX += subjectWidth;
      });

      doc.moveTo(x, y + 15).lineTo(x + 515, y + 15).strokeColor('#e5e7eb').lineWidth(0.5).stroke().strokeColor('black').lineWidth(1);
      y += 15;
    });

    // Summary
    y += 10;
    const classMean = grandCount > 0 ? (grandTotal / grandCount).toFixed(1) : 0;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total Students: ${students.length}`, 40, y);
    doc.text(`Total Marks Entries: ${marks.length}`, 250, y);
    doc.text(`Class Mean: ${classMean}%`, 430, y);

    // Footer
    doc.font('Helvetica-Oblique').fontSize(8).text(
      `Generated on ${new Date().toLocaleString('en-KE')} | CBC Senior School Management System`,
      40, 820, { align: 'center' }
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate payment report PDF
 * @route   GET /api/reports/payments
 * @access  Private (Admin)
 */
const generatePaymentReport = async (req, res, next) => {
  try {
    const { status, term, year, startDate, endDate } = req.query;

    const school = await SchoolDetails.findOne();

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (term) query.term = parseInt(term);
    if (year) query.year = parseInt(year);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('studentId', 'name admissionNumber grade')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(500);

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payment_report_${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    // Header with logo
    if (school?.logo) {
      try { doc.image(school.logo, 40, 30, { width: 60 }); } catch (e) {}
    }
    doc.font('Helvetica-Bold').fontSize(18).text(school?.name || 'CBC Senior School', 110, 35, { align: 'center' });
    doc.font('Helvetica').fontSize(10).text(school?.motto || 'Excellence in Education', 110, 55, { align: 'center' });
    doc.moveTo(40, 85).lineTo(555, 85).stroke();

    // Report title
    doc.font('Helvetica-Bold').fontSize(14).text('PAYMENT REPORT', 40, 100);
    doc.font('Helvetica').fontSize(10);
    const filters = [];
    if (term) filters.push(`Term ${term}`);
    if (year) filters.push(`Year ${year}`);
    if (status && status !== 'all') filters.push(`Status: ${status.toUpperCase()}`);
    doc.text(`Filters: ${filters.length > 0 ? filters.join(' | ') : 'All Payments'}`, 40, 122);
    doc.text(`Date Generated: ${new Date().toLocaleDateString('en-KE')}`, 400, 122);

    // Table
    const tableTop = 140;
    doc.font('Helvetica-Bold').fontSize(8);
    const colWidths = { no: 25, student: 120, adm: 80, method: 55, transId: 80, amount: 70, term: 45, date: 65, status: 60, recorded: 55 };
    const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
    let x = 30;
    const headers = ['#', 'Student', 'Adm. No.', 'Method', 'Trans. ID', 'Amount', 'T/Y', 'Date', 'Status', 'By'];
    const cols = Object.values(colWidths);

    doc.rect(x, tableTop, totalWidth, 18).fill('#16a34a');
    doc.fillColor('white');
    cols.reduce((cx, w, i) => {
      doc.font('Helvetica-Bold').fontSize(7).text(headers[i], cx + 2, tableTop + 5, { width: w - 4 });
      return cx + w;
    }, x);
    doc.fillColor('black');

    let y = tableTop + 18;
    let totalAmount = 0;
    let completedTotal = 0;
    let pendingTotal = 0;

    payments.forEach((p, i) => {
      if (y > 740) {
        doc.addPage();
        y = 40;
        doc.rect(x, y, totalWidth, 18).fill('#16a34a');
        doc.fillColor('white');
        cols.reduce((cx, w, ci) => {
          doc.font('Helvetica-Bold').fontSize(7).text(headers[ci], cx + 2, y + 5, { width: w - 4 });
          return cx + w;
        }, x);
        doc.fillColor('black');
        y += 18;
      }

      const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(x, y, totalWidth, 14).fill(bgColor);
      doc.fillColor('black');

      const studentName = p.studentId?.name || 'N/A';
      const admNo = p.studentId?.admissionNumber || 'N/A';
      const method = p.paymentMethod?.toUpperCase() || '-';
      const transId = p.transactionId || '-';
      const amount = p.amount || 0;
      const termYear = p.term ? `${p.term}/${p.year || '-'}` : '-';
      const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';
      const status = p.status?.toUpperCase() || 'PENDING';
      const recordedBy = p.recordedBy?.name || 'System';

      totalAmount += amount;
      if (p.status === 'completed') completedTotal += amount;
      if (p.status === 'pending') pendingTotal += amount;

      doc.font('Helvetica').fontSize(7);
      let offsetX = x;
      doc.text(`${i + 1}`, offsetX + 1, y + 3, { width: colWidths.no - 2 });
      offsetX += colWidths.no;
      doc.text(studentName, offsetX + 1, y + 3, { width: colWidths.student - 2, ellipsis: true });
      offsetX += colWidths.student;
      doc.text(admNo, offsetX + 1, y + 3, { width: colWidths.adm - 2 });
      offsetX += colWidths.adm;
      doc.text(method, offsetX + 1, y + 3, { width: colWidths.method - 2 });
      offsetX += colWidths.method;
      doc.text(transId.substring(0, 12), offsetX + 1, y + 3, { width: colWidths.transId - 2 });
      offsetX += colWidths.transId;
      doc.text(`KES ${amount.toLocaleString()}`, offsetX + 1, y + 3, { width: colWidths.amount - 2 });
      offsetX += colWidths.amount;
      doc.text(termYear, offsetX + 1, y + 3, { width: colWidths.term - 2 });
      offsetX += colWidths.term;
      doc.text(date, offsetX + 1, y + 3, { width: colWidths.date - 2 });
      offsetX += colWidths.date;

      // Status color
      const statusColor = status === 'COMPLETED' ? '#16a34a' : status === 'PENDING' ? '#f59e0b' : '#ef4444';
      doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(6).text(status, offsetX + 1, y + 3, { width: colWidths.status - 2 });
      doc.fillColor('black');
      offsetX += colWidths.status;
      doc.font('Helvetica').fontSize(6).text(recordedBy.substring(0, 10), offsetX + 1, y + 3, { width: colWidths.recorded - 2 });

      doc.moveTo(x, y + 14).lineTo(x + totalWidth, y + 14).strokeColor('#e5e7eb').lineWidth(0.5).stroke().strokeColor('black').lineWidth(1);
      y += 14;
    });

    // Summary section
    y += 10;
    if (y > 720) { doc.addPage(); y = 40; }

    doc.rect(x, y, totalWidth, 35).fill('#f0fdf4');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#16a34a');
    doc.text('PAYMENT SUMMARY', x + 5, y + 5);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Total Payments: ${payments.length}`, x + 5, y + 18);
    doc.text(`Total Amount: KES ${totalAmount.toLocaleString()}`, x + 160, y + 18);
    doc.text(`Completed: KES ${completedTotal.toLocaleString()}`, x + 5, y + 28);
    doc.text(`Pending: KES ${pendingTotal.toLocaleString()}`, x + 160, y + 28);
    doc.text(`Collection Rate: ${totalAmount > 0 ? ((completedTotal / totalAmount) * 100).toFixed(1) : 0}%`, x + 320, y + 28);

    // Footer
    doc.fillColor('black');
    doc.font('Helvetica-Oblique').fontSize(8).text(
      `Generated on ${new Date().toLocaleString('en-KE')} | CBC Senior School Management System`,
      40, 820, { align: 'center' }
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate student fee statement PDF
 * @route   GET /api/reports/student/:studentId/fee-statement
 * @access  Private (Student own, Admin any)
 */
const generateFeeStatement = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { term, year } = req.query;

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Authorization check
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const school = await SchoolDetails.findOne();

    const feeQuery = { studentId };
    if (term) feeQuery.term = parseInt(term);
    if (year) feeQuery.year = parseInt(year);

    const paymentQuery = { studentId, status: 'completed' };
    if (term) paymentQuery.term = parseInt(term);
    if (year) paymentQuery.year = parseInt(year);

    const [fees, payments] = await Promise.all([
      Fee.find(feeQuery).sort({ year: -1, term: 1 }),
      Payment.find(paymentQuery).sort({ createdAt: -1 }),
    ]);

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fee_statement_${student.admissionNumber || student.name.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    // Header with logo
    if (school?.logo) {
      try { doc.image(school.logo, 40, 30, { width: 60 }); } catch (e) {}
    }
    doc.font('Helvetica-Bold').fontSize(18).text(school?.name || 'CBC Senior School', 110, 35, { align: 'center' });
    doc.font('Helvetica').fontSize(10).text(school?.motto || 'Excellence in Education', 110, 55, { align: 'center' });
    doc.moveTo(40, 85).lineTo(555, 85).stroke();

    // Report title
    doc.font('Helvetica-Bold').fontSize(14).text('FEE STATEMENT', 40, 100);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Student: ${student.name}`, 40, 122);
    doc.text(`Admission No: ${student.admissionNumber || 'N/A'}`, 300, 122);
    doc.text(`Grade: ${student.grade}`, 40, 138);
    doc.text(`Date: ${new Date().toLocaleDateString('en-KE')}`, 300, 138);

    // Fee Summary Box
    let y = 165;
    const totalDue = fees.reduce((s, f) => s + f.totalDue, 0);
    const totalPaid = fees.reduce((s, f) => s + f.amountPaid, 0);
    const totalBalance = fees.reduce((s, f) => s + (f.balance || 0), 0);

    doc.rect(40, y, 515, 45).fill('#f0fdf4');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#16a34a');
    doc.text('ACCOUNT SUMMARY', 50, y + 8);
    doc.fillColor('black');
    doc.font('Helvetica').fontSize(9);
    doc.text(`Total Due: KES ${totalDue.toLocaleString()}`, 50, y + 22);
    doc.text(`Total Paid: KES ${totalPaid.toLocaleString()}`, 200, y + 22);
    doc.text(`Balance: KES ${totalBalance.toLocaleString()}`, 350, y + 22);
    doc.text(`Status: ${totalBalance <= 0 ? 'CLEARED' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID'}`, 50, y + 34);

    // Fee Details Table
    y += 60;
    doc.font('Helvetica-Bold').fontSize(10).text('FEE BREAKDOWN', 40, y);
    y += 15;

    if (fees.length > 0) {
      doc.font('Helvetica-Bold').fontSize(8);
      const feeCols = [50, 60, 80, 80, 80, 100];
      const feeHeaders = ['Term/Year', 'Total Fee', 'Amount Paid', 'Balance', 'Status', 'Date'];
      let x = 35;
      doc.rect(x, y, 525, 16).fill('#16a34a');
      doc.fillColor('white');
      feeCols.reduce((cx, w, i) => {
        doc.font('Helvetica-Bold').fontSize(7).text(feeHeaders[i], cx + 2, y + 4, { width: w - 4 });
        return cx + w;
      }, x);
      doc.fillColor('black');
      y += 16;

      fees.forEach((f, i) => {
        if (y > 740) { doc.addPage(); y = 40; }
        const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(x, y, 525, 14).fill(bgColor);
        doc.fillColor('black');

        const status = f.balance <= 0 ? 'CLEARED' : f.amountPaid > 0 ? 'PARTIAL' : 'UNPAID';
        const statusColor = status === 'CLEARED' ? '#16a34a' : status === 'PARTIAL' ? '#f59e0b' : '#ef4444';

        doc.font('Helvetica').fontSize(7);
        let offsetX = x;
        doc.text(`Term ${f.term}, ${f.year}`, offsetX + 2, y + 3, { width: feeCols[0] - 4 });
        offsetX += feeCols[0];
        doc.text(`KES ${f.totalDue.toLocaleString()}`, offsetX + 2, y + 3, { width: feeCols[1] - 4 });
        offsetX += feeCols[1];
        doc.text(`KES ${f.amountPaid.toLocaleString()}`, offsetX + 2, y + 3, { width: feeCols[2] - 4 });
        offsetX += feeCols[2];
        doc.text(`KES ${f.balance.toLocaleString()}`, offsetX + 2, y + 3, { width: feeCols[3] - 4 });
        offsetX += feeCols[3];
        doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(7).text(status, offsetX + 2, y + 3, { width: feeCols[4] - 4 });
        doc.fillColor('black');
        offsetX += feeCols[4];
        doc.text(f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-KE') : '-', offsetX + 2, y + 3, { width: feeCols[5] - 4 });

        doc.moveTo(x, y + 14).lineTo(x + 525, y + 14).strokeColor('#e5e7eb').lineWidth(0.5).stroke().strokeColor('black').lineWidth(1);
        y += 14;
      });
    } else {
      y += 15;
      doc.font('Helvetica').fontSize(9).text('No fee records found for the selected period.', 40, y);
      y += 15;
    }

    // Payment History
    y += 15;
    if (y > 680) { doc.addPage(); y = 40; }
    doc.font('Helvetica-Bold').fontSize(10).text('PAYMENT HISTORY', 40, y);
    y += 15;

    if (payments.length > 0) {
      doc.font('Helvetica-Bold').fontSize(8);
      const payCols = [50, 80, 60, 70, 80, 120];
      const payHeaders = ['Date', 'Receipt No.', 'Method', 'Amount', 'Term/Year', 'Status'];
      let x = 35;
      doc.rect(x, y, 525, 16).fill('#16a34a');
      doc.fillColor('white');
      payCols.reduce((cx, w, i) => {
        doc.font('Helvetica-Bold').fontSize(7).text(payHeaders[i], cx + 2, y + 4, { width: w - 4 });
        return cx + w;
      }, x);
      doc.fillColor('black');
      y += 16;

      payments.forEach((p, i) => {
        if (y > 740) { doc.addPage(); y = 40; }
        const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(x, y, 525, 14).fill(bgColor);
        doc.fillColor('black');

        doc.font('Helvetica').fontSize(7);
        let offsetX = x;
        doc.text(p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-KE') : '-', offsetX + 2, y + 3, { width: payCols[0] - 4 });
        offsetX += payCols[0];
        doc.text(p.transactionId || '-', offsetX + 2, y + 3, { width: payCols[1] - 4 });
        offsetX += payCols[1];
        doc.text((p.paymentMethod || '-').toUpperCase(), offsetX + 2, y + 3, { width: payCols[2] - 4 });
        offsetX += payCols[2];
        doc.text(`KES ${p.amount?.toLocaleString()}`, offsetX + 2, y + 3, { width: payCols[3] - 4 });
        offsetX += payCols[3];
        doc.text(`T${p.term || '-'}/${p.year || '-'}`, offsetX + 2, y + 3, { width: payCols[4] - 4 });
        offsetX += payCols[4];
        doc.text((p.status || '-').toUpperCase(), offsetX + 2, y + 3, { width: payCols[5] - 4 });

        doc.moveTo(x, y + 14).lineTo(x + 525, y + 14).strokeColor('#e5e7eb').lineWidth(0.5).stroke().strokeColor('black').lineWidth(1);
        y += 14;
      });
    } else {
      y += 15;
      doc.font('Helvetica').fontSize(9).text('No payments recorded.', 40, y);
      y += 15;
    }

    // Footer
    y += 20;
    if (y > 760) { doc.addPage(); y = 40; }
    doc.font('Helvetica-Oblique').fontSize(8).text(
      `Generated on ${new Date().toLocaleString('en-KE')} | CBC Senior School Management System`,
      40, 820, { align: 'center' }
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate timetable PDF
 * @route   GET /api/reports/timetable
 * @access  Private
 */
const generateTimetablePDF = async (req, res, next) => {
  try {
    const { grade, teacherId } = req.query;

    const school = await SchoolDetails.findOne();

    const query = {};
    if (req.user.role === 'student') {
      query.grade = req.user.grade;
      if (req.user.assignedClass) query.assignedClass = req.user.assignedClass;
    } else if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    } else {
      if (grade) query.grade = grade;
      if (teacherId) query.teacherId = teacherId;
    }

    const entries = await Timetable.find(query)
      .populate('teacherId', 'name')
      .sort({ day: 1, period: 1 });

    // Group by day
    const groupedByDay = {};
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    entries.forEach(e => {
      if (!groupedByDay[e.day]) groupedByDay[e.day] = [];
      groupedByDay[e.day].push(e);
    });

    // Extract unique periods from entries
    const periodMap = {};
    entries.forEach(e => {
      if (!periodMap[e.period]) {
        periodMap[e.period] = {
          period: e.period,
          startTime: e.startTime,
          endTime: e.endTime,
          label: e.periodType !== 'regular' ? e.periodType.toUpperCase().substring(0, 3) : `P${e.period}`,
          type: e.periodType || 'regular',
        };
      }
    });
    const periods = Object.values(periodMap).sort((a, b) => a.period - b.period);

    const title = req.user.role === 'teacher' ? `${req.user.name}'s Timetable` : `Grade ${grade || req.user.grade} Timetable`;

    // Create PDF - Landscape A4
    const doc = new PDFDocument({ margin: 25, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=timetable_${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    doc.pipe(res);

    // Header
    if (school?.logo) {
      try { doc.image(school.logo, 25, 15, { width: 45 }); } catch (e) {}
    }
    doc.font('Helvetica-Bold').fontSize(14).text(school?.name || 'CBC Senior School', 80, 20);
    doc.font('Helvetica').fontSize(10).text(title, 80, 38);
    doc.font('Helvetica').fontSize(8).text(`06:00 - 18:00 | Generated: ${new Date().toLocaleDateString('en-KE')}`, 80, 52);
    doc.moveTo(25, 62).lineTo(817, 62).stroke();

    // Table dimensions
    const xStart = 25;
    const timeColWidth = 55;
    const dayColWidth = (792 - timeColWidth) / 5; // 5 days
    const rowHeight = 22;
    const tableTop = 70;

    // Draw header row
    doc.rect(xStart, tableTop, timeColWidth, rowHeight).fill('#16a34a');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(7).text('Time', xStart + 2, tableTop + 6, { width: timeColWidth - 4 });
    doc.fillColor('black');

    dayOrder.forEach((day, i) => {
      const x = xStart + timeColWidth + i * dayColWidth;
      doc.rect(x, tableTop, dayColWidth, rowHeight).fill('#16a34a');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(7).text(day, x + 2, tableTop + 6, { width: dayColWidth - 4 });
      doc.fillColor('black');
    });

    let y = tableTop + rowHeight;

    // Draw rows
    periods.forEach((period, pIdx) => {
      const isSpecial = period.type === 'break' || period.type === 'lunch' || period.type === 'assembly';
      const bgColor = isSpecial ? '#fef3c7' : (pIdx % 2 === 0 ? '#f9fafb' : '#ffffff');

      // Time cell
      doc.rect(xStart, y, timeColWidth, rowHeight).fill(bgColor);
      doc.fillColor('black').font('Helvetica').fontSize(6);
      doc.text(period.label, xStart + 1, y + 1, { width: timeColWidth - 2, align: 'center' });
      doc.text(`${period.startTime}`, xStart + 1, y + 10, { width: timeColWidth - 2, align: 'center' });

      // Day cells
      dayOrder.forEach((day, dIdx) => {
        const x = xStart + timeColWidth + dIdx * dayColWidth;
        doc.rect(x, y, dayColWidth, rowHeight).fill(bgColor);

        const entry = (groupedByDay[day] || []).find(e => e.period === period.period);
        if (entry) {
          doc.fillColor('black').font('Helvetica-Bold').fontSize(6);
          const subjectText = entry.subject.length > 16 ? entry.subject.substring(0, 15) + '.' : entry.subject;
          doc.text(subjectText, x + 1, y + 1, { width: dayColWidth - 2 });
          doc.font('Helvetica').fontSize(5);
          const teacherName = entry.teacherId?.name || '';
          const shortName = teacherName.length > 14 ? teacherName.substring(0, 13) + '.' : teacherName;
          doc.text(shortName, x + 1, y + 10, { width: dayColWidth - 2 });
          if (entry.room && req.user.role === 'admin') {
            doc.text(entry.room, x + dayColWidth - 15, y + 1, { width: 14, align: 'right' });
          }
        } else if (isSpecial) {
          doc.fillColor('#9ca3af').font('Helvetica').fontSize(5);
          doc.text(period.label, x + 1, y + 5, { width: dayColWidth - 2, align: 'center' });
        }

        doc.fillColor('black');
        // Cell border
        doc.rect(x, y, dayColWidth, rowHeight).strokeColor('#d1d5db').lineWidth(0.3).stroke().strokeColor('black');
      });

      // Time cell border
      doc.rect(xStart, y, timeColWidth, rowHeight).strokeColor('#d1d5db').lineWidth(0.3).stroke().strokeColor('black');

      y += rowHeight;
    });

    // Footer
    doc.font('Helvetica-Oblique').fontSize(7).text(
      `Generated on ${new Date().toLocaleString('en-KE')} | CBC Senior School Management System`,
      25, 585, { align: 'center' }
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateStudentReport,
  generateClassReport,
  getStudentReportData,
  calculatePositions,
  generateFeeReport,
  generateMarksReport,
  generatePaymentReport,
  generateFeeStatement,
  generateTimetablePDF,
};
