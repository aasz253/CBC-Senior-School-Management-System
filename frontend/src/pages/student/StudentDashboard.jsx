import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, DollarSign, BookOpen, ClipboardList, Clock, ArrowRight } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [fee, setFee] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [marksRes, feesRes, assignmentsRes] = await Promise.all([
          api.get('/marks'),
          api.get('/fees'),
          api.get('/assignments?status=pending'),
        ]);
        setMarks(marksRes.data.marks);
        setFee(feesRes.data.fees?.[0] || null);
        setPendingAssignments(assignmentsRes.data.assignments);
      } catch (err) {
        console.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div></div>;

  const cards = [
    { label: 'My Marks', value: marks.length, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50', link: '/student/marks' },
    { label: 'Fee Balance', value: fee ? `KES ${fee.balance?.toLocaleString()}` : 'N/A', icon: DollarSign, color: fee?.isFullyPaid ? 'text-green-600' : 'text-red-600', bg: fee?.isFullyPaid ? 'bg-green-50' : 'bg-red-50', link: '/student/fees' },
    { label: 'Pending Tasks', value: pendingAssignments.length, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50', link: '/student/assignments' },
    { label: 'Attendance', value: 'View', icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50', link: '/student/attendance' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
        <p className="text-gray-600 mt-1">Grade {user?.grade} | {user?.pathway} | {user?.admissionNumber}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, i) => (
          <Link key={i} to={card.link} className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.bg} p-3 rounded-xl`}><card.icon className={`w-6 h-6 ${card.color}`} /></div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Marks */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Marks</h3>
            <Link to="/student/marks" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">View all <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </div>
          {marks.length === 0 ? <p className="text-gray-500 text-sm">No marks recorded yet</p> : (
            <div className="space-y-2">
              {marks.slice(0, 5).map(m => (
                <div key={m._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.subject}</p>
                    <p className="text-xs text-gray-500">Term {m.term}, {m.year}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{m.score}/100</p>
                    <span className={`badge ${m.competencyLevel === 'E' ? 'badge-green' : m.competencyLevel === 'M' ? 'badge-blue' : m.competencyLevel === 'A' ? 'badge-yellow' : 'badge-red'}`}>{m.competencyLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Assignments */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Assignments</h3>
            <Link to="/student/assignments" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">View all <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </div>
          {pendingAssignments.length === 0 ? <p className="text-gray-500 text-sm">No pending assignments</p> : (
            <div className="space-y-2">
              {pendingAssignments.slice(0, 5).map(a => (
                <div key={a._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.subject}</p>
                  </div>
                  <span className="badge badge-yellow">Due: {new Date(a.dueDate).toLocaleDateString('en-KE')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
