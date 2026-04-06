import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Search, Filter, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualData, setManualData] = useState({ studentId: '', amount: '', paymentMethod: 'cash', transactionId: '', term: '', year: '2026' });
  const [students, setStudents] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();
  const itemsPerPage = 15;

  useEffect(() => { fetchData(); }, [currentPage, statusFilter]);
  useEffect(() => { fetchStudents(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage, limit: itemsPerPage });
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/payments?${params}`);
      setPayments(res.data.payments);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
    } catch (err) {
      showError('Failed to load payments');
    } finally { setLoading(false); }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/users?role=student&limit=1000');
      setStudents(res.data.users);
    } catch (err) { console.error('Failed to fetch students'); }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/payments/manual', {
        studentId: manualData.studentId,
        amount: parseFloat(manualData.amount),
        paymentMethod: manualData.paymentMethod,
        transactionId: manualData.transactionId || `MANUAL-${Date.now()}`,
        term: parseInt(manualData.term),
        year: parseInt(manualData.year),
      });
      showSuccess('Payment recorded successfully');
      setShowManualModal(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to record payment');
    } finally { setSubmitting(false); }
  };

  const filteredPayments = payments.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = p.studentId?.name?.toLowerCase() || '';
    const tid = p.transactionId?.toLowerCase() || '';
    return name.includes(s) || tid.includes(s);
  });

  const statusColors = { completed: 'badge-green', pending: 'badge-yellow', failed: 'badge-red', cancelled: 'badge-gray', reversed: 'badge-red' };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Logs</h1>
          <p className="text-gray-600 mt-1">{total} total transactions</p>
        </div>
        <button onClick={() => setShowManualModal(true)} className="btn btn-primary text-sm flex items-center gap-1"><DollarSign className="w-4 h-4" /> Record Manual Payment</button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by student name or transaction ID..." className="input pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="input py-2 w-40">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header">Student</th>
                <th className="table-header">Transaction ID</th>
                <th className="table-header">Method</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Term/Year</th>
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="table-cell text-center py-12"><Loader className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan="7" className="table-cell text-center py-12 text-gray-500">No payments found</td></tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="table-cell">
                      <p className="font-medium text-gray-900">{p.studentId?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{p.studentId?.admissionNumber || ''}</p>
                    </td>
                    <td className="table-cell text-xs font-mono">{p.transactionId}</td>
                    <td className="table-cell"><span className="badge badge-blue capitalize">{p.paymentMethod}</span></td>
                    <td className="table-cell font-semibold">KES {p.amount?.toLocaleString()}</td>
                    <td className="table-cell">Term {p.term || '-'}, {p.year || '-'}</td>
                    <td className="table-cell text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString('en-KE')}</td>
                    <td className="table-cell"><span className={`badge ${statusColors[p.status] || 'badge-gray'}`}>{p.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredPayments.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-600">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Payment Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Record Manual Payment</h2>
              <button onClick={() => setShowManualModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><AlertCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div><label className="label">Student</label><select value={manualData.studentId} onChange={(e) => setManualData({ ...manualData, studentId: e.target.value })} className="input" required><option value="">Select Student</option>{students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.admissionNumber})</option>)}</select></div>
              <div><label className="label">Amount (KES)</label><input type="number" value={manualData.amount} onChange={(e) => setManualData({ ...manualData, amount: e.target.value })} className="input" required min="1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Method</label><select value={manualData.paymentMethod} onChange={(e) => setManualData({ ...manualData, paymentMethod: e.target.value })} className="input"><option value="cash">Cash</option><option value="bank">Bank</option><option value="cheque">Cheque</option></select></div>
                <div><label className="label">Receipt/Ref No.</label><input type="text" value={manualData.transactionId} onChange={(e) => setManualData({ ...manualData, transactionId: e.target.value })} className="input" placeholder="Optional" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Term</label><select value={manualData.term} onChange={(e) => setManualData({ ...manualData, term: e.target.value })} className="input" required><option value="">Term</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>
                <div><label className="label">Year</label><input type="number" value={manualData.year} onChange={(e) => setManualData({ ...manualData, year: e.target.value })} className="input" min="2026" max="2030" required /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowManualModal(false)} className="btn flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">{submitting ? <span className="flex items-center justify-center"><Loader className="w-4 h-4 animate-spin mr-2" />Recording...</span> : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
