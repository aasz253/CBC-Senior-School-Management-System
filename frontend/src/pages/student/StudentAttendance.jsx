import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, Loader } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const StudentAttendance = () => {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attendanceRes, statsRes] = await Promise.all([
        api.get(`/attendance?startDate=${selectedMonth}-01&endDate=${selectedMonth}-31`),
        api.get('/attendance/stats'),
      ]);
      setAttendance(attendanceRes.data.attendance);
      setStats(statsRes.data.stats);
    } catch (err) {
      showError('Failed to load attendance');
    } finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-600 mt-1">Track your daily attendance record</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            <p className="text-sm text-gray-500">Present</p>
          </div>
          <div className="card text-center">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            <p className="text-sm text-gray-500">Absent</p>
          </div>
          <div className="card text-center">
            <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
            <p className="text-sm text-gray-500">Late</p>
          </div>
          <div className="card text-center">
            <Calendar className="w-6 h-6 text-primary-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary-600">{stats.attendanceRate}%</p>
            <p className="text-sm text-gray-500">Attendance Rate</p>
          </div>
        </div>
      )}

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="input w-48" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
                <th className="table-header">Class</th>
                <th className="table-header">Subject</th>
                <th className="table-header">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr><td colSpan="5" className="table-cell text-center py-12 text-gray-500">No attendance records for this period</td></tr>
              ) : (
                attendance.map(a => (
                  <tr key={a._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="table-cell">{new Date(a.date).toLocaleDateString('en-KE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="table-cell">
                      <span className={`badge ${a.status === 'Present' ? 'badge-green' : a.status === 'Absent' ? 'badge-red' : 'badge-yellow'}`}>{a.status}</span>
                    </td>
                    <td className="table-cell">{a.assignedClass}</td>
                    <td className="table-cell">{a.subject || '-'}</td>
                    <td className="table-cell text-sm">{a.recordedBy?.name || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
