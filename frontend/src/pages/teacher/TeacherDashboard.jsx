import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { BookOpen, ClipboardList, Clock, Users, Award, BarChart3, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ classes: 0, students: 0, assignments: 0, pendingGrading: 0 });
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [recentMarks, setRecentMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [timetableRes, marksRes, assignmentsRes] = await Promise.all([
          api.get('/timetable'),
          api.get('/marks?limit=5'),
          api.get('/assignments'),
        ]);

        // Extract unique classes from timetable
        const ttEntries = timetableRes.data.timetable || [];
        const uniqueClasses = [...new Set(ttEntries.map(e => e.assignedClass))];
        setAssignedClasses(uniqueClasses);

        // Count pending grading
        const assignments = assignmentsRes.data.assignments || [];
        const pending = assignments.reduce((sum, a) => sum + (a.submissions?.filter(s => !s.isGraded).length || 0), 0);

        setStats({
          classes: uniqueClasses.length,
          students: 0,
          assignments: assignments.length,
          pendingGrading: pending,
        });
        setRecentMarks(marksRes.data.marks?.slice(0, 5) || []);
      } catch (err) {
        console.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  const cards = [
    { label: 'Classes Assigned', value: stats.classes, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', link: '/teacher/timetable' },
    { label: 'Assignments', value: stats.assignments, icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50', link: '/teacher/assignments' },
    { label: 'Pending Grading', value: stats.pendingGrading, icon: Award, color: 'text-orange-600', bg: 'bg-orange-50', link: '/teacher/assignments' },
    { label: 'Student Marks', value: user.classTeacherOf ? `Grade ${user.classTeacherOf}` : 'View', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', link: '/teacher/marks' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, Teacher {user?.name}</h1>
        <p className="text-gray-600 mt-1">
          {user.assignedSubjects?.length > 0 ? `Subjects: ${user.assignedSubjects.join(', ')}` : 'No subjects assigned'}
          {user.classTeacherOf && ` | Class Teacher: Grade ${user.classTeacherOf}`}
        </p>
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
            <Link to="/teacher/marks" className="btn btn-primary text-sm">Student Marks</Link>
            <Link to="/teacher/assignments" className="btn btn-secondary text-sm">Create Assignment</Link>
            <Link to="/teacher/attendance" className="btn btn-secondary text-sm">Mark Attendance</Link>
            <Link to="/teacher/timetable" className="btn btn-secondary text-sm">View Timetable</Link>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Classes</h3>
          {assignedClasses.length > 0 ? (
            <div className="space-y-2">
              {assignedClasses.map((cls, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-900">{cls}</span>
                  <span className="badge badge-green">Active</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No classes assigned yet. Check timetable.</p>}
        </div>
      </div>

      {/* Recent Marks */}
      {recentMarks.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Marks Entered</h3>
          <div className="space-y-2">
            {recentMarks.map(m => (
              <div key={m._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.subject} - {m.studentId?.name || 'Student'}</p>
                  <p className="text-xs text-gray-500">Term {m.term}, {m.year}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{m.score}/100</p>
                  <span className={`badge ${m.competencyLevel === 'E' ? 'badge-green' : m.competencyLevel === 'M' ? 'badge-blue' : m.competencyLevel === 'A' ? 'badge-yellow' : 'badge-red'}`}>
                    {m.competencyLabel || m.competencyLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
