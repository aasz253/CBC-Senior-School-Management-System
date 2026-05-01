import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  Loader,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
} from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phone: '',
    admissionNumber: '',
    grade: '',
    pathway: '',
    assignedSubjects: [],
    classTeacherOf: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  const roles = ['all', 'admin', 'teacher', 'student', 'school_worker', 'community_member'];
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(search && { search }),
      });

      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
      setTotalUsers(response.data.total);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const openAddModal = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'student',
      phone: '',
      admissionNumber: '',
      grade: '',
      pathway: '',
      assignedSubjects: [],
      classTeacherOf: '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    const normalizedGrade = user.grade?.replace('Grade ', '') || '';
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'student',
      phone: user.phone || '',
      admissionNumber: user.admissionNumber || '',
      grade: normalizedGrade,
      pathway: user.pathway || '',
      assignedSubjects: user.assignedSubjects || [],
      classTeacherOf: user.classTeacherOf || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const toggleSubject = (subject) => {
    setFormData(prev => {
      const subjects = prev.assignedSubjects || [];
      return {
        ...prev,
        assignedSubjects: subjects.includes(subject)
          ? subjects.filter(s => s !== subject)
          : [...subjects, subject],
      };
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';
    if (!selectedUser && !formData.password) errors.password = 'Password is required';
    else if (formData.password && formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!formData.role) errors.role = 'Role is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (selectedUser) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await api.put(`/admin/users/${selectedUser._id || selectedUser.id}`, payload);
        showSuccess('User updated successfully');
      } else {
        await api.post('/admin/users', formData);
        showSuccess('User created successfully');
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/users/${selectedUser._id || selectedUser.id}`);
      showSuccess('User deleted successfully');
      closeModal();
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-red-100 text-red-800',
      teacher: 'bg-blue-100 text-blue-800',
      student: 'bg-green-100 text-green-800',
      school_worker: 'bg-yellow-100 text-yellow-800',
      community_member: 'bg-purple-100 text-purple-800',
    };
    const label = role === 'school_worker' ? 'Worker' : role === 'community_member' ? 'Community' : role?.charAt(0).toUpperCase() + role?.slice(1);
    return (
      <span className={`badge px-2 py-1 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-800'}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">{totalUsers} total users</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or admission number..."
                className="input pl-10"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="input py-2"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role === 'all' ? 'All Roles' : role === 'school_worker' ? 'Workers' : role === 'community_member' ? 'Community' : role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={fetchUsers} className="ml-auto text-sm underline">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header text-left">Name</th>
                <th className="table-header text-left">Email</th>
                <th className="table-header text-left">Role</th>
                <th className="table-header text-left">Phone</th>
                <th className="table-header text-left">Admission No.</th>
                <th className="table-header text-left">Details</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-cell text-center py-12">
                    <Loader className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-cell text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id || user.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700">
                            {(user.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">{user.email}</td>
                    <td className="table-cell">{getRoleBadge(user.role)}</td>
                    <td className="table-cell text-gray-600">{user.phone || '-'}</td>
                    <td className="table-cell text-gray-600">{user.admissionNumber || '-'}</td>
                    <td className="table-cell">
                      {user.role === 'teacher' ? (
                        <div className="space-y-1">
                          {(user.assignedSubjects || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.assignedSubjects.slice(0, 2).map(s => (
                                <span key={s} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{s}</span>
                              ))}
                              {user.assignedSubjects.length > 2 && (
                                <span className="text-xs text-gray-400">+{user.assignedSubjects.length - 2}</span>
                              )}
                            </div>
                          ) : <span className="text-xs text-gray-400">No subjects</span>}
                          {user.classTeacherOf && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded block w-fit">CT: Grade {user.classTeacherOf}</span>
                          )}
                        </div>
                      ) : user.role === 'student' ? (
                        <span className="text-xs text-gray-500">{user.grade ? `Grade ${user.grade}` : '-'} {user.pathway ? `(${user.pathway})` : ''}</span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`input ${formErrors.name ? 'border-red-500' : ''}`}
                  placeholder="Enter full name"
                />
                {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`input ${formErrors.email ? 'border-red-500' : ''}`}
                  placeholder="user@example.com"
                />
                {formErrors.email && <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="label">
                  Password {selectedUser && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`input pr-10 ${formErrors.password ? 'border-red-500' : ''}`}
                    placeholder={selectedUser ? 'New password (optional)' : 'Enter password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>}
              </div>

              <div>
                <label className="label">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={`input ${formErrors.role ? 'border-red-500' : ''}`}
                >
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="school_worker">School Worker</option>
                  <option value="community_member">Community Member</option>
                </select>
                {formErrors.role && <p className="text-sm text-red-500 mt-1">{formErrors.role}</p>}
              </div>

              {formData.role === 'teacher' && (
                <>
                  <div>
                    <label className="label">Assigned Subjects</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {[
                        'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics',
                        'History', 'Geography', 'CRE', 'Business Studies', 'Agriculture',
                        'Computer Studies', 'Music', 'Physical Education', 'Art & Design',
                        'French', 'German', 'Home Science',
                      ].map(subject => (
                        <label key={subject} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={(formData.assignedSubjects || []).includes(subject)}
                            onChange={() => toggleSubject(subject)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">{subject}</span>
                        </label>
                      ))}
                    </div>
                    {(formData.assignedSubjects || []).length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">{formData.assignedSubjects.length} subject(s) selected</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Class Teacher Of</label>
                    <select
                      name="classTeacherOf"
                      value={formData.classTeacherOf}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Not a class teacher</option>
                      {['7', '8', '9', '10', '11', '12'].map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Assign as class teacher for a specific grade</p>
                  </div>
                </>
              )}

              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="+254 700 000 000"
                />
              </div>

              {formData.role === 'student' && (
                <>
                  <div>
                    <label className="label">Admission Number</label>
                    <input
                      type="text"
                      name="admissionNumber"
                      value={formData.admissionNumber}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="e.g. STD-2026-001"
                    />
                  </div>
                  <div>
                    <label className="label">Grade</label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Select Grade</option>
                      {['7','8','9','10','11','12'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Pathway</label>
                    <select
                      name="pathway"
                      value={formData.pathway}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Select Pathway</option>
                      <option value="STEM">STEM</option>
                      <option value="SSC">Social Sciences (SSC)</option>
                      <option value="Sports">Sports</option>
                      <option value="Arts">Arts</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </span>
                  ) : selectedUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-center text-gray-900">Delete User</h3>
              <p className="text-gray-600 text-center mt-2">
                Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={closeModal} className="btn flex-1">
                Cancel
              </button>
              <button onClick={handleDelete} className="btn bg-red-600 hover:bg-red-700 text-white flex-1">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
