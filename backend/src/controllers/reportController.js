/**
 * Report Controller
 * PDF report card generation in CBC format
 */
const PDFDocument = require('pdfkit');
const Mark = require('../models/Mark');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');

/**
 * @desc    Generate CBC report card PDF
 * @route   GET /api/reports/generate/:studentId/:term/:year
 * @access  Private
 */
exports.generateReport = async (req, res, next) => {
  try {
    const { studentId, term, year } = req.params;

    // Students can only generate their own reports
    if (req.user.role === 'student' && studentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate this report',
      });
    }

    // Fetch student data
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Fetch marks for the term
    const marks = await Mark.find({
      studentId,
      term: parseInt(term),
      year: parseInt(year),
    }).sort({ subject: 1 });

    // Fetch attendance for the term
    const termStart = new Date(parseInt(year), (parseInt(term) - 1) * 4, 1);
    const termEnd = new Date(parseInt(year), (parseInt(term) - 1) * 4 + 3, 30);
    const attendance = await Attendance.find({
      studentId,
      date: { $gte: termStart, $lte: termEnd },
    });

    // Fetch fee status
    const fee = await Fee.findOne({ studentId, term: parseInt(term), year: parseInt(year) });

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${student.admissionNumber || studentId}_term${term}_${year}.pdf`);

    doc.pipe(res);

    // School header
    doc.fontSize(20).font('Helvetica-Bold').text('CBC SENIOR SCHOOL', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('End of Term Report Card', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Academic Year ${year} - Term ${term}`, { align: 'center' });
    doc.moveDown(1);

    // Horizontal line
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Student details
    doc.fontSize(11).font('Helvetica-Bold').text('STUDENT DETAILS', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    const details = [
      ['Name:', student.name],
      ['Admission No:', student.admissionNumber || 'N/A'],
      ['Grade:', `Grade ${student.grade}`],
      ['Pathway:', student.pathway || 'N/A'],
      ['Term:', `Term ${term}, ${year}`],
    ];

    details.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(label, { continued: true, width: 150 });
      doc.font('Helvetica').text(value);
    });
    doc.moveDown(1);

    // Academic Performance Table
    doc.fontSize(11).font('Helvetica-Bold').text('ACADEMIC PERFORMANCE', { underline: true });
    doc.moveDown(0.3);

    if (marks.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No marks recorded for this term.');
    } else {
      // Table header
      const tableTop = doc.y;
      const headers = ['Subject', 'Score', 'Competency Level', 'Remarks'];
      const colWidths = [180, 80, 120, 120];
      let xPos = 50;

      // Draw header
      doc.font('Helvetica-Bold').fontSize(9);
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
      });

      // Header line
      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

      // Table rows
      doc.font('Helvetica').fontSize(9);
      let rowY = tableTop + 20;
      marks.forEach((mark, index) => {
        xPos = 50;
        const rowData = [
          mark.subject,
          mark.score.toString(),
          `${mark.competencyLabel} (${mark.competencyLevel})`,
          mark.teacherRemark || '-',
        ];

        rowData.forEach((cell, i) => {
          doc.text(cell, xPos, rowY, { width: colWidths[i], align: i === 0 ? 'left' : 'center' });
          xPos += colWidths[i];
        });

        rowY += 18;

        // Add page break if needed
        if (rowY > 700) {
          doc.addPage();
          rowY = 50;
        }
      });

      // Average
      const totalScore = marks.reduce((sum, m) => sum + m.score, 0);
      const average = (totalScore / marks.length).toFixed(1);

      doc.moveTo(50, rowY + 5).lineTo(545, rowY + 5).stroke();
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('AVERAGE', 50, rowY + 10, { width: 180 });
      doc.text(average, 230, rowY + 10, { width: 80, align: 'center' });
    }
    doc.moveDown(1.5);

    // Competency Level Key
    doc.fontSize(10).font('Helvetica-Bold').text('COMPETENCY LEVELS', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    doc.text('E - Exceeding (80-100%)  |  M - Meeting (65-79%)  |  A - Approaching (50-64%)  |  B - Beginning (0-49%)');
    doc.moveDown(1);

    // Attendance Summary
    doc.fontSize(11).font('Helvetica-Bold').text('ATTENDANCE SUMMARY', { underline: true });
    doc.moveDown(0.3);
    const totalDays = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const late = attendance.filter(a => a.status === 'Late').length;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Days: ${totalDays}  |  Present: ${present}  |  Absent: ${absent}  |  Late: ${late}`);
    doc.text(`Attendance Rate: ${totalDays > 0 ? (((present + late) / totalDays) * 100).toFixed(1) : 0}%`);
    doc.moveDown(1);

    // Fee Status
    if (fee) {
      doc.fontSize(11).font('Helvetica-Bold').text('FEE STATUS', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Due: KES ${fee.totalDue.toLocaleString()}  |  Paid: KES ${fee.amountPaid.toLocaleString()}  |  Balance: KES ${fee.balance.toLocaleString()}`);
      doc.moveDown(1);
    }

    // Teacher/Principal comments section
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text('CLASS TEACHER\'S REMARKS:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('_'.repeat(70));
    doc.moveDown(0.5);
    doc.text('_'.repeat(70));
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text('PRINCIPAL\'S REMARKS:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('_'.repeat(70));
    doc.moveDown(0.5);
    doc.text('_'.repeat(70));
    doc.moveDown(1);

    // Signatures
    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica');
    doc.text('Class Teacher\'s Signature: ___________________    Date: ___________', 50, doc.y);
    doc.moveDown(0.5);
    doc.text('Principal\'s Signature: ___________________    Date: ___________', 50, doc.y);
    doc.moveDown(1);
    doc.text('Parent/Guardian\'s Signature: ___________________    Date: ___________', 50, doc.y);

    // Footer
    doc.fontSize(8).font('Helvetica').text(
      `Generated on ${new Date().toLocaleDateString('en-KE')} | CBC Senior School Management System`,
      50,
      770,
      { align: 'center' }
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all students in a class for report generation
 * @route   GET /api/reports/class/:grade
 * @access  Private/Admin
 */
exports.getClassStudents = async (req, res, next) => {
  try {
    const { grade } = req.params;
    const { term, year } = req.query;

    const students = await User.find({
      role: 'student',
      grade,
      isActive: true,
    }).select('name admissionNumber pathway assignedClass')
      .sort({ admissionNumber: 1 });

    res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    next(error);
  }
};
