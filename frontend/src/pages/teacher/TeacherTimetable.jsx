import { useState, useEffect } from 'react';
import { Clock, Loader, FileDown } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TeacherTimetable = () => {
  const { user } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchTimetable(); }, []);

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/timetable');
      const grouped = res.data.groupedByDay || {};
      const formatted = {};
      Object.entries(grouped).forEach(([day, entries]) => {
        formatted[day] = entries.sort((a, b) => a.period - b.period);
      });
      setTimetable(formatted);
    } catch (err) { showError('Failed to load timetable'); }
    finally { setLoading(false); }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const res = await api.get('/reports/timetable?teacherId=' + user.id, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timetable_${user.name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Timetable downloaded');
    } catch (err) { showError('Failed to generate timetable PDF'); }
    finally { setExporting(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
          <p className="text-gray-600 mt-1">Your weekly teaching schedule</p>
        </div>
        <button onClick={handleExportPDF} disabled={exporting} className="btn flex items-center gap-2 text-sm">
          {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Export PDF
        </button>
      </div>

      {Object.keys(timetable).length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No timetable entries found</p></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 p-2 text-sm font-semibold text-gray-700 w-24">Time</th>
                {DAYS.map(day => (
                  <th key={day} className="border border-gray-200 bg-primary-600 p-2 text-sm font-semibold text-white">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getTimeSlots().map((slot, idx) => (
                <tr key={idx} className={slot.type !== 'regular' ? 'bg-yellow-50' : ''}>
                  <td className="border border-gray-200 p-2 text-center bg-gray-50">
                    <p className="text-xs font-medium">{slot.label}</p>
                    <p className="text-[10px] text-gray-500">{slot.startTime} - {slot.endTime}</p>
                  </td>
                  {DAYS.map(day => {
                    const entry = (timetable[day] || []).find(e => e.period === slot.period);
                    return (
                      <td key={`${day}-${slot.period}`} className="border border-gray-200 p-2 text-sm h-14 align-top">
                        {entry ? (
                          <div>
                            <p className="font-medium text-gray-900 truncate">{entry.subject}</p>
                            <p className="text-[10px] text-gray-500 truncate">{entry.assignedClass}{entry.room ? ` | ${entry.room}` : ''}</p>
                          </div>
                        ) : slot.type !== 'regular' ? (
                          <p className="text-center text-xs text-gray-400">{slot.label}</p>
                        ) : (
                          <p className="text-center text-xs text-gray-200">-</p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function getTimeSlots() {
  return [
    { period: 1, startTime: '06:00', endTime: '06:40', label: 'Period 1' },
    { period: 2, startTime: '06:40', endTime: '07:20', label: 'Period 2' },
    { period: 3, startTime: '07:20', endTime: '08:00', label: 'Period 3' },
    { period: 4, startTime: '08:00', endTime: '08:40', label: 'Period 4' },
    { period: 5, startTime: '08:40', endTime: '09:20', label: 'Period 5' },
    { period: 6, startTime: '09:20', endTime: '10:00', label: 'Period 6' },
    { period: 7, startTime: '10:00', endTime: '10:30', label: 'Break', type: 'break' },
    { period: 8, startTime: '10:30', endTime: '11:10', label: 'Period 7' },
    { period: 9, startTime: '11:10', endTime: '11:50', label: 'Period 8' },
    { period: 10, startTime: '11:50', endTime: '12:30', label: 'Period 9' },
    { period: 11, startTime: '12:30', endTime: '13:10', label: 'Period 10' },
    { period: 12, startTime: '13:10', endTime: '13:50', label: 'Lunch', type: 'lunch' },
    { period: 13, startTime: '13:50', endTime: '14:30', label: 'Period 11' },
    { period: 14, startTime: '14:30', endTime: '15:10', label: 'Period 12' },
    { period: 15, startTime: '15:10', endTime: '15:50', label: 'Period 13' },
    { period: 16, startTime: '15:50', endTime: '16:30', label: 'Period 14' },
    { period: 17, startTime: '16:30', endTime: '17:10', label: 'Period 15' },
    { period: 18, startTime: '17:10', endTime: '17:50', label: 'Period 16' },
    { period: 19, startTime: '17:50', endTime: '18:00', label: 'Assembly', type: 'assembly' },
  ];
}

export default TeacherTimetable;
