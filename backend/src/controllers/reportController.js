/**
 * Report Controller
 * Generates PDF report cards with CBC format, positions, means, and auto-remarks
 */
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Mark = require('../models/Mark');
const Fee = require('../models/Fee');
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
      if (i % 2 === 0) doc.rect(40, y, 515, 18).fill('#f9fafb');

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
    doc.font('Helvetica-Bold').fontSize(9);
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

module.exports = {
  generateStudentReport,
  generateClassReport,
  getStudentReportData,
  calculatePositions,
  generateFeeReport,
};
