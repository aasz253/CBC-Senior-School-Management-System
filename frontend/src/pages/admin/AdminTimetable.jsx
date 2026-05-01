import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Save, Loader, Clock, FileDown, Users, BookOpen } from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const PERIODS = [
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const GRADES = ['10', '11', '12'];
const SUBJECTS = [
  'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics',
  'History', 'Geography', 'CRE', 'Business Studies', 'Computer Science',
  'Agriculture', 'Music', 'Art & Design', 'Physical Education',
  'Home Science', 'French', 'German', 'Technical Drawing', 'Aviation',
];

const AdminTimetable = () => {
  const { error: showError, success: showSuccess } = useToast();
  const [selectedGrade, setSelectedGrade] = useState('10');
  const [teachers, setTeachers] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [selectedGrade]);

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/users?role=teacher&limit=1000');
      setTeachers(res.data.users || []);
    } catch (err) { console.error('Failed to fetch teachers'); }
  };

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/timetable?grade=${selectedGrade}`);
      const grouped = {};
      (res.data.timetable || []).forEach(e => {
        const key = `${e.day}-${e.period}`;
        grouped[key] = e;
      });
      setEntries(grouped);
    } catch (err) {
      showError('Failed to load timetable');
    } finally { setLoading(false); }
  };

  const handleEditCell = (day, period) => {
    setEditingCell({ day, period });
  };

  const handleSaveCell = async (cellData) => {
    setSaving(true);
    try {
      const key = `${cellData.day}-${cellData.period}`;
      const existing = entries[key];
      const data = {
        grade: selectedGrade,
        assignedClass: `Grade ${selectedGrade}`,
        day: cellData.day,
        period: cellData.period,
        startTime: PERIODS.find(p => p.period === cellData.period)?.startTime || '08:00',
        endTime: PERIODS.find(p => p.period === cellData.period)?.endTime || '08:40',
        subject: cellData.subject,
        teacherId: cellData.teacherId,
        room: cellData.room || '',
        periodType: PERIODS.find(p => p.period === cellData.period)?.type || 'regular',
      };

      if (cellData.subject === '' || cellData.teacherId === '') {
        if (existing) {
          await api.delete(`/timetable/${existing._id}`);
          const newEntries = { ...entries };
          delete newEntries[key];
          setEntries(newEntries);
        }
      } else if (existing) {
        const res = await api.put(`/timetable/${existing._id}`, data);
        setEntries({ ...entries, [key]: res.data.entry });
      } else {
        const res = await api.post('/timetable', data);
        setEntries({ ...entries, [key]: res.data.entry });
      }
      setEditingCell(null);
      showSuccess('Timetable updated');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const res = await api.get(`/reports/timetable?grade=${selectedGrade}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timetable_Grade_${selectedGrade}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Timetable downloaded');
    } catch (err) {
      showError('Failed to generate timetable PDF');
    } finally { setExporting(false); }
  };

  const getCellEntry = (day, period) => entries[`${day}-${period}`];

  const EditCellModal = () => {
    if (!editingCell) return null;
    const existing = entries[`${editingCell.day}-${editingCell.period}`];
    const periodInfo = PERIODS.find(p => p.period === editingCell.period);
    const isSpecial = periodInfo?.type !== 'regular';
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold">{editingCell.day} - {periodInfo?.label}</h2>
            <p className="text-sm text-gray-500">{periodInfo?.startTime} - {periodInfo?.endTime}</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target;
            handleSaveCell({
              day: editingCell.day,
              period: editingCell.period,
              subject: form.subject.value,
              teacherId: form.teacherId.value,
              room: form.room.value,
            });
          }} className="p-6 space-y-4">
            {isSpecial ? (
              <div>
                <label className="label">Type</label>
                <input type="text" value={periodInfo?.label || ''} className="input bg-gray-50" readOnly />
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Subject</label>
                  <select name="subject" className="input" defaultValue={existing?.subject || ''}>
                    <option value="">-- Free Period --</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Teacher</label>
                  <select name="teacherId" className="input" defaultValue={existing?.teacherId?._id || ''}>
                    <option value="">-- Select Teacher --</option>
                    {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Room</label>
                  <input name="room" type="text" className="input" defaultValue={existing?.room || ''} placeholder="e.g. Room 3A" />
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditingCell(null)} className="btn flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable Manager</h1>
          <p className="text-gray-600 mt-1">Manage class schedules (06:00 - 18:00)</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="input py-2 w-32">
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <button onClick={handleExportPDF} disabled={exporting} className="btn flex items-center gap-2 text-sm">
            {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Export PDF
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm font-semibold text-gray-700 w-28">Time</th>
              {DAYS.map(day => (
                <th key={day} className="border border-gray-200 bg-primary-600 p-2 text-sm font-semibold text-white">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map(period => {
              const isSpecial = period.type !== 'regular';
              return (
                <tr key={period.period} className={isSpecial ? 'bg-yellow-50' : ''}>
                  <td className="border border-gray-200 p-2 text-center bg-gray-50">
                    <p className="text-sm font-medium">{period.label}</p>
                    <p className="text-xs text-gray-500">{period.startTime} - {period.endTime}</p>
                  </td>
                  {DAYS.map(day => {
                    const entry = getCellEntry(day, period.period);
                    return (
                      <td
                        key={`${day}-${period.period}`}
                        onClick={() => handleEditCell(day, period.period)}
                        className={`border border-gray-200 p-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors h-16 align-top ${isSpecial ? 'bg-yellow-50/50' : ''}`}
                      >
                        {entry ? (
                          <div>
                            <p className="font-medium text-gray-900 truncate">{entry.subject}</p>
                            <p className="text-xs text-gray-500 truncate">{entry.teacherId?.name}</p>
                            {entry.room && <p className="text-xs text-gray-400 truncate">{entry.room}</p>}
                          </div>
                        ) : isSpecial ? (
                          <p className="text-center text-xs text-gray-400">{period.label}</p>
                        ) : (
                          <p className="text-center text-xs text-gray-300">Click to add</p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditCellModal />
    </div>
  );
};

export default AdminTimetable;
