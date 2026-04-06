import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Search,
  Plus,
  Edit,
  X,
  Loader,
  ChevronLeft,
  ChevronRight,
  Filter,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

const AdminFees = () => {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeFormData, setFeeFormData] = useState({
    grade: '',
    term: '',
    year: '',
    amount: '',
    description: '',
  });
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  const itemsPerPage = 10;
  const grades = ['all', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  useEffect(() => {
    fetchData();
  }, [currentPage, gradeFilter, balanceFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, studentsRes, feesRes] = await Promise.all([
        api.get('/admin/fees/stats'),
        api.get('/admin/fees/students', {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            ...(gradeFilter !== 'all' && { grade: gradeFilter }),
            ...(balanceFilter !== 'all' && { balanceStatus: balanceFilter }),
            ...(search && { search }),
          },
        }),
        api.get('/admin/fees/structures'),
      ]);

      setStats(statsRes.data);
      setStudents(studentsRes.data.students);
      setTotalPages(studentsRes.data.totalPages);
      setTotalStudents(studentsRes.data.total);
      setFeeStructures(feesRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load fee data');
      showError('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData();
  };

  const openFeeModal = () => {
    setFeeFormData({ grade: '', term: '', year: new Date().getFullYear().toString(), amount: '', description: '' });
    setShowFeeModal(true);
  };

  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    setPaymentFormData({ amount: student.balance?.toString() || '', reference: '', date: new Date().toISOString().split('T')[0] });
    setShowPaymentModal(true);
  };

  const closeModal = () => {
    setShowFeeModal(false);
    setShowPaymentModal(false);
    setSelectedStudent(null);
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/fees/structures', feeFormData);
      showSuccess('Fee structure created successfully');
      closeModal();
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create fee structure');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/admin/fees/payments`, {
        studentId: selectedStudent._id || selectedStudent.id,
        amount: parseFloat(paymentFormData.amount),
        reference: paymentFormData.reference,
        date: paymentFormData.date,
      });
      showSuccess('Payment recorded successfully');
      closeModal();
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString()}`;
  };

  const statCards = [
    {
      title: 'Total Expected',
      value: formatCurrency(stats?.totalExpected),
      icon: DollarSign,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Collected',
      value: formatCurrency(stats?.totalCollected),
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Total Outstanding',
      value: formatCurrency(stats?.totalOutstanding),
      icon: AlertCircle,
      color: 'bg-red-500',
    },
    {
      title: 'Collection Rate',
      value: `${stats?.collectionRate || 0}%`,
      icon: CheckCircle,
      color: 'bg-emerald-500',
    },
  ];

  const pieData = [
    { name: 'Fully Paid', value: stats?.fullyPaidCount || 0 },
    { name: 'Partially Paid', value: stats?.partiallyPaidCount || 0 },
    { name: 'Unpaid', value: stats?.unpaidCount || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-gray-600 mt-1">Track and manage student fees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openFeeModal} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Set Fee Structure
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Collection by Grade</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.byGrade || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="grade" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="expected" fill="#2563eb" name="Expected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or admission number..."
                className="input pl-10"
              />
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={gradeFilter}
              onChange={(e) => { setGradeFilter(e.target.value); setCurrentPage(1); }}
              className="input py-2"
            >
              {grades.map((g) => (
                <option key={g} value={g}>{g === 'all' ? 'All Grades' : g}</option>
              ))}
            </select>
            <select
              value={balanceFilter}
              onChange={(e) => { setBalanceFilter(e.target.value); setCurrentPage(1); }}
              className="input py-2"
            >
              <option value="all">All Balances</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
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

      {/* Student Balances Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Student Fee Balances</h3>
          <button className="btn flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header text-left">Student</th>
                <th className="table-header text-left">Grade</th>
                <th className="table-header text-right">Total Fees</th>
                <th className="table-header text-right">Paid</th>
                <th className="table-header text-right">Balance</th>
                <th className="table-header text-center">Status</th>
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
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-cell text-center py-12 text-gray-500">
                    No students found
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id || student.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.admissionNumber}</p>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">{student.grade}</td>
                    <td className="table-cell text-right">{formatCurrency(student.totalFees)}</td>
                    <td className="table-cell text-right text-green-600">{formatCurrency(student.paid)}</td>
                    <td className="table-cell text-right font-medium text-red-600">{formatCurrency(student.balance)}</td>
                    <td className="table-cell text-center">
                      {student.balance <= 0 ? (
                        <span className="badge bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Paid</span>
                      ) : student.paid > 0 ? (
                        <span className="badge bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Partial</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Unpaid</span>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      <button
                        onClick={() => openPaymentModal(student)}
                        className="btn btn-primary text-xs py-1.5 px-3"
                        disabled={student.balance <= 0}
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && students.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalStudents)} of {totalStudents}
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

      {/* Set Fee Structure Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Set Fee Structure</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleFeeSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Grade</label>
                <select
                  value={feeFormData.grade}
                  onChange={(e) => setFeeFormData({ ...feeFormData, grade: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select Grade</option>
                  {grades.filter((g) => g !== 'all').map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Term</label>
                <select
                  value={feeFormData.term}
                  onChange={(e) => setFeeFormData({ ...feeFormData, term: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select Term</option>
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  <option value="3">Term 3</option>
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <input
                  type="number"
                  value={feeFormData.year}
                  onChange={(e) => setFeeFormData({ ...feeFormData, year: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Amount (KES)</label>
                <input
                  type="number"
                  value={feeFormData.amount}
                  onChange={(e) => setFeeFormData({ ...feeFormData, amount: e.target.value })}
                  className="input"
                  placeholder="e.g. 25000"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={feeFormData.description}
                  onChange={(e) => setFeeFormData({ ...feeFormData, description: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Fee breakdown description..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : 'Save Fee Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-blue-50 mx-6 mt-4 rounded-lg">
              <p className="text-sm text-gray-600">Student: <strong>{selectedStudent.name}</strong></p>
              <p className="text-sm text-gray-600">Outstanding Balance: <strong className="text-red-600">{formatCurrency(selectedStudent.balance)}</strong></p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Payment Amount (KES)</label>
                <input
                  type="number"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className="input"
                  max={selectedStudent.balance}
                  required
                />
              </div>
              <div>
                <label className="label">Reference / Transaction ID</label>
                <input
                  type="text"
                  value={paymentFormData.reference}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                  className="input"
                  placeholder="e.g. M-PESA code"
                  required
                />
              </div>
              <div>
                <label className="label">Payment Date</label>
                <input
                  type="date"
                  value={paymentFormData.date}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFees;
