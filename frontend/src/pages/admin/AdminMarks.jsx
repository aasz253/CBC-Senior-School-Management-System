import { useState, useEffect } from 'react';
import {
  Award,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const AdminMarks = () => {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMarks, setTotalMarks] = useState(0);
  const [stats, setStats] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMark, setSelectedMark] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  const itemsPerPage = 10;
  const grades = ['all', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const terms = ['all', '1', '2', '3'];
  const years = ['all', '2024', '2025', '2026', '2027'];
  const subjects = ['all', 'Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies',
    'CRE', 'Agriculture', 'Home Science', 'Physical Education', 'Art & Craft', 'Music'];

  useEffect(() => {
    fetchData();
  }, [currentPage, gradeFilter, termFilter, yearFilter, subjectFilter, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...(gradeFilter !== 'all' && { grade: gradeFilter }),
        ...(termFilter !== 'all' && { term: termFilter }),
        ...(yearFilter !== 'all' && { year: yearFilter }),
        ...(subjectFilter !== 'all' && { subject: subjectFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search }),
      };

      const [marksRes, statsRes, performanceRes] = await Promise.all([
        api.get('/admin/marks', { params }),
        api.get('/admin/marks/stats', { params: { term: termFilter !== 'all' ? termFilter : undefined, year: yearFilter !== 'all' ? yearFilter : undefined } }),
        api.get('/admin/marks/performance', { params: { term: termFilter !== 'all' ? termFilter : undefined, year: yearFilter !== 'all' ? yearFilter : undefined } }),
      ]);

      setMarks(marksRes.data.marks);
      setTotalPages(marksRes.data.totalPages);
      setTotalMarks(marksRes.data.total);
      setStats(statsRes.data);
      setPerformanceData(performanceRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load marks');
      showError('Failed to load marks data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData();
  };

  const openDetailModal = (mark) => {
    setSelectedMark(mark);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedMark(null);
  };

  const handleApprove = async (markId) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/marks/${markId}/approve`);
      showSuccess('Marks approved successfully');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to approve marks');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (markId) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/marks/${markId}/reject`);
      showSuccess('Marks rejected');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reject marks');
    } finally {
      setActionLoading(false);
    }
  };

  const getGrade = (score) => {
    if (score >= 80) return { grade: 'A', color: 'text-green-600 bg-green-50' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-600 bg-blue-50' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-600 bg-yellow-50' };
    if (score >= 50) return { grade: 'D', color: 'text-orange-600 bg-orange-50' };
    return { grade: 'E', color: 'text-red-600 bg-red-50' };
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`badge px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks Management</h1>
          <p className="text-gray-600 mt-1">View, filter, and approve student marks</p>
        </div>
        <button className="btn flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <p className="text-sm font-medium text-gray-600">Average Score</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.averageScore || 0}%</p>
          </div>
          <div className="card p-6">
            <p className="text-sm font-medium text-gray-600">Highest Score</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats?.highestScore || 0}%</p>
          </div>
          <div className="card p-6">
            <p className="text-sm font-medium text-gray-600">Lowest Score</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats?.lowestScore || 0}%</p>
          </div>
          <div className="card p-6">
            <p className="text-sm font-medium text-gray-600">Pending Approval</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats?.pendingCount || 0}</p>
          </div>
        </div>
      )}

      {/* Performance Chart */}
      {performanceData.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Subject</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="average" fill="#2563eb" name="Average Score" radius={[4, 4, 0, 0]} />
              <Bar dataKey="highest" fill="#10b981" name="Highest Score" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name or admission number..."
                className="input pl-10"
              />
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={gradeFilter}
                onChange={(e) => { setGradeFilter(e.target.value); setCurrentPage(1); }}
                className="input py-2"
              >
                {grades.map((g) => <option key={g} value={g}>{g === 'all' ? 'All Grades' : g}</option>)}
              </select>
            </div>
            <select
              value={termFilter}
              onChange={(e) => { setTermFilter(e.target.value); setCurrentPage(1); }}
              className="input py-2"
            >
              {terms.map((t) => <option key={t} value={t}>{t === 'all' ? 'All Terms' : `Term ${t}`}</option>)}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
              className="input py-2"
            >
              {years.map((y) => <option key={y} value={y}>{y === 'all' ? 'All Years' : y}</option>)}
            </select>
            <select
              value={subjectFilter}
              onChange={(e) => { setSubjectFilter(e.target.value); setCurrentPage(1); }}
              className="input py-2"
            >
              {subjects.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="input py-2"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </form>
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header text-left">Student</th>
                <th className="table-header text-left">Subject</th>
                <th className="table-header text-left">Grade</th>
                <th className="table-header text-center">CAT 1</th>
                <th className="table-header text-center">CAT 2</th>
                <th className="table-header text-center">Exam</th>
                <th className="table-header text-center">Total</th>
                <th className="table-header text-center">Grade</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="table-cell text-center py-12">
                    <Loader className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : marks.length === 0 ? (
                <tr>
                  <td colSpan="10" className="table-cell text-center py-12 text-gray-500">
                    <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No marks found</p>
                  </td>
                </tr>
              ) : (
                marks.map((mark) => {
                  const gradeInfo = getGrade(mark.total);
                  return (
                    <tr key={mark._id || mark.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">{mark.studentName}</p>
                          <p className="text-sm text-gray-500">{mark.admissionNumber}</p>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600">{mark.subject}</td>
                      <td className="table-cell text-gray-600">{mark.grade}</td>
                      <td className="table-cell text-center">{mark.cat1 ?? '-'}</td>
                      <td className="table-cell text-center">{mark.cat2 ?? '-'}</td>
                      <td className="table-cell text-center">{mark.exam ?? '-'}</td>
                      <td className="table-cell text-center font-semibold">{mark.total ?? '-'}</td>
                      <td className="table-cell text-center">
                        <span className={`badge px-2 py-1 rounded-full text-xs font-medium ${gradeInfo.color}`}>
                          {gradeInfo.grade}
                        </span>
                      </td>
                      <td className="table-cell text-center">{getStatusBadge(mark.status)}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetailModal(mark)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {mark.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(mark._id || mark.id)}
                                disabled={actionLoading}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(mark._id || mark.id)}
                                disabled={actionLoading}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && marks.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalMarks)} of {totalMarks}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 5) page = i + 1;
                else if (currentPage <= 3) page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else page = currentPage - 2 + i;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === page ? 'bg-primary-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedMark && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Mark Details</h2>
              <button onClick={closeDetailModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Student</p>
                  <p className="font-medium text-gray-900">{selectedMark.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Admission No.</p>
                  <p className="font-medium text-gray-900">{selectedMark.admissionNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subject</p>
                  <p className="font-medium text-gray-900">{selectedMark.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Grade</p>
                  <p className="font-medium text-gray-900">{selectedMark.grade}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Term</p>
                  <p className="font-medium text-gray-900">Term {selectedMark.term}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Year</p>
                  <p className="font-medium text-gray-900">{selectedMark.year}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Score Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">CAT 1 (30%)</span>
                    <span className="font-medium">{selectedMark.cat1 ?? '-'}/30</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CAT 2 (30%)</span>
                    <span className="font-medium">{selectedMark.cat2 ?? '-'}/30</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exam (40%)</span>
                    <span className="font-medium">{selectedMark.exam ?? '-'}/40</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="font-medium text-gray-900">Total</span>
                    <span className="font-bold text-lg">{selectedMark.total ?? '-'}/100</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>Status: {getStatusBadge(selectedMark.status)}</div>
                {selectedMark.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { handleReject(selectedMark._id || selectedMark.id); closeDetailModal(); }}
                      className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => { handleApprove(selectedMark._id || selectedMark.id); closeDetailModal(); }}
                      className="btn bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMarks;
