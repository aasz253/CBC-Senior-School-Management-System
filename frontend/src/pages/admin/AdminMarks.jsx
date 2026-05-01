import { useState, useEffect } from 'react';
import {
  Award,
  Search,
  Filter,
  Edit,
  Loader,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const AdminMarks = () => {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('2026');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMark, setSelectedMark] = useState(null);
  const [editFormData, setEditFormData] = useState({ score: '', teacherRemark: '' });
  const [submitting, setSubmitting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  const grades = ['all', 'Grade 10', 'Grade 11', 'Grade 12'];
  const terms = ['all', '1', '2', '3'];
  const subjects = ['all', 'Mathematics', 'English', 'Kiswahili', 'Science',
    'Social Studies', 'CRE', 'Agriculture', 'Home Science',
    'Physical Education', 'Art & Craft', 'Music'];

  useEffect(() => {
    fetchData();
  }, [gradeFilter, termFilter, yearFilter, subjectFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (gradeFilter !== 'all') params.grade = gradeFilter;
      if (termFilter !== 'all') params.term = termFilter;
      if (yearFilter !== 'all') params.year = yearFilter;
      if (subjectFilter !== 'all') params.subject = subjectFilter;

      const res = await api.get('/admin/marks', { params });
      setMarks(res.data.marks || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load marks');
      showError('Failed to load marks data');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (mark) => {
    setSelectedMark(mark);
    setEditFormData({
      score: mark.score?.toString() || '',
      teacherRemark: mark.teacherRemark || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/marks/${selectedMark._id}`, {
        score: parseFloat(editFormData.score),
        teacherRemark: editFormData.teacherRemark,
      });
      showSuccess('Mark updated successfully');
      setShowEditModal(false);
      setSelectedMark(null);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update mark');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    const currentGrade = gradeFilter !== 'all' ? gradeFilter : 'Grade 10';
    const term = termFilter !== 'all' ? termFilter : prompt('Enter term (1, 2, or 3):', '1');
    if (!term) return;
    const year = yearFilter !== 'all' ? yearFilter : prompt('Enter year:', '2026');
    if (!year) return;
    try {
      const response = await api.get(`/reports/marks/${currentGrade}?term=${term}&year=${year}&subject=${subjectFilter}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `marks_${currentGrade.replace(' ', '_')}_T${term}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Marks report downloaded');
    } catch (err) {
      showError('Failed to generate marks report');
    }
  };

  const getCompetency = (score) => {
    if (score >= 80) return { level: 'E', label: 'Exceeding', color: 'bg-green-100 text-green-800' };
    if (score >= 65) return { level: 'M', label: 'Meeting', color: 'bg-blue-100 text-blue-800' };
    if (score >= 50) return { level: 'A', label: 'Approaching', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'B', label: 'Beginning', color: 'bg-red-100 text-red-800' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks Management</h1>
          <p className="text-gray-600 mt-1">View, edit, and export student marks</p>
        </div>
        <button onClick={handleExportPDF} className="btn btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <Filter className="w-4 h-4 text-gray-500 mt-2" />
          <select
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); }}
            className="input py-2"
          >
            {grades.map((g) => <option key={g} value={g}>{g === 'all' ? 'All Grades' : g}</option>)}
          </select>
          <select
            value={termFilter}
            onChange={(e) => { setTermFilter(e.target.value); }}
            className="input py-2"
          >
            {terms.map((t) => <option key={t} value={t}>{t === 'all' ? 'All Terms' : `Term ${t}`}</option>)}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); }}
            className="input py-2"
          >
            {['2025', '2026', '2027'].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={subjectFilter}
            onChange={(e) => { setSubjectFilter(e.target.value); }}
            className="input py-2"
          >
            {subjects.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>)}
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={fetchData} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      {/* Marks Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Student Marks ({marks.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header text-left">Student</th>
                <th className="table-header text-left">Subject</th>
                <th className="table-header text-center">Score</th>
                <th className="table-header text-center">Competency</th>
                <th className="table-header text-center">Term</th>
                <th className="table-header text-left">Teacher Remark</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-cell text-center py-12">
                    <Loader className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : marks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-cell text-center py-12 text-gray-500">
                    <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No marks found. Teachers haven't entered marks yet.</p>
                  </td>
                </tr>
              ) : (
                marks.map((mark) => {
                  const comp = getCompetency(mark.score || 0);
                  return (
                    <tr key={mark._id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">{mark.studentName}</p>
                          <p className="text-sm text-gray-500">{mark.admissionNumber}</p>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600">{mark.subject}</td>
                      <td className="table-cell text-center font-semibold text-lg">{mark.score ?? '-'}</td>
                      <td className="table-cell text-center">
                        <span className={`badge px-2 py-1 rounded-full text-xs font-medium ${comp.color}`}>
                          {comp.level} - {comp.label}
                        </span>
                      </td>
                      <td className="table-cell text-center">T{mark.term}, {mark.year}</td>
                      <td className="table-cell text-gray-600 text-sm">{mark.teacherRemark || '-'}</td>
                      <td className="table-cell text-center">
                        <button
                          onClick={() => openEditModal(mark)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Mark"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedMark && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Edit Mark</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 mx-6 mt-4 rounded-lg">
              <p className="text-sm text-gray-600"><strong>{selectedMark.studentName}</strong> - {selectedMark.subject}</p>
              <p className="text-sm text-gray-500">Grade {selectedMark.grade}, Term {selectedMark.term} {selectedMark.year}</p>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editFormData.score}
                  onChange={(e) => setEditFormData({ ...editFormData, score: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Teacher Remark</label>
                <textarea
                  value={editFormData.teacherRemark}
                  onChange={(e) => setEditFormData({ ...editFormData, teacherRemark: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="e.g. Good effort, needs improvement in..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : 'Update Mark'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMarks;
