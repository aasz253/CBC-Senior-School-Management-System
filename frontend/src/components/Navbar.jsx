import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu, X, Home, Users, DollarSign, BarChart3, BookOpen,
  Calendar, FileText, Settings, LogOut, Bell, GraduationCap,
  ClipboardList, Clock, Newspaper, User, ChevronDown, School
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAdmin, isTeacher, isStudent, isWorker } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Admin nav items
  const adminNav = [
    { path: '/admin', label: 'Dashboard', icon: Home },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/fees', label: 'Fees', icon: DollarSign },
    { path: '/admin/marks', label: 'Marks', icon: BarChart3 },
    { path: '/admin/payments', label: 'Payments', icon: DollarSign },
    { path: '/admin/news', label: 'News', icon: Newspaper },
    { path: '/school', label: 'School', icon: School },
    { path: '/admin/school', label: 'Manage School', icon: Settings },
  ];

  // Teacher nav items
  const teacherNav = [
    { path: '/teacher', label: 'Dashboard', icon: Home },
    { path: '/teacher/marks', label: 'My Marks', icon: BarChart3 },
    { path: '/teacher/assignments', label: 'Assignments', icon: BookOpen },
    { path: '/teacher/attendance', label: 'Attendance', icon: ClipboardList },
    { path: '/teacher/timetable', label: 'Timetable', icon: Clock },
    { path: '/school', label: 'School', icon: School },
  ];

  // Student nav items
  const studentNav = [
    { path: '/student', label: 'Dashboard', icon: Home },
    { path: '/student/marks', label: 'My Marks', icon: BarChart3 },
    { path: '/student/fees', label: 'My Fees', icon: DollarSign },
    { path: '/student/assignments', label: 'Assignments', icon: BookOpen },
    { path: '/student/attendance', label: 'Attendance', icon: ClipboardList },
    { path: '/student/timetable', label: 'Timetable', icon: Clock },
    { path: '/school', label: 'School', icon: School },
  ];

  // Worker nav items
  const workerNav = [
    { path: '/worker', label: 'Dashboard', icon: Home },
    { path: '/school', label: 'School', icon: School },
  ];

  const getNavItems = () => {
    if (isAdmin) return adminNav;
    if (isTeacher) return teacherNav;
    if (isStudent) return studentNav;
    if (isWorker) return workerNav;
    return [];
  };

  const navItems = getNavItems();

  return (
    <nav className={`bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40 transition-shadow ${scrolled ? 'shadow-md' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={user ? `/${user.role}` : '/'} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:block">CBC School</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          {user && (
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                {/* Notifications */}
                <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-700">{user.name}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full capitalize">
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Link to="/login" className="btn btn-primary text-sm">Login</Link>
                <Link to="/register" className="btn btn-secondary text-sm">Register</Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            {user && navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium ${
                  location.pathname === item.path
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            {!user && (
              <div className="flex space-x-2 pt-2">
                <Link to="/login" className="btn btn-primary text-sm flex-1 text-center">Login</Link>
                <Link to="/register" className="btn btn-secondary text-sm flex-1 text-center">Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
