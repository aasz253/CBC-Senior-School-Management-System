import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Loader, Save, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDays(mondayDate) {
  const days = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  for (let i = 0; i < 5; i++) {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + i);
    days.push({ date: formatDate(d), label: dayNames[i], fullDate: `${dayNames[i]} ${formatDate(d)}` });
  }
  return days;
}

const TeacherAttendance = () => {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedGrade, setSelectedGrade] = useState(user?.classTeacherOf || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [weekMonday, setWeekMonday] = useState(getMonday(new Date()));
  const weekDays = getWeekDays(weekMonday);

  useEffect(() => {
    if (selectedGrade) {
      fetchStudents();
    } else {
      setLoading(false);
    }
  }, [selectedGrade, weekMonday]);

  useEffect(() => {
    if (students.length > 0) {
      fetchExistingAttendance();
    }
  }, [students, weekMonday]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/students?grade=${selectedGrade}`);
      setStudents(res.data.users || []);
    } catch (err) {
      showError('Failed to load students');
    } finally { setLoading(false); }
  };

  const fetchExistingAttendance = async () => {
    try {
      const startDate = formatDate(weekMonday);
      const endDate = weekDays[4].date;
      const res = await api.get(`/attendance?startDate=${startDate}&endDate=${endDate}&grade=${selectedGrade}`);
      const existing = {};
      (res.data.attendance || []).forEach(a => {
        const sid = typeof a.studentId === 'string' ? a.studentId : a.studentId?._id;
        const dateKey = new Date(a.date).toISOString().split('T')[0];
        if (sid && dateKey) {
          existing[`${sid}_${dateKey}`] = a.status;
        }
      });
      setAttendance(existing);
    } catch (err) {
      console.error('Failed to load existing attendance');
    }
  };

  const getStatus = (studentId, date) => attendance[`${studentId}_${date}`] || 'Present';

  const setStatus = (studentId, date, status) => {
    setAttendance(prev => ({ ...prev, [`${studentId}_${date}`]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = [];
      students.forEach(student => {
        weekDays.forEach(day => {
          records.push({
            studentId: student._id,
            date: day.date,
            status: getStatus(student._id, day.date),
          });
        });
      });
      await api.post('/attendance/bulk', { grade: selectedGrade, records });
      showSuccess('Weekly attendance saved successfully');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save attendance');
    } finally { setSaving(false); }
  };

  const handleGeneratePTF = async () => {
    setGeneratingPDF(true);
    try {
      const res = await api.get(`/attendance/weekly-report?weekStart=${formatDate(weekMonday)}&grade=${selectedGrade}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PTF_Attendance_Grade_${selectedGrade}_WeekOf_${formatDate(weekMonday)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSuccess('PTF report downloaded');
    } catch (err) {
      showError('Failed to generate PTF report');
    } finally { setGeneratingPDF(false); }
  };

  const navigateWeek = (direction) => {
    const d = new Date(weekMonday);
    d.setDate(d.getDate() + (direction * 7));
    setWeekMonday(d);
    setAttendance({});
  };

  const stats = { present: 0, absent: 0, late: 0, notMarked: 0 };
  students.forEach(s => {
    weekDays.forEach(day => {
      const st = getStatus(s._id, day.date);
      if (st === 'Present') stats.present++;
      else if (st === 'Absent') stats.absent++;
      else if (st === 'Late') stats.late++;
      else stats.notMarked++;
    });
  });

  const weekLabel = `${weekDays[0].fullDate} — ${weekDays[4].fullDate}`;

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Attendance Register</h1>
          <p className="text-gray-600 mt-1">Mark daily attendance Monday to Friday</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleGeneratePTF} disabled={generatingPDF} className="btn btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" />{generatingPDF ? 'Generating...' : 'PTF Report'}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Week'}
          </button>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigateWeek(-1)} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5" /></button>
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium">{weekLabel}</span>
            <button onClick={() => navigateWeek(1)} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5" /></button>
            <button onClick={() => { setWeekMonday(getMonday(new Date())); setAttendance({}); }} className="text-xs text-green-600 hover:underline ml-2">Today</button>
          </div>
          <select value={selectedGrade} onChange={(e) => { setSelectedGrade(e.target.value); setAttendance({}); }} className="input w-48">
            <option value="">Select Grade</option>
            {user?.classTeacherOf ? (
              <option value={user.classTeacherOf}>Grade {user.classTeacherOf} (My Class)</option>
            ) : (
              ['7','8','9','10','11','12'].map(g => <option key={g} value={g}>Grade {g}</option>)
            )}
          </select>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> Present: {stats.present}</span>
            <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-500" /> Absent: {stats.absent}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-yellow-500" /> Late: {stats.late}</span>
          </div>
        </div>
      </div>

      {!selectedGrade ? (
        <div className="card text-center py-12"><p className="text-gray-500">Please select a grade to mark attendance</p></div>
      ) : students.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No students found in this grade</p></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="table-header" rowSpan={2}>Student</th>
                  {weekDays.map(day => (
                    <th key={day.date} className="table-header text-center" colSpan={1}>{day.label}<br /><span className="text-xs text-gray-400">{day.date}</span></th>
                  ))}
                  <th className="table-header text-center" colSpan={3}>Totals</th>
                </tr>
                <tr className="bg-gray-50">
                  {weekDays.map(day => (
                    <th key={day.date} className="table-header text-center text-xs">P / A / L</th>
                  ))}
                  <th className="table-header text-center text-xs text-green-600">P</th>
                  <th className="table-header text-center text-xs text-red-600">A</th>
                  <th className="table-header text-center text-xs text-yellow-600">L</th>
                </tr>
              </thead>
              <tbody>
                  {students.map(student => {
                  let p = 0, a = 0, l = 0;
                  weekDays.forEach(day => {
                    const st = getStatus(student._id, day.date);
                    if (st === 'Present') p++;
                    else if (st === 'Absent') a++;
                    else if (st === 'Late') l++;
                  });
                  return (
                    <tr key={student._id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="table-cell">
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.admissionNumber}</p>
                        <div className="flex gap-2 mt-1 text-xs font-medium">
                          <span className="text-green-600">P:{p}</span>
                          <span className="text-red-600">A:{a}</span>
                          <span className="text-yellow-600">L:{l}</span>
                        </div>
                      </td>
                      {weekDays.map(day => {
                        const st = getStatus(student._id, day.date);
                        return (
                          <td key={day.date} className="table-cell">
                            <div className="flex items-center justify-center gap-1">
                              {['Present', 'Absent', 'Late'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => setStatus(student._id, day.date, status)}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                    st === status
                                      ? status === 'Present' ? 'bg-green-100 text-green-700 ring-1 ring-green-500'
                                      : status === 'Absent' ? 'bg-red-100 text-red-700 ring-1 ring-red-500'
                                      : 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-500'
                                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                  }`}
                                >
                                  {status[0]}
                                </button>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                      <td className="table-cell text-center text-sm font-semibold text-green-600">{p}</td>
                      <td className="table-cell text-center text-sm font-semibold text-red-600">{a}</td>
                      <td className="table-cell text-center text-sm font-semibold text-yellow-600">{l}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;
