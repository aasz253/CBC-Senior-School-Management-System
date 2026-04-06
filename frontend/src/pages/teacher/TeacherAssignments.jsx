import { useState, useEffect } from 'react';
import { Plus, FileText, Upload, X, Loader, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const TeacherAssignments = () => {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', subject: user?.assignedSubjects?.[0] || '', grade: user?.grade || '', assignedClass: user?.assignedClass || '', dueDate: '', maxScore: 100 });
  const [gradeData, setGradeData] = useState({ grade: '', feedback: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAssignments(); }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assignments');
      setAssignments(res.data.assignments);
    } catch (err) {
      showError('Failed to load assignments');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/assignments', formData);
      showSuccess('Assignment created');
      setShowModal(false);
      fetchAssignments();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create assignment');
    } finally { setSubmitting(false); }
  };

  const fetchSubmissions = async (id) => {
    try {
      const res = await api.get(`/assignments/${id}/submissions`);
      setSubmissions(res.data.submissions);
      setShowSubmissions(id);
    } catch (err) {
      showError('Failed to load submissions');
    }
  };

  const handleGrade = async (submissionId) => {
    try {
      await api.put(`/assignments/${showSubmissions}/submissions/${submissionId}`, {
        grade: parseFloat(gradeData.grade),
        feedback: gradeData.feedback,
      });
      showSuccess('Submission graded');
      fetchSubmissions(showSubmissions);
      setGradeData({ grade: '', feedback: '' });
    } catch (err) {
      showError('Failed to grade submission');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this assignment and all submissions?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      showSuccess('Assignment deleted');
      fetchAssignments();
    } catch (err) {
      showError('Failed to delete');
    }
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-600 mt-1">Create and manage assignments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> New Assignment</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-4">
          {assignments.length === 0 ? <p className="text-center text-gray-500 py-8">No assignments yet</p> : assignments.map(a => (
            <div key={a._id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-blue">{a.subject}</span>
                    <span className="badge badge-gray">Grade {a.grade}</span>
                    {isOverdue(a.dueDate) && !a.isClosed ? <span className="badge badge-red">Overdue</span> : <span className="badge badge-green">Active</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{a.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Due: {new Date(a.dueDate).toLocaleDateString('en-KE')}</span>
                    <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> Max: {a.maxScore} pts</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => fetchSubmissions(a._id)} className="btn btn-secondary text-sm">View Submissions</button>
                  <button onClick={() => handleDelete(a._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold">New Assignment</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" required /></div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Subject</label><select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="input">{(user?.assignedSubjects || []).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="label">Due Date</label><input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="input" required /></div>
              </div>
              <div><label className="label">Max Score</label><input type="number" value={formData.maxScore} onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })} className="input" min="1" max="100" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">{submitting ? <span className="flex items-center justify-center"><Loader className="w-4 h-4 animate-spin mr-2" />Creating...</span> : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Submissions</h2>
              <button onClick={() => setShowSubmissions(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {submissions.length === 0 ? <p className="text-center text-gray-500 py-8">No submissions yet</p> : submissions.map(sub => (
                <div key={sub._id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{sub.studentId?.name}</p>
                      <p className="text-xs text-gray-500">{sub.studentId?.admissionNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.isLate && <span className="badge badge-red">Late</span>}
                      {sub.isGraded ? <span className="badge badge-green flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Graded: {sub.grade}</span> : <span className="badge badge-yellow">Pending</span>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Submitted: {new Date(sub.submittedAt).toLocaleString('en-KE')}</p>
                  {!sub.isGraded && (
                    <div className="flex gap-2 mt-2">
                      <input type="number" placeholder="Grade" value={gradeData.grade} onChange={(e) => setGradeData({ ...gradeData, grade: e.target.value })} className="input w-24 text-sm" />
                      <input type="text" placeholder="Feedback" value={gradeData.feedback} onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })} className="input flex-1 text-sm" />
                      <button onClick={() => handleGrade(sub._id)} className="btn btn-primary text-sm">Grade</button>
                    </div>
                  )}
                  {sub.isGraded && sub.feedback && <p className="text-sm text-gray-600 mt-2">Feedback: {sub.feedback}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignments;
