import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { FileText, Download, Users, BarChart3, Search, Loader } from 'lucide-react';

const AdminReports = () => {
  const { error: showError, success: showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('10');
  const [term, setTerm] = useState('1');
  const [year, setYear] = useState('2026');

  useEffect(() => {
    fetchStudents();
  }, [gradeFilter]);

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/admin/users?role=student&grade=${gradeFilter}&limit=100`);
      setStudents(res.data.users || []);
    } catch (err) {
      showError('Failed to load students');
    }
  };

  const handleSearch = () => {
    if (!search) return fetchStudents();
    const filtered = students.filter(s =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(search.toLowerCase())
    );
    setStudents(filtered);
  };

  const downloadStudentPDF = async (studentId) => {
    try {
      const res = await api.get(`/reports/student/${studentId}?term=${term}&year=${year}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showError('Failed to generate PDF');
    }
  };

  const downloadClassPDF = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/class/${gradeFilter}?term=${term}&year=${year}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `class_report_Grade_${gradeFilter}_T${term}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSuccess('Class report downloaded');
    } catch (err) {
      showError('Failed to generate class report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Report Cards</h1>
          <p className="text-gray-600 mt-1">Generate PDF report cards for students and classes</p>
        </div>
        <button onClick={downloadClassPDF} disabled={loading} className="btn btn-primary flex items-center gap-2">
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download Class Report
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="label">Search Student</label>
            <div className="flex gap-2">
              <input className="input" placeholder="Name or Admission No..." value={search} onChange={e => setSearch(e.target.value)} />
              <button onClick={handleSearch} className="btn btn-secondary"><Search className="w-4 h-4" /></button>
            </div>
          </div>
          <div>
            <label className="label">Grade</label>
            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="input">
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </div>
          <div>
            <label className="label">Term</label>
            <select value={term} onChange={e => setTerm(e.target.value)} className="input">
              {[1, 2, 3].map(t => <option key={t} value={t}>Term {t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select value={year} onChange={e => setYear(e.target.value)} className="input">
              {[2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold">Students ({students.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 px-3 text-gray-600">#</th>
                <th className="text-left py-2 px-3 text-gray-600">Name</th>
                <th className="text-left py-2 px-3 text-gray-600">Admission No</th>
                <th className="text-left py-2 px-3 text-gray-600">Grade</th>
                <th className="text-center py-2 px-3 text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No students found</td></tr>
              ) : students.map((s, i) => (
                <tr key={s._id} className={`border-b ${i % 2 === 0 ? 'bg-gray-50' : ''}`}>
                  <td className="py-2 px-3">{i + 1}</td>
                  <td className="py-2 px-3 font-medium">{s.name}</td>
                  <td className="py-2 px-3">{s.admissionNumber || '-'}</td>
                  <td className="py-2 px-3">{s.grade}</td>
                  <td className="py-2 px-3 text-center">
                    <button onClick={() => downloadStudentPDF(s._id)} className="btn btn-primary text-xs flex items-center gap-1 inline-flex">
                      <FileText className="w-3 h-3" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
