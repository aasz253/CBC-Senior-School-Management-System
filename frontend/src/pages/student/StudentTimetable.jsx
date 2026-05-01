import { useState, useEffect, useMemo } from 'react';
import { Clock, Loader, FileDown } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const StudentTimetable = () => {
  const { user } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchTimetable(); }, []);

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/timetable');
      setEntries(res.data.timetable || []);
    } catch (err) { showError('Failed to load timetable'); }
    finally { setLoading(false); }
  };

  const periodList = useMemo(() => {
    const seen = new Set();
    const sorted = [...entries].sort((a, b) => a.period - b.period);
    return sorted.filter(e => {
      if (seen.has(e.period)) return false;
      seen.add(e.period);
      return true;
    }).map(e => ({
      period: e.period,
      startTime: e.startTime,
      endTime: e.endTime,
      label: e.subject ? `Period ${e.period}` : (e.periodType === 'break' ? 'Break' : e.periodType === 'lunch' ? 'Lunch' : e.periodType === 'assembly' ? 'Assembly' : `Period ${e.period}`),
      type: e.periodType || 'regular',
    }));
  }, [entries]);

  const groupedByDay = useMemo(() => {
    const grouped = {};
    entries.forEach(e => {
      if (!grouped[e.day]) grouped[e.day] = [];
      grouped[e.day].push(e);
    });
    return grouped;
  }, [entries]);

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const res = await api.get(`/reports/timetable?grade=${user.grade}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timetable_Grade_${user.grade}.pdf`);
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
          <p className="text-gray-600 mt-1">Grade {user.grade} - Weekly Schedule</p>
        </div>
        <button onClick={handleExportPDF} disabled={exporting} className="btn flex items-center gap-2 text-sm">
          {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Export PDF
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No timetable available yet</p></div>
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
              {periodList.map((slot, idx) => (
                <tr key={idx} className={slot.type !== 'regular' ? 'bg-yellow-50' : ''}>
                  <td className="border border-gray-200 p-2 text-center bg-gray-50">
                    <p className="text-xs font-medium">{slot.label}</p>
                    <p className="text-[10px] text-gray-500">{slot.startTime} - {slot.endTime}</p>
                  </td>
                  {DAYS.map(day => {
                    const entry = (groupedByDay[day] || []).find(e => e.period === slot.period);
                    return (
                      <td key={`${day}-${slot.period}`} className="border border-gray-200 p-2 text-sm h-14 align-top">
                        {entry ? (
                          <div>
                            <p className="font-medium text-gray-900 truncate">{entry.subject}</p>
                            <p className="text-[10px] text-gray-500 truncate">{entry.teacherId?.name}{entry.room ? ` | ${entry.room}` : ''}</p>
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

export default StudentTimetable;
