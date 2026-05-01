import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import PublicNewsPage from './pages/PublicNewsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminFees from './pages/admin/AdminFees';
import AdminMarks from './pages/admin/AdminMarks';
import AdminPayments from './pages/admin/AdminPayments';
import AdminTimetable from './pages/admin/AdminTimetable';
import AdminSettings from './pages/admin/AdminSettings';
import AdminNews from './pages/admin/AdminNews';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherMarks from './pages/teacher/TeacherMarks';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherTimetable from './pages/teacher/TeacherTimetable';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentMarks from './pages/student/StudentMarks';
import StudentFees from './pages/student/StudentFees';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentTimetable from './pages/student/StudentTimetable';
import StudentReportCard from './pages/student/StudentReportCard';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import SchoolDetailsPage from './pages/SchoolDetailsPage';
import AdminSchoolDetails from './pages/admin/AdminSchoolDetails';
import AdminReports from './pages/admin/AdminReports';

// Shared
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Loading from './components/Loading';

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <Loading />;

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={`/${user?.role}`} />;
  }

  return children;
};

function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to={`/${user?.role}`} /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to={`/${user?.role}`} /> : <RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/news" element={<PublicNewsPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/fees" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminFees />
            </ProtectedRoute>
          } />
          <Route path="/admin/marks" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMarks />
            </ProtectedRoute>
          } />
          <Route path="/admin/payments" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPayments />
            </ProtectedRoute>
          } />
          <Route path="/admin/timetable" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminTimetable />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSettings />
            </ProtectedRoute>
          } />
          <Route path="/admin/news" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminNews />
            </ProtectedRoute>
          } />

          {/* Teacher Routes */}
          <Route path="/teacher" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />
          <Route path="/teacher/marks" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherMarks />
            </ProtectedRoute>
          } />
          <Route path="/teacher/assignments" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAssignments />
            </ProtectedRoute>
          } />
          <Route path="/teacher/attendance" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAttendance />
            </ProtectedRoute>
          } />
          <Route path="/teacher/timetable" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherTimetable />
            </ProtectedRoute>
          } />

          {/* Student Routes */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/marks" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentMarks />
            </ProtectedRoute>
          } />
          <Route path="/student/fees" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentFees />
            </ProtectedRoute>
          } />
          <Route path="/student/assignments" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAssignments />
            </ProtectedRoute>
          } />
          <Route path="/student/attendance" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAttendance />
            </ProtectedRoute>
          } />
          <Route path="/student/timetable" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentTimetable />
            </ProtectedRoute>
          } />
          <Route path="/student/report" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentReportCard />
            </ProtectedRoute>
          } />

          {/* School Details - All authenticated users */}
          <Route path="/school" element={
            <ProtectedRoute>
              <SchoolDetailsPage />
            </ProtectedRoute>
          } />

          {/* Admin School Details Management */}
          <Route path="/admin/school" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSchoolDetails />
            </ProtectedRoute>
          } />

          {/* Admin Reports */}
          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReports />
            </ProtectedRoute>
          } />

          {/* Worker Routes */}
          <Route path="/worker" element={
            <ProtectedRoute allowedRoles={['school_worker']}>
              <WorkerDashboard />
            </ProtectedRoute>
          } />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
