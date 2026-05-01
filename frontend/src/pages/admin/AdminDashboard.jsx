import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  Users,
  GraduationCap,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Calendar,
  BookOpen,
  Award,
  Clock,
  ChevronRight,
  Wrench,
  Globe,
} from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [feeCollectionData, setFeeCollectionData] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { error: showError } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [
        statsRes,
        feesRes,
        gradesRes,
        attendanceRes,
      ] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/fees/collection').catch(() => ({ data: [] })),
        api.get('/admin/grades/distribution').catch(() => ({ data: [] })),
        api.get('/admin/attendance/trend').catch(() => ({ data: [] })),
      ]);

      setStats(statsRes.data.stats || statsRes.data);
      setFeeCollectionData(Array.isArray(feesRes.data) ? feesRes.data : []);
      setGradeDistribution(Array.isArray(gradesRes.data) ? gradesRes.data : []);
      setAttendanceData(Array.isArray(attendanceRes.data) ? attendanceRes.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600">{error}</p>
        <button onClick={fetchDashboardData} className="btn btn-primary mt-4">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Teachers',
      value: stats?.totalTeachers || 0,
      icon: GraduationCap,
      color: 'bg-green-500',
    },
    {
      title: 'Workers',
      value: stats?.totalWorkers || 0,
      icon: Wrench,
      color: 'bg-yellow-500',
    },
    {
      title: 'Community',
      value: stats?.totalCommunity || 0,
      icon: Globe,
      color: 'bg-purple-500',
    },
    {
      title: 'Fees Collected',
      value: `KES ${(stats?.feesCollected || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
    },
    {
      title: 'Pending Fees',
      value: `KES ${(stats?.pendingFees || 0).toLocaleString()}`,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, Admin</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Collection Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Collection Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={feeCollectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `KES ${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="collected" fill="#2563eb" name="Collected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gradeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance Trend */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={attendanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2} name="Attendance %" />
            <Line type="monotone" dataKey="punctuality" stroke="#10b981" strokeWidth={2} name="Punctuality %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {stats?.recentActivity?.length === 0 || !stats?.recentActivity ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              stats.recentActivity.slice(0, 8).map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className="bg-primary-50 p-2 rounded-lg mt-1">
                    {activity.type === 'payment' && <DollarSign className="w-4 h-4 text-blue-600" />}
                    {activity.type === 'marks' && <Award className="w-4 h-4 text-purple-600" />}
                    {!['payment', 'marks'].includes(activity.type) && (
                      <Clock className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(activity.timeAgo).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Manage Students', icon: Users, href: '/admin/users', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
              { label: 'Fee Management', icon: DollarSign, href: '/admin/fees', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
              { label: 'View Marks', icon: Award, href: '/admin/marks', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              { label: 'Payments Log', icon: TrendingUp, href: '/admin/payments', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
              { label: 'Manage News', icon: BookOpen, href: '/admin/news', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
              { label: 'Settings', icon: Calendar, href: '/admin/settings', color: 'bg-gray-50 text-gray-700 hover:bg-gray-100' },
            ].map((link, index) => (
              <a
                key={index}
                href={link.href}
                className={`${link.color} p-4 rounded-xl flex flex-col items-center gap-2 transition-colors cursor-pointer`}
              >
                <link.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{link.label}</span>
              </a>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">System Overview</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Academic Year</span>
                <span className="text-sm font-medium text-gray-900">{stats?.academicYear || '2026'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Term</span>
                <span className="text-sm font-medium text-gray-900">{stats?.currentTerm || 'Term 1'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Pathways</span>
                <span className="text-sm font-medium text-gray-900">{stats?.activePathways || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">System Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
