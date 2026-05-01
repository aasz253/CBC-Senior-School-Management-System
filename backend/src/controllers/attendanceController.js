/**
 * Attendance Controller
 * Daily attendance tracking with role-based access
 */
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const SchoolDetails = require('../models/SchoolDetails');
const PDFDocument = require('pdfkit');

/**
 * @desc    Get weekly attendance grid (Mon-Fri)
 * @route   GET /api/attendance/weekly
 * @access  Private (Teacher/Admin)
 */
exports.getWeeklyAttendance = async (req, res, next) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({
        success: false,
        message: 'weekStart date is required (YYYY-MM-DD format, should be a Monday)',
      });
    }

    const startDate = new Date(weekStart);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 4);
    endDate.setHours(23, 59, 59, 999);

    const grade = req.user.classTeacherOf || req.query.grade;
    const query = {
      date: { $gte: startDate, $lte: endDate },
      grade: grade || req.query.grade,
    };

    if (!query.grade) {
      return res.status(400).json({
        success: false,
        message: 'Grade is required. Either be assigned as class teacher or pass grade query param.',
      });
    }

    const students = await User.find({ role: 'student', grade: grade.replace('Grade ', '') })
      .sort({ name: 1 });

    const attendanceRecords = await Attendance.find(query)
      .populate('studentId', 'name admissionNumber')
      .sort({ date: 1 });

    const weekDays = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      weekDays.push(d.toISOString().split('T')[0]);
    }

    const grid = students.map(student => {
      const row = {
        studentId: student._id,
        name: student.name,
        admissionNumber: student.admissionNumber,
      };
      weekDays.forEach(day => {
        const record = attendanceRecords.find(a => {
          const sid = typeof a.studentId === 'string' ? a.studentId : a.studentId?._id?.toString();
          const aDate = new Date(a.date).toISOString().split('T')[0];
          return sid === student._id.toString() && aDate === day;
        });
        row[day] = record ? record.status : 'Not Marked';
      });

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      weekDays.forEach(day => {
        if (row[day] === 'Present') presentCount++;
        else if (row[day] === 'Absent') absentCount++;
        else if (row[day] === 'Late') lateCount++;
      });
      row.presentCount = presentCount;
      row.absentCount = absentCount;
      row.lateCount = lateCount;
      row.totalMarked = presentCount + absentCount + lateCount;

      return row;
    });

    res.status(200).json({
      success: true,
      weekStart: weekDays[0],
      weekEnd: weekDays[4],
      weekDays,
      students: grid,
      totalStudents: students.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate weekly PTF attendance report PDF
 * @route   GET /api/attendance/weekly-report
 * @access  Private (Teacher/Admin)
 */
exports.generateWeeklyPTFReport = async (req, res, next) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({
        success: false,
        message: 'weekStart date is required (YYYY-MM-DD format, should be a Monday)',
      });
    }

    const startDate = new Date(weekStart);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 4);
    endDate.setHours(23, 59, 59, 999);

    const grade = req.user.classTeacherOf || req.query.grade;
    const query = {
      date: { $gte: startDate, $lte: endDate },
      grade: grade || req.query.grade,
    };

    if (!query.grade) {
      return res.status(400).json({
        success: false,
        message: 'Grade is required.',
      });
    }

    const students = await User.find({ role: 'student', grade: grade.replace('Grade ', '') })
      .sort({ name: 1 });

    const attendanceRecords = await Attendance.find(query)
      .populate('studentId', 'name admissionNumber')
      .sort({ date: 1 });

    const weekDays = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      weekDays.push({ date: d.toISOString().split('T')[0], name: dayNames[i] });
    }

    const grid = students.map(student => {
      const row = {
        studentId: student._id,
        name: student.name,
        admissionNumber: student.admissionNumber,
      };
      weekDays.forEach(day => {
        const record = attendanceRecords.find(a => {
          const sid = typeof a.studentId === 'string' ? a.studentId : a.studentId?._id?.toString();
          const aDate = new Date(a.date).toISOString().split('T')[0];
          return sid === student._id.toString() && aDate === day.date;
        });
        row[day.date] = record ? record.status : '-';
      });

      let presentCount = 0;
      let absentCount = 0;
      weekDays.forEach(day => {
        if (row[day.date] === 'Present' || row[day.date] === 'Late') presentCount++;
        else if (row[day.date] === 'Absent') absentCount++;
      });
      row.attendanceRate = presentCount > 0 ? `${((presentCount / 5) * 100).toFixed(0)}%` : '-';
      row.remarks = absentCount >= 3 ? 'Poor' : absentCount >= 2 ? 'Fair' : absentCount >= 1 ? 'Good' : 'Excellent';

      return row;
    });

    const school = await SchoolDetails.findOne();

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PTF_Attendance_Grade_${grade}_WeekOf_${weekStart}.pdf`);
    doc.pipe(res);

    // Header with school logo
    if (school?.logo) {
      try {
        doc.image(school.logo, 30, 18, { width: 55, height: 55, align: 'left' });
      } catch (e) {
        console.error('Failed to load school logo:', e.message);
      }
    }

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#16A34A').text(school?.name || 'CBC SENIOR SCHOOL', 95, 20);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#F97316').text('Weekly Attendance Report - PTF', 95, 40);
    doc.fillColor('#000000');

    doc.fontSize(10).font('Helvetica').text(`Grade: ${grade}`, { align: 'center' });
    doc.text(`Week: ${weekDays[0].name} (${weekDays[0].date}) - ${weekDays[4].name} (${weekDays[4].date})`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

    // Green divider line
    doc.lineWidth(2).strokeColor('#16A34A');
    doc.moveTo(30, 82).lineTo(doc.page.width - 30, 82).stroke();

    doc.moveDown(0.3);

    const colWidths = {
      no: 35,
      admission: 65,
      name: 160,
      day: 75,
      rate: 50,
      remarks: 75,
    };
    const headers = ['No.', 'Adm No', 'Student Name', ...weekDays.map(d => d.name.substring(0, 3)), 'Rate', 'Remarks'];
    const colKeys = ['no', 'admission', 'name', ...weekDays.map(() => 'day'), 'rate', 'remarks'];

    const tableLeft = 30;
    let y = 95;
    const rowHeight = 20;
    const headerHeight = 22;

    // Draw header row with green background
    doc.save();
    let hx = tableLeft;
    doc.rect(hx, y, doc.page.width - 60, headerHeight).fillAndStroke('#16A34A', '#16A34A');
    headers.forEach((h, i) => {
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
        .text(h, hx + 2, y + 5, { width: colWidths[colKeys[i]] - 4, align: i <= 1 ? 'center' : 'left' });
      hx += colWidths[colKeys[i]];
    });
    doc.restore();
    y += headerHeight;

    // Draw data rows
    grid.forEach((student, idx) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 30;
      }

      const cells = [
        String(idx + 1),
        student.admissionNumber || '-',
        student.name,
        ...weekDays.map(d => {
          const val = student[d.date];
          if (val === 'Present') return 'P';
          if (val === 'Absent') return 'A';
          if (val === 'Late') return 'L';
          return '-';
        }),
        student.attendanceRate,
        student.remarks,
      ];

      const isEven = idx % 2 === 0;
      let x = tableLeft;

      cells.forEach((cell, i) => {
        const w = colWidths[colKeys[i]];
        doc.rect(x, y, w, rowHeight).fillAndStroke(isEven ? '#F9FAFB' : '#FFFFFF', '#D1D5DB');
        x += w;
      });

      x = tableLeft;
      cells.forEach((cell, i) => {
        const w = colWidths[colKeys[i]];
        const align = i <= 1 ? 'center' : 'left';
        let textColor = '#1F2937';
        if (i >= 3 && i <= 7) {
          const dayVal = student[weekDays[i - 3].date];
          if (dayVal === 'Present') textColor = '#16A34A';
          else if (dayVal === 'Absent') textColor = '#DC2626';
          else if (dayVal === 'Late') textColor = '#D97706';
        }

        doc.fontSize(9).font(i <= 1 || i >= colKeys.length - 2 ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(textColor)
          .text(cell, x + 3, y + 4, { width: w - 6, height: rowHeight - 4, align });
        x += w;
      });

      y += rowHeight;
    });

    doc.fillColor('#000000');
    y += 10;

    const totalGood = grid.filter(s => s.remarks === 'Excellent' || s.remarks === 'Good').length;
    const totalPoor = grid.filter(s => s.remarks === 'Poor').length;

    doc.lineWidth(1.5).strokeColor('#16A34A');
    doc.moveTo(tableLeft, y - 5).lineTo(doc.page.width - 30, y - 5).stroke();

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#16A34A').text('Summary:', tableLeft, y);
    doc.fillColor('#1F2937');
    y += 16;
    doc.fontSize(9).font('Helvetica').text(`Total Students: ${grid.length}`, tableLeft, y);
    y += 14;
    doc.text(`Excellent/Good Attendance: ${totalGood}`, tableLeft, y);
    y += 14;
    doc.fillColor('#DC2626').text(`Poor Attendance (3+ absences): ${totalPoor}`, tableLeft, y);
    doc.fillColor('#000000');

    y += 25;
    doc.fontSize(9).font('Helvetica').text('Class Teacher Signature: _________________________  Date: _______________', tableLeft, y);
    y += 20;
    doc.text('Head of Institution Signature: _________________________  Date: _______________', tableLeft, y);

    doc.end();
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    }
  }
};

/**
 * @desc    Get attendance records - role-based access
 * @route   GET /api/attendance
 * @access  Private
 */
exports.getAttendance = async (req, res, next) => {
  try {
    const { studentId, date, grade, assignedClass, startDate, endDate } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      query.studentId = req.user.id;
    } else if (req.user.role === 'teacher') {
      if (req.user.classTeacherOf) {
        query.grade = req.user.classTeacherOf;
      } else if (req.user.assignedClass) {
        query.assignedClass = req.user.assignedClass;
      }
    }
    // Admin can see all attendance

    if (studentId) query.studentId = studentId;
    if (grade) query.grade = grade;
    if (assignedClass) query.assignedClass = assignedClass;

    // Date range filtering
    if (date) {
      query.date = {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lte: new Date(date).setHours(23, 59, 59, 999),
      };
    }
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'name admissionNumber grade pathway')
      .populate('recordedBy', 'name')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark attendance (single student)
 * @route   POST /api/attendance
 * @access  Private (Teacher/Admin)
 */
exports.markAttendance = async (req, res, next) => {
  try {
    req.body.recordedBy = req.user.id;

    // Verify student exists
    const student = await User.findById(req.body.studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    // Auto-fill grade and class from student
    req.body.grade = student.grade;
    req.body.assignedClass = student.assignedClass || req.body.assignedClass;

    const attendance = await Attendance.create(req.body);

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('studentId', 'name admissionNumber grade')
      .populate('recordedBy', 'name');

    res.status(201).json({
      success: true,
      attendance: populatedAttendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk mark attendance for entire class
 * @route   POST /api/attendance/bulk
 * @access  Private (Teacher/Admin)
 */
exports.bulkMarkAttendance = async (req, res, next) => {
  try {
    const { date, grade, assignedClass, records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Records array is required',
      });
    }

    const attendanceRecords = [];
    for (const record of records) {
      const student = await User.findById(record.studentId);
      attendanceRecords.push({
        studentId: record.studentId,
        date: record.date || date,
        status: record.status,
        grade: grade || (student?.grade?.toString().replace('Grade ', '') || student?.grade),
        assignedClass: assignedClass || student?.assignedClass,
        recordedBy: req.user.id,
        reason: record.reason,
        lateArrivalTime: record.lateArrivalTime,
      });
    }

    // Use bulkWrite for efficiency with upsert
    const operations = attendanceRecords.map(record => ({
      updateOne: {
        filter: {
          studentId: record.studentId,
          date: record.date,
          subject: record.subject || null,
        },
        update: { $set: record },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(operations);

    res.status(201).json({
      success: true,
      count: result.upsertedCount + result.modifiedCount,
      message: 'Attendance recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update attendance record
 * @route   PUT /api/attendance/:id
 * @access  Private (Teacher/Admin)
 */
exports.updateAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('studentId', 'name admissionNumber grade')
      .populate('recordedBy', 'name');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance statistics
 * @route   GET /api/attendance/stats
 * @access  Private
 */
exports.getAttendanceStats = async (req, res, next) => {
  try {
    const { studentId, grade, assignedClass, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role === 'student') {
      query.studentId = req.user.id;
    }
    if (studentId) query.studentId = studentId;
    if (grade) query.grade = grade;
    if (assignedClass) query.assignedClass = assignedClass;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(query);

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const late = attendance.filter(a => a.status === 'Late').length;

    res.status(200).json({
      success: true,
      stats: {
        total,
        present,
        absent,
        late,
        attendanceRate: total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
