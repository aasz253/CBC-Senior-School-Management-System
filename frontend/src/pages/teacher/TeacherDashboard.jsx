import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { BookOpen, ClipboardList, Clock, Users, Award, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ classes: 0, assignments: 0, pendingGrading: 0, attendanceToday: 0 });
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignmentsRes] = await Promise.all([
          api.get('/assignments'),
        ]);
        const assignments = assignmentsRes.data.assignments;
        const pending = assignments.reduce((sum, a) => sum + (a.submissions?.filter(s => !s.isGraded).length || 0), 0);
        setStats({ classes: user?.assignedSubjects?.length || 0, assignments: assignments.length, pendingGrading: pending, attendanceToday: 0 });
      } catch (err) {
        console.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div></div>;

  const cards = [
    { label: 'My Subjects', value: stats.classes, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', link: '/teacher/marks' },
    { label: 'Assignments', value: stats.assignments, icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50', link: '/teacher/assignments' },
    { label: 'Pending Grading', value: stats.pendingGrading, icon: Award, color: 'text-orange-600', bg: 'bg-orange-50', link: '/teacher/assignments' },
    { label: 'Today\'s Classes', value: stats.attendanceToday, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', link: '/teacher/attendance' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
        <p className="text-gray-600 mt-1">Grade {user?.assignedClass || 'N/A'} | {user?.assignedSubjects?.join(', ') || 'No subjects assigned'}</p>
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
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/teacher/marks" className="btn btn-primary text-sm">Enter Marks</Link>
            <Link to="/teacher/assignments" className="btn btn-secondary text-sm">Create Assignment</Link>
            <Link to="/teacher/attendance" className="btn btn-secondary text-sm">Mark Attendance</Link>
            <Link to="/teacher/timetable" className="btn btn-secondary text-sm">View Timetable</Link>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Subjects</h3>
          {user?.assignedSubjects?.length > 0 ? (
            <div className="space-y-2">
              {user.assignedSubjects.map((subject, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-900">{subject}</span>
                  <span className="badge badge-blue">Grade {user.grade}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No subjects assigned. Contact admin.</p>}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
