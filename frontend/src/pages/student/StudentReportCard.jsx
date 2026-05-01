import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Download, Award, TrendingUp, DollarSign, User, BookOpen, Calendar } from 'lucide-react';

const StudentReportCard = () => {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('1');
  const [year, setYear] = useState('2026');

  useEffect(() => {
    fetchReport();
  }, [term, year]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/data/${user.id}?term=${term}&year=${year}`);
      setReport(res.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setReport(null);
      } else {
        showError('Failed to load report');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const res = await api.get(`/reports/student/${user.id}?term=${term}&year=${year}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${user.name.replace(/\s+/g, '_')}_T${term}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showError('Failed to generate PDF');
    }
  };

  const getCompetencyColor = (level) => {
    switch (level) {
      case 'E': return 'bg-green-100 text-green-800';
      case 'M': return 'bg-blue-100 text-blue-800';
      case 'A': return 'bg-yellow-100 text-yellow-800';
      case 'B': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  if (!report) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-700">No Report Available</h2>
      <p className="text-gray-500 mt-2">No marks have been recorded for Term {term}, {year}.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Report Card</h1>
          <p className="text-gray-600 mt-1">Term {term}, {report.year}</p>
        </div>
        <div className="flex gap-3">
          <select value={term} onChange={e => setTerm(e.target.value)} className="input text-sm w-28">
            {[1, 2, 3].map(t => <option key={t} value={t}>Term {t}</option>)}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)} className="input text-sm w-28">
            {[2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={downloadPDF} className="btn btn-primary text-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* School Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center overflow-hidden">
            {report.school?.logo ? (
              <img src={report.school.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-8 h-8 text-primary-600" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{report.school?.name || 'CBC Senior School'}</h2>
            <p className="text-primary-200 italic">"{report.school?.motto || 'Excellence in Education'}"</p>
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-gray-500">Name</p><p className="font-semibold">{report.student.name}</p></div>
          <div><p className="text-gray-500">Admission No</p><p className="font-semibold">{report.student.admissionNumber || 'N/A'}</p></div>
          <div><p className="text-gray-500">Grade</p><p className="font-semibold">{report.student.grade}</p></div>
          <div><p className="text-gray-500">Pathway</p><p className="font-semibold">{report.student.pathway || 'N/A'}</p></div>
          <div><p className="text-gray-500">Class Mean</p><p className="font-semibold text-primary-600 text-lg">{report.mean}</p></div>
          <div><p className="text-gray-500">Position</p><p className="font-semibold text-accent-600 text-lg">{report.position} of {report.totalStudents}</p></div>
          <div><p className="text-gray-500">Class Teacher</p><p className="font-semibold">{report.classTeacher || 'N/A'}</p></div>
          <div><p className="text-gray-500">Date</p><p className="font-semibold">{new Date(report.dateGenerated).toLocaleDateString('en-KE')}</p></div>
        </div>
      </div>

      {/* Marks Table */}
      <div className="card mb-6 overflow-x-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary-600" /> Subject Results
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-primary-600">
              <th className="text-left py-2 px-3 text-primary-700">#</th>
              <th className="text-left py-2 px-3 text-primary-700">Subject</th>
              <th className="text-center py-2 px-3 text-primary-700">Score</th>
              <th className="text-center py-2 px-3 text-primary-700">Competency</th>
              <th className="text-left py-2 px-3 text-primary-700">Teacher Remark</th>
            </tr>
          </thead>
          <tbody>
            {report.marks.map((mark, i) => (
              <tr key={mark._id} className={`border-b ${i % 2 === 0 ? 'bg-gray-50' : ''}`}>
                <td className="py-2 px-3">{i + 1}</td>
                <td className="py-2 px-3 font-medium">{mark.subject}</td>
                <td className="py-2 px-3 text-center font-bold">{mark.score}</td>
                <td className="py-2 px-3 text-center">
                  <span className={`badge ${getCompetencyColor(mark.competency.level)}`}>
                    {mark.competency.level} - {mark.competency.label}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-600">{mark.teacherRemark || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary-50 font-bold">
              <td className="py-3 px-3" colSpan={2}>TOTAL / MEAN</td>
              <td className="py-3 px-3 text-center">{report.totalScore} / {report.mean}</td>
              <td className="py-3 px-3 text-center" colSpan={2}>Position: {report.position} of {report.totalStudents}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Remarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card border-l-4 border-l-primary-500">
          <h3 className="font-bold text-gray-900 mb-2">Class Teacher's Remark</h3>
          <p className="text-gray-700">{report.remark}</p>
          <p className="text-sm text-gray-500 mt-2">— {report.classTeacher}</p>
        </div>
        <div className="card border-l-4 border-l-accent-500">
          <h3 className="font-bold text-gray-900 mb-2">Principal's Remark</h3>
          <p className="text-gray-700">{report.school?.principalMessage || 'Keep working hard!'}</p>
          <p className="text-sm text-gray-500 mt-2">— {report.school?.principalName || 'Principal'}</p>
        </div>
      </div>

      {/* Fee Summary */}
      {report.fee && (
        <div className="card mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" /> Fee Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-sm text-gray-500">Total Fee</p><p className="font-bold text-lg">KES {report.fee.totalDue.toLocaleString()}</p></div>
            <div><p className="text-sm text-gray-500">Amount Paid</p><p className="font-bold text-lg text-green-600">KES {report.fee.amountPaid.toLocaleString()}</p></div>
            <div><p className="text-sm text-gray-500">Balance</p><p className="font-bold text-lg text-red-600">KES {report.fee.balance.toLocaleString()}</p></div>
            <div><p className="text-sm text-gray-500">Status</p>
              <span className={`badge ${report.fee.isFullyPaid ? 'badge-green' : 'badge-red'}`}>
                {report.fee.isFullyPaid ? 'CLEARED' : 'OUTSTANDING'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentReportCard;
