import { useState, useEffect } from 'react';
import { BookOpen, Upload, Clock, CheckCircle, FileText, Loader } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const StudentAssignments = () => {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(null);
  const [submitData, setSubmitData] = useState({ textContent: '' });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

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
      await api.post(`/assignments/${showSubmitModal}/submit`, submitData);
      showSuccess('Assignment submitted successfully');
      setShowSubmitModal(null);
      setSubmitData({ textContent: '' });
      fetchAssignments();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'pending') return a.submissionStatus === 'pending';
    if (filter === 'submitted') return a.submissionStatus === 'submitted';
    if (filter === 'graded') return a.submissionStatus === 'graded';
    return true;
  });

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
        <p className="text-gray-600 mt-1">View and submit your assignments</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'submitted', label: 'Submitted' },
          { key: 'graded', label: 'Graded' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`btn text-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : filteredAssignments.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No assignments found</p></div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map(a => (
            <div key={a._id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-blue">{a.subject}</span>
                    {a.submissionStatus === 'graded' ? (
                      <span className="badge badge-green flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Graded: {a.submission?.grade}/{a.maxScore}</span>
                    ) : a.submissionStatus === 'submitted' ? (
                      <span className="badge badge-blue flex items-center gap-1"><FileText className="w-3 h-3" /> Submitted</span>
                    ) : isOverdue(a.dueDate) ? (
                      <span className="badge badge-red">Overdue</span>
                    ) : (
                      <span className="badge badge-yellow flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {new Date(a.dueDate).toLocaleDateString('en-KE')}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{a.description}</p>
                  {a.submission?.feedback && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">Teacher Feedback:</p>
                      <p className="text-sm text-green-700">{a.submission.feedback}</p>
                    </div>
                  )}
                </div>
                {a.submissionStatus === 'pending' && !isOverdue(a.dueDate) && (
                  <button onClick={() => setShowSubmitModal(a._id)} className="btn btn-primary text-sm flex items-center gap-1"><Upload className="w-4 h-4" /> Submit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Submit Assignment</h2>
              <button onClick={() => setShowSubmitModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><BookOpen className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Your Answer</label><textarea value={submitData.textContent} onChange={(e) => setSubmitData({ ...submitData, textContent: e.target.value })} className="input" rows={6} placeholder="Type your answer here..." required /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSubmitModal(null)} className="btn flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">{submitting ? <span className="flex items-center justify-center"><Loader className="w-4 h-4 animate-spin mr-2" />Submitting...</span> : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
