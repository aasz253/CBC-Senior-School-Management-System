import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader, FileDown, Settings2, Clock, GripVertical, Save, X } from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

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

  // Periods management - stored as array in state
  const [periods, setPeriods] = useState([]);
  const [showPeriodManager, setShowPeriodManager] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [customSubject, setCustomSubject] = useState('');

  useEffect(() => {
    fetchTeachers();
    loadDefaultPeriods();
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [selectedGrade]);

  const loadDefaultPeriods = () => {
    const defaults = [
      { id: 1, label: 'Period 1', startTime: '06:00', endTime: '06:40', type: 'regular' },
      { id: 2, label: 'Period 2', startTime: '06:40', endTime: '07:20', type: 'regular' },
      { id: 3, label: 'Period 3', startTime: '07:20', endTime: '08:00', type: 'regular' },
      { id: 4, label: 'Period 4', startTime: '08:00', endTime: '08:40', type: 'regular' },
      { id: 5, label: 'Period 5', startTime: '08:40', endTime: '09:20', type: 'regular' },
      { id: 6, label: 'Period 6', startTime: '09:20', endTime: '10:00', type: 'regular' },
      { id: 7, label: 'Break', startTime: '10:00', endTime: '10:30', type: 'break' },
      { id: 8, label: 'Period 7', startTime: '10:30', endTime: '11:10', type: 'regular' },
      { id: 9, label: 'Period 8', startTime: '11:10', endTime: '11:50', type: 'regular' },
      { id: 10, label: 'Period 9', startTime: '11:50', endTime: '12:30', type: 'regular' },
      { id: 11, label: 'Period 10', startTime: '12:30', endTime: '13:10', type: 'regular' },
      { id: 12, label: 'Lunch', startTime: '13:10', endTime: '13:50', type: 'lunch' },
      { id: 13, label: 'Period 11', startTime: '13:50', endTime: '14:30', type: 'regular' },
      { id: 14, label: 'Period 12', startTime: '14:30', endTime: '15:10', type: 'regular' },
      { id: 15, label: 'Period 13', startTime: '15:10', endTime: '15:50', type: 'regular' },
      { id: 16, label: 'Period 14', startTime: '15:50', endTime: '16:30', type: 'regular' },
      { id: 17, label: 'Period 15', startTime: '16:30', endTime: '17:10', type: 'regular' },
      { id: 18, label: 'Period 16', startTime: '17:10', endTime: '17:50', type: 'regular' },
      { id: 19, label: 'Assembly', startTime: '17:50', endTime: '18:00', type: 'assembly' },
    ];
    setPeriods(defaults);
  };

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
    } catch (err) { showError('Failed to load timetable'); }
    finally { setLoading(false); }
  };

  // Period management functions
  const addPeriod = () => {
    const newId = periods.length > 0 ? Math.max(...periods.map(p => p.id)) + 1 : 1;
    setPeriods([...periods, { id: newId, label: `Period ${newId}`, startTime: '08:00', endTime: '08:40', type: 'regular' }]);
  };

  const removePeriod = (id) => {
    if (periods.length <= 1) return;
    setPeriods(periods.filter(p => p.id !== id));
  };

  const updatePeriod = (id, field, value) => {
    setPeriods(periods.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const movePeriod = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= periods.length) return;
    const newPeriods = [...periods];
    [newPeriods[index], newPeriods[newIdx]] = [newPeriods[newIdx], newPeriods[index]];
    setPeriods(newPeriods);
  };

  // Cell editing functions
  const handleEditCell = (day, periodId, existingEntry) => {
    setEditingCell({ day, periodId });
    setCustomSubject(existingEntry?.subject || '');
  };

  const handleSaveCell = async (cellData) => {
    setSaving(true);
    try {
      const key = `${cellData.day}-${cellData.period}`;
      const existing = entries[key];
      const periodInfo = periods.find(p => p.id === cellData.period);
      const data = {
        grade: selectedGrade,
        assignedClass: `Grade ${selectedGrade}`,
        day: cellData.day,
        period: cellData.period,
        startTime: periodInfo?.startTime || '08:00',
        endTime: periodInfo?.endTime || '08:40',
        subject: cellData.subject || '',
        teacherId: cellData.teacherId || '',
        room: cellData.room || '',
        periodType: periodInfo?.type || 'regular',
      };

      if (!data.subject && !data.teacherId) {
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

  const handleSaveAllPeriods = async () => {
    setSaving(true);
    try {
      // Update all entries for this grade with new times
      const res = await api.get(`/timetable?grade=${selectedGrade}`);
      const allEntries = res.data.timetable || [];
      const updates = [];
      for (const entry of allEntries) {
        const periodInfo = periods.find(p => p.id === entry.period);
        if (periodInfo) {
          updates.push(api.put(`/timetable/${entry._id}`, {
            startTime: periodInfo.startTime,
            endTime: periodInfo.endTime,
          }));
        }
      }
      await Promise.all(updates);
      setShowPeriodManager(false);
      showSuccess('Period times updated');
      fetchTimetable();
    } catch (err) {
      showError('Failed to update periods');
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

  const getCellEntry = (day, periodId) => entries[`${day}-${periodId}`];

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable Manager</h1>
          <p className="text-gray-600 mt-1">Manage class schedules (click cells to edit subjects, manage periods below)</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="input py-2 w-32">
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <button onClick={() => setShowPeriodManager(!showPeriodManager)} className="btn flex items-center gap-2 text-sm">
            <Settings2 className="w-4 h-4" /> Manage Periods
          </button>
          <button onClick={handleExportPDF} disabled={exporting} className="btn flex items-center gap-2 text-sm">
            {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Period Manager Panel */}
      {showPeriodManager && (
        <div className="card mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Manage Periods & Times</h3>
            <div className="flex gap-2">
              <button onClick={addPeriod} className="btn btn-primary text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add Period
              </button>
              <button onClick={handleSaveAllPeriods} disabled={saving} className="btn text-sm flex items-center gap-1">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Times'}
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {periods.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => movePeriod(idx, -1)} disabled={idx === 0} className="p-0.5 disabled:opacity-30 hover:bg-gray-200 rounded">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button onClick={() => movePeriod(idx, 1)} disabled={idx === periods.length - 1} className="p-0.5 disabled:opacity-30 hover:bg-gray-200 rounded">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <span className="text-sm font-mono w-6 text-center text-gray-400">{idx + 1}</span>
                <input
                  type="text"
                  value={p.label}
                  onChange={(e) => updatePeriod(p.id, 'label', e.target.value)}
                  className="input py-1 w-32 text-sm"
                  placeholder="Label"
                />
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <input type="time" value={p.startTime} onChange={(e) => updatePeriod(p.id, 'startTime', e.target.value)} className="input py-1 w-28 text-sm" />
                  <span className="text-gray-400">-</span>
                  <input type="time" value={p.endTime} onChange={(e) => updatePeriod(p.id, 'endTime', e.target.value)} className="input py-1 w-28 text-sm" />
                </div>
                <select value={p.type} onChange={(e) => updatePeriod(p.id, 'type', e.target.value)} className="input py-1 w-28 text-sm">
                  <option value="regular">Regular</option>
                  <option value="break">Break</option>
                  <option value="lunch">Lunch</option>
                  <option value="assembly">Assembly</option>
                  <option value="games">Games</option>
                </select>
                <button onClick={() => removePeriod(p.id)} disabled={periods.length <= 1} className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timetable Grid */}
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm font-semibold text-gray-700 w-36">
                <div>Time</div>
                <div className="text-[10px] text-gray-400 font-normal">Label</div>
              </th>
              {DAYS.map(day => (
                <th key={day} className="border border-gray-200 bg-primary-600 p-2 text-sm font-semibold text-white">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(period => {
              const isSpecial = period.type !== 'regular';
              return (
                <tr key={period.id} className={isSpecial ? 'bg-yellow-50' : ''}>
                  <td className="border border-gray-200 p-2 text-center bg-gray-50">
                    <p className="text-sm font-medium">{period.label}</p>
                    <p className="text-xs text-gray-500">{period.startTime} - {period.endTime}</p>
                  </td>
                  {DAYS.map(day => {
                    const entry = getCellEntry(day, period.id);
                    return (
                      <td
                        key={`${day}-${period.id}`}
                        onClick={() => handleEditCell(day, period.id, entry)}
                        className={`border border-gray-200 p-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors h-20 align-top ${isSpecial ? 'bg-yellow-50/50' : ''}`}
                      >
                        {entry ? (
                          <div>
                            <p className="font-semibold text-gray-900 truncate">{entry.subject || 'Free'}</p>
                            <p className="text-xs text-gray-500 truncate">{entry.teacherId?.name || '-'}</p>
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

      {/* Edit Cell Modal */}
      {editingCell && (
        <EditCellModalWrapper
          editingCell={editingCell}
          periods={periods}
          teachers={teachers}
          existingEntry={getCellEntry(editingCell.day, editingCell.periodId)}
          customSubject={customSubject}
          setCustomSubject={setCustomSubject}
          saving={saving}
          onSave={handleSaveCell}
          onCancel={() => setEditingCell(null)}
        />
      )}
    </div>
  );
};

const EditCellModalWrapper = ({ editingCell, periods, teachers, existingEntry, customSubject, setCustomSubject, saving, onSave, onCancel }) => {
  const periodInfo = periods.find(p => p.id === editingCell.periodId);
  const isSpecial = periodInfo?.type !== 'regular';
  const [selectedSubject, setSelectedSubject] = useState(existingEntry?.subject || '');
  const [selectedTeacher, setSelectedTeacher] = useState(existingEntry?.teacherId?._id || '');
  const [room, setRoom] = useState(existingEntry?.room || '');

  const handleSave = () => {
    onSave({
      day: editingCell.day,
      period: editingCell.periodId,
      subject: selectedSubject,
      teacherId: selectedTeacher,
      room,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold">{editingCell.day}</h2>
            <p className="text-sm text-gray-500">{periodInfo?.label} | {periodInfo?.startTime} - {periodInfo?.endTime}</p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        {isSpecial ? (
          <div className="p-6">
            <div className="p-4 bg-yellow-50 rounded-lg text-center">
              <p className="font-medium text-gray-700">{periodInfo?.label}</p>
              <p className="text-sm text-gray-500">This is a {periodInfo?.type} period</p>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={onCancel} className="btn flex-1">Close</button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="label">Subject</label>
              <select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); if (e.target.value !== '__custom__') setCustomSubject(e.target.value); }} className="input">
                <option value="">-- Free Period --</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__custom__">+ Custom Subject...</option>
                {selectedSubject && !SUBJECTS.includes(selectedSubject) && <option value={selectedSubject}>{selectedSubject} (current)</option>}
              </select>
              {selectedSubject === '__custom__' && (
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => { setCustomSubject(e.target.value); setSelectedSubject(e.target.value); }}
                  className="input mt-2"
                  placeholder="Enter custom subject name"
                  autoFocus
                />
              )}
            </div>

            <div>
              <label className="label">Teacher</label>
              <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="input">
                <option value="">-- Select Teacher --</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Room</label>
              <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} className="input" placeholder="e.g. Room 3A" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onCancel} className="btn flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTimetable;
