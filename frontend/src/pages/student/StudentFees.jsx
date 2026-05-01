import { useState, useEffect } from 'react';
import { DollarSign, Phone, Loader, CheckCircle, FileDown, Filter } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const StudentFees = () => {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payData, setPayData] = useState({ amount: '', phoneNumber: user?.parentPhone || user?.phone || '' });
  const [selectedFee, setSelectedFee] = useState(null);
  const [filters, setFilters] = useState({ term: '', year: '2026' });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.term) params.append('term', filters.term);
        if (filters.year) params.append('year', filters.year);
        const [feesRes, paymentsRes] = await Promise.all([
          api.get(`/fees?${params}`),
          api.get(`/payments?${params}`),
        ]);
        setFees(feesRes.data.fees);
        setPayments(paymentsRes.data.payments);
      } catch (err) {
        showError('Failed to load fee data');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [filters]);

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const res = await api.get(`/reports/student/${user.id}/fee-statement?term=${filters.term || 1}&year=${filters.year}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fee_statement_${user.admissionNumber}_T${filters.term || 'all'}_${filters.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Fee statement downloaded');
    } catch (err) {
      showError('Failed to generate fee statement');
    } finally {
      setExporting(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedFee) return;
    setPaying(true);
    try {
      await api.post('/payments/mpesa/stkpush', {
        studentId: user.id,
        amount: parseFloat(payData.amount),
        phoneNumber: payData.phoneNumber,
        term: selectedFee.term,
        year: selectedFee.year,
      });
      showSuccess('M-PESA prompt sent to your phone. Please enter your PIN to complete payment.');
      setShowPayModal(false);
      setPayData({ amount: '', phoneNumber: user?.parentPhone || user?.phone || '' });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to initiate payment');
    } finally { setPaying(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Fees</h1>
        <p className="text-gray-600 mt-1">View fee balance and make payments via M-PESA</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filters.term} onChange={(e) => setFilters({ ...filters, term: e.target.value })} className="input py-2 w-32">
            <option value="">All Terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
          <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className="input py-2 w-28">
            {['2026','2027','2028','2029','2030'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex-1" />
          <button onClick={handleExportPDF} disabled={exporting} className="btn flex items-center gap-2 text-sm">
            {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Export Fee Statement
          </button>
        </div>
      </div>

      {/* Fee Summary */}
      {fees.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <p className="text-sm text-gray-500">Total Due</p>
            <p className="text-2xl font-bold text-gray-900">KES {fees.reduce((s, f) => s + f.totalDue, 0).toLocaleString()}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">KES {fees.reduce((s, f) => s + f.amountPaid, 0).toLocaleString()}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Balance</p>
            <p className="text-2xl font-bold text-red-600">KES {fees.reduce((s, f) => s + (f.balance || 0), 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Fee Records */}
      <div className="space-y-4 mb-8">
        {fees.length === 0 ? (
          <div className="card text-center py-12"><p className="text-gray-500">No fee records found. Contact admin.</p></div>
        ) : (
          fees.map(fee => (
            <div key={fee._id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">Term {fee.term}, {fee.year}</h3>
                    {fee.isFullyPaid && <span className="badge badge-green flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Paid</span>}
                  </div>
                  <div className="flex gap-6 text-sm text-gray-600 mt-2">
                    <span>Due: KES {fee.totalDue.toLocaleString()}</span>
                    <span className="text-green-600">Paid: KES {fee.amountPaid.toLocaleString()}</span>
                    <span className="text-red-600 font-semibold">Balance: KES {fee.balance.toLocaleString()}</span>
                  </div>
                  {fee.feeStructure && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(fee.feeStructure).filter(([_, v]) => v > 0).map(([k, v]) => (
                        <span key={k} className="badge badge-gray capitalize">{k}: KES {v.toLocaleString()}</span>
                      ))}
                    </div>
                  )}
                </div>
                {!fee.isFullyPaid && (
                  <button onClick={() => { setSelectedFee(fee); setPayData({ ...payData, amount: fee.balance.toString() }); setShowPayModal(true); }} className="btn btn-primary text-sm flex items-center gap-1"><Phone className="w-4 h-4" /> Pay via M-PESA</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment History */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-gray-500 text-sm">No payments recorded</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.transactionId}</p>
                  <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString('en-KE')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">KES {p.amount?.toLocaleString()}</p>
                  <span className={`badge ${p.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* M-PESA Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Phone className="w-5 h-5 text-green-600" /> Pay via M-PESA</h2>
              <p className="text-sm text-gray-600 mt-1">Enter your M-PESA number to receive a payment prompt</p>
            </div>
            <form onSubmit={handlePay} className="p-6 space-y-4">
              <div>
                <label className="label">Amount (KES)</label>
                <input type="number" value={payData.amount} onChange={(e) => setPayData({ ...payData, amount: e.target.value })} className="input" required min="1" />
              </div>
              <div>
                <label className="label">M-PESA Phone Number</label>
                <input type="tel" value={payData.phoneNumber} onChange={(e) => setPayData({ ...payData, phoneNumber: e.target.value })} className="input" placeholder="2547XXXXXXXX" required />
                <p className="text-xs text-gray-500 mt-1">Format: 254712345678 or 0712345678</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-sm text-green-800">
                <p className="font-medium">How it works:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Click "Send Payment Request"</li>
                  <li>Enter M-PESA PIN on your phone</li>
                  <li>Balance updates automatically</li>
                </ol>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPayModal(false)} className="btn flex-1">Cancel</button>
                <button type="submit" disabled={paying} className="btn btn-success flex-1">{paying ? <span className="flex items-center justify-center"><Loader className="w-4 h-4 animate-spin mr-2" />Sending...</span> : 'Send Payment Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFees;
