import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Loader, Save } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const TeacherAttendance = () => {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.grade) {
      fetchStudents();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDate && students.length > 0) {
      fetchExistingAttendance();
    }
  }, [selectedDate, students]);

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/users?role=student&grade=${user.grade}`);
      setStudents(res.data.users);
      const initial = {};
      res.data.users.forEach(s => { initial[s._id] = 'Present'; });
      setAttendance(initial);
    } catch (err) {
      showError('Failed to load students');
    } finally { setLoading(false); }
  };

  const fetchExistingAttendance = async () => {
    try {
      const res = await api.get(`/attendance?date=${selectedDate}&grade=${user.grade}`);
      const existing = {};
      res.data.attendance.forEach(a => { existing[a.studentId] = a.status; });
      setAttendance(prev => ({ ...prev, ...existing }));
    } catch (err) {
      console.error('Failed to load existing attendance');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId, date: selectedDate, status, assignedClass: user.assignedClass,
      }));
      await api.post('/attendance/bulk', { date: selectedDate, assignedClass: user.assignedClass, records });
      showSuccess('Attendance saved successfully');
    } catch (err) {
      showError('Failed to save attendance');
    } finally { setSaving(false); }
  };

  const stats = {
    present: Object.values(attendance).filter(s => s === 'Present').length,
    absent: Object.values(attendance).filter(s => s === 'Absent').length,
    late: Object.values(attendance).filter(s => s === 'Late').length,
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-1">Mark daily attendance for your class</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Attendance'}</button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input w-48" />
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> Present: {stats.present}</span>
            <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-500" /> Absent: {stats.absent}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-yellow-500" /> Late: {stats.late}</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header">Student</th>
                <th className="table-header text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.admissionNumber}</p>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-center gap-2">
                      {['Present', 'Absent', 'Late'].map(status => (
                        <button
                          key={status}
                          onClick={() => setAttendance(prev => ({ ...prev, [student._id]: status }))}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            attendance[student._id] === status
                              ? status === 'Present' ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                              : status === 'Absent' ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                              : 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendance;
