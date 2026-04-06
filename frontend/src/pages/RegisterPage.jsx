import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GraduationCap, Loader } from 'lucide-react';

const roles = [
  { value: 'student', label: 'Student/Parent' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'school_worker', label: 'School Worker' },
  { value: 'community_member', label: 'Community Member' },
];

const pathways = ['STEM', 'Arts & Sports', 'Social Sciences'];
const grades = ['10', '11', '12'];

const RegisterPage = () => {
  const { register } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    role: 'student', grade: '', pathway: '', admissionNumber: '',
    parentPhone: '', guardianName: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return showError('Passwords do not match');
    }
    if (formData.password.length < 6) {
      return showError('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const { confirmPassword, ...userData } = formData;
      await register(userData);
      showSuccess('Registration successful!');
      navigate(`/${userData.role}`);
    } catch (err) {
      showError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-3">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-1">Join CBC School Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="input" required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input" placeholder="+254 7XX XXX XXX" required />
              </div>
            </div>

            <div>
              <label className="label">Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className="input">
                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {formData.role === 'student' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Admission Number</label>
                    <input type="text" name="admissionNumber" value={formData.admissionNumber} onChange={handleChange} className="input" />
                  </div>
                  <div>
                    <label className="label">Grade</label>
                    <select name="grade" value={formData.grade} onChange={handleChange} className="input">
                      <option value="">Select Grade</option>
                      {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Pathway</label>
                  <select name="pathway" value={formData.pathway} onChange={handleChange} className="input">
                    <option value="">Select Pathway</option>
                    {pathways.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Guardian Name</label>
                    <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} className="input" />
                  </div>
                  <div>
                    <label className="label">Parent Phone</label>
                    <input type="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange} className="input" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="input" required minLength={6} />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input" required minLength={6} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base">
              {loading ? <span className="flex items-center justify-center"><Loader className="w-5 h-5 animate-spin mr-2" />Creating Account...</span> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
