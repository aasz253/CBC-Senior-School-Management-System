import { useState, useEffect } from 'react';
import { Save, Loader, Search, FileDown } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const CBC_SUBJECTS = [
  'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics',
  'History & Government', 'Geography', 'CRE/IRE', 'Agriculture',
  'Business Studies', 'Computer Studies', 'Home Science', 'Art & Design',
  'Music', 'Physical Education', 'French', 'German',
];

const TeacherMarks = () => {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [filters, setFilters] = useState({
    grade: user?.classTeacherOf || '',
    term: '',
    year: '2026',
    subject: user?.assignedSubjects?.[0] || '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const subjects = user?.assignedSubjects?.length > 0
    ? user.assignedSubjects
    : CBC_SUBJECTS;

  useEffect(() => {
    if (filters.grade && filters.term && filters.subject) {
      fetchStudentsAndMarks();
    }
  }, [filters.grade, filters.term, filters.subject]);

  const fetchStudentsAndMarks = async () => {
    try {
      setLoading(true);
      const [studentsRes, marksRes] = await Promise.all([
        api.get(`/users/students?grade=${filters.grade}`),
        api.get(`/marks?grade=${filters.grade}&term=${filters.term}&year=${filters.year}&subject=${filters.subject}`),
      ]);
      setStudents(studentsRes.data.users || []);
      const marksMap = {};
      (marksRes.data.marks || []).forEach(m => {
        const sid = typeof m.studentId === 'string' ? m.studentId : m.studentId?._id;
        if (sid) marksMap[sid] = m;
      });
      setMarks(marksMap);
    } catch (err) {
      showError('Failed to load data');
    } finally { setLoading(false); }
  };

  const updateMark = (studentId, field, value) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), studentId, grade: filters.grade, term: parseInt(filters.term), year: parseInt(filters.year), subject: filters.subject, [field]: value },
    }));
  };

  const getCompetency = (score) => {
    if (score >= 80) return { level: 'E', label: 'Exceeding' };
    if (score >= 65) return { level: 'M', label: 'Meeting' };
    if (score >= 50) return { level: 'A', label: 'Approaching' };
    return { level: 'B', label: 'Beginning' };
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const marksArray = Object.values(marks).filter(m => m.score !== undefined && m.score !== '').map(m => {
        const comp = getCompetency(parseInt(m.score));
        return {
          ...m,
          grade: filters.grade,
          term: parseInt(filters.term),
          year: parseInt(filters.year),
          subject: filters.subject,
          pathway: 'STEM',
          score: parseInt(m.score),
          competencyLevel: comp.level,
          competencyLabel: comp.label,
          teacherId: user.id,
          assessmentType: 'End of Term',
        };
      });
      if (marksArray.length === 0) return showError('No marks to save');
      await api.post('/marks/bulk', { marks: marksArray });
      showSuccess(`${marksArray.length} marks saved successfully`);
      fetchStudentsAndMarks();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save marks');
    } finally { setSaving(false); }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const res = await api.get(`/reports/marks/${filters.grade}?term=${filters.term}&year=${filters.year}&subject=${filters.subject}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `marks_Grade_${filters.grade}_T${filters.term}_${filters.subject}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Marks report downloaded');
    } catch (err) {
      showError('Failed to generate PDF');
    } finally { setExporting(false); }
  };

  const filteredStudents = students.filter(s => {
    if (!search) return true;
    const s2 = search.toLowerCase();
    return s.name.toLowerCase().includes(s2) || (s.admissionNumber || '').toLowerCase().includes(s2);
  });

  const competencyColors = { E: 'badge-green', M: 'badge-blue', A: 'badge-yellow', B: 'badge-red' };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Marks</h1>
          <p className="text-gray-600 mt-1">
            {filters.grade ? `Grade ${filters.grade}` : 'Select a class'}
            {user?.classTeacherOf && ` (Class Teacher)`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} disabled={exporting || !filters.grade} className="btn flex items-center gap-2 text-sm">
            {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Export PDF
          </button>
          <button onClick={handleSaveAll} disabled={saving} className="btn btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save All Marks'}
          </button>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={filters.grade} onChange={(e) => setFilters({ ...filters, grade: e.target.value })} className="input py-2">
            <option value="">Select Grade</option>
            {user?.classTeacherOf ? (
              <option value={user.classTeacherOf}>Grade {user.classTeacherOf} (My Class)</option>
            ) : (
              ['7','8','9','10','11','12'].map(g => <option key={g} value={g}>Grade {g}</option>)
            )}
          </select>
          <select value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} className="input py-2">
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.term} onChange={(e) => setFilters({ ...filters, term: e.target.value })} className="input py-2">
            <option value="">Select Term</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
          <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className="input py-2">
            {['2026','2027','2028','2029','2030'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="input pl-10 py-2" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : !filters.subject || !filters.term ? (
        <div className="card text-center py-12"><p className="text-gray-500">Please select grade, subject and term to enter marks</p></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="table-header">#</th>
                  <th className="table-header">Student</th>
                  <th className="table-header">Score (0-100)</th>
                  <th className="table-header">Competency</th>
                  <th className="table-header">Remark</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan="5" className="table-cell text-center py-12 text-gray-500">No students found</td></tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const mark = marks[student._id] || {};
                    const comp = mark.score ? getCompetency(parseInt(mark.score)) : null;
                    return (
                      <tr key={student._id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="table-cell text-sm text-gray-500">{idx + 1}</td>
                        <td className="table-cell">
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.admissionNumber}</p>
                        </td>
                        <td className="table-cell">
                          <input type="number" min="0" max="100" value={mark.score || ''} onChange={(e) => updateMark(student._id, 'score', e.target.value)} className="input w-24" placeholder="0-100" />
                        </td>
                        <td className="table-cell">
                          {comp ? <span className={`badge ${competencyColors[comp.level]}`}>{comp.label} ({comp.level})</span> : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="table-cell">
                          <input type="text" value={mark.teacherRemark || ''} onChange={(e) => updateMark(student._id, 'teacherRemark', e.target.value)} className="input w-48" placeholder="Add remark..." />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherMarks;
