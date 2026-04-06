import { useState, useEffect } from 'react';
import { Loader, Download, Filter } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const StudentMarks = () => {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ term: '', year: '2026' });

  useEffect(() => { fetchMarks(); }, [filters]);

  const fetchMarks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.term) params.append('term', filters.term);
      if (filters.year) params.append('year', filters.year);
      const res = await api.get(`/marks?${params}`);
      setMarks(res.data.marks);
    } catch (err) {
      showError('Failed to load marks');
    } finally { setLoading(false); }
  };

  const competencyColors = { E: 'badge-green', M: 'badge-blue', A: 'badge-yellow', B: 'badge-red' };

  const handleDownloadReport = async () => {
    try {
      const term = filters.term || 1;
      const year = filters.year || 2026;
      const response = await api.get(`/reports/generate/${user.id}/${term}/${year}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${user.admissionNumber}_term${term}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showError('Failed to generate report');
    }
  };

  // Group marks by term
  const groupedByTerm = {};
  marks.forEach(m => {
    const key = `Term ${m.term}, ${m.year}`;
    if (!groupedByTerm[key]) groupedByTerm[key] = [];
    groupedByTerm[key].push(m);
  });

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Marks</h1>
          <p className="text-gray-600 mt-1">CBC competency-based assessment results</p>
        </div>
        <button onClick={handleDownloadReport} className="btn btn-primary text-sm flex items-center gap-1"><Download className="w-4 h-4" /> Download Report</button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {Object.keys(groupedByTerm).length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No marks recorded yet</p></div>
      ) : (
        Object.entries(groupedByTerm).map(([term, termMarks]) => {
          const avg = (termMarks.reduce((sum, m) => sum + m.score, 0) / termMarks.length).toFixed(1);
          return (
            <div key={term} className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{term}</h3>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Average</p>
                  <p className="text-xl font-bold text-primary-600">{avg}%</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="table-header">Subject</th>
                      <th className="table-header">Assessment</th>
                      <th className="table-header">Score</th>
                      <th className="table-header">Competency</th>
                      <th className="table-header">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {termMarks.map(m => (
                      <tr key={m._id} className="border-t border-gray-100">
                        <td className="table-cell font-medium">{m.subject}</td>
                        <td className="table-cell"><span className="badge badge-gray">{m.assessmentType}</span></td>
                        <td className="table-cell font-semibold">{m.score}/100</td>
                        <td className="table-cell"><span className={`badge ${competencyColors[m.competencyLevel]}`}>{m.competencyLabel} ({m.competencyLevel})</span></td>
                        <td className="table-cell text-sm text-gray-600">{m.teacherRemark || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default StudentMarks;
