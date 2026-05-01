/**
 * Attendance Controller
 * Daily attendance tracking with role-based access
 */
const Attendance = require('../models/Attendance');
const User = require('../models/User');
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

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PTF_Attendance_Grade_${grade}_WeekOf_${weekStart}.pdf`);
    doc.pipe(res);

    const pageWidth = doc.page.width - 60;

    doc.fontSize(16).font('Helvetica-Bold').text('CBC SENIOR SCHOOL', { align: 'center' });
    doc.fontSize(14).font('Helvetica-Bold').text('Weekly Attendance Report - PTF', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').text(`Grade: ${grade}`, { align: 'center' });
    doc.text(`Week: ${weekDays[0].name} (${weekDays[0].date}) - ${weekDays[4].name} (${weekDays[4].date})`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
    doc.moveDown(0.5);

    const colWidths = {
      no: 30,
      admission: 70,
      name: 150,
      day: 80,
      rate: 55,
      remarks: 70,
    };
    const headers = ['No.', 'Adm No', 'Student Name', ...weekDays.map(d => d.name.substring(0, 3)), 'Rate', 'Remarks'];
    const keys = ['no', 'admission', 'name', ...weekDays.map(d => d.date), 'attendanceRate', 'remarks'];

    const tableLeft = 30;
    let y = doc.y;
    const rowHeight = 18;

    doc.lineWidth(0.5);

    const drawRow = (cells, isHeader = false) => {
      let x = tableLeft;
      const colKeys = ['no', 'admission', 'name', ...weekDays.map(() => 'day'), 'rate', 'remarks'];

      doc.rect(x, y, colWidths.no, rowHeight).fillAndStroke(isHeader ? '#E5E7EB' : '#FFFFFF', '#9CA3AF');
      x += colWidths.no;

      cells.forEach((cell, i) => {
        const w = colWidths[colKeys[i]];
        doc.rect(x, y, w, rowHeight).fillAndStroke(isHeader ? '#E5E7EB' : '#FFFFFF', '#9CA3AF');
        x += w;
      });

      x = tableLeft;
      cells.forEach((cell, i) => {
        const w = colWidths[colKeys[i]];
        doc.fontSize(isHeader ? 8 : 8).font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
          .text(cell, x + 2, y + 4, { width: w - 4, height: rowHeight - 4, align: i === 0 ? 'center' : 'left' });
        x += w;
      });

      y += rowHeight;
    };

    drawRow(headers, true);

    grid.forEach((student, idx) => {
      const cells = [
        String(idx + 1),
        student.admissionNumber || '-',
        student.name,
        ...weekDays.map(d => student[d.date]),
        student.attendanceRate,
        student.remarks,
      ];
      drawRow(cells);

      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 30;
      }
    });

    y += 10;
    const totalPresent = grid.filter(s => s.remarks === 'Excellent' || s.remarks === 'Good').length;
    const totalPoor = grid.filter(s => s.remarks === 'Poor').length;

    doc.fontSize(10).font('Helvetica-Bold').text(`Summary:`, tableLeft, y);
    y += 15;
    doc.fontSize(9).font('Helvetica').text(`Total Students: ${grid.length}`, tableLeft, y);
    y += 14;
    doc.text(`Excellent/Good Attendance: ${totalPresent}`, tableLeft, y);
    y += 14;
    doc.text(`Poor Attendance (3+ absences): ${totalPoor}`, tableLeft, y);

    y += 25;
    doc.fontSize(9).font('Helvetica').text('Class Teacher Signature: _________________________  Date: _______________', tableLeft, y);
    y += 18;
    doc.text('Head of Institution Signature: _________________________  Date: _______________', tableLeft, y);

    doc.end();
  } catch (error) {
    next(error);
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
