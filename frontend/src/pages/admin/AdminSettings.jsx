import { useState } from 'react';
import { Settings, Save, Loader } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminSettings = () => {
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    name: 'CBC Senior School',
    email: 'info@cbcschool.ac.ke',
    phone: '+254 700 000 000',
    address: 'Nairobi, Kenya',
    motto: 'Education for Excellence',
    currentYear: '2026',
    currentTerm: '1',
  });
  const [pathways, setPathways] = useState([
    { name: 'STEM', subjects: 'Physics, Chemistry, Biology, Mathematics, Computer Science', active: true },
    { name: 'Arts & Sports', subjects: 'Music, Drama, Fine Art, Sports Science, Physical Education', active: true },
    { name: 'Social Sciences', subjects: 'History, Geography, Business Studies, CRE/IRE, Languages', active: true },
  ]);

  const handleSaveSchool = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In production, this would save to a settings collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccess('School settings saved');
    } catch (err) {
      showError('Failed to save settings');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Configure school information and academic settings</p>
      </div>

      {/* School Information */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> School Information</h2>
        <form onSubmit={handleSaveSchool} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">School Name</label><input type="text" value={schoolInfo.name} onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })} className="input" /></div>
            <div><label className="label">Email</label><input type="email" value={schoolInfo.email} onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })} className="input" /></div>
            <div><label className="label">Phone</label><input type="tel" value={schoolInfo.phone} onChange={(e) => setSchoolInfo({ ...schoolInfo, phone: e.target.value })} className="input" /></div>
            <div><label className="label">Address</label><input type="text" value={schoolInfo.address} onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })} className="input" /></div>
            <div><label className="label">Motto</label><input type="text" value={schoolInfo.motto} onChange={(e) => setSchoolInfo({ ...schoolInfo, motto: e.target.value })} className="input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Academic Year</label><select value={schoolInfo.currentYear} onChange={(e) => setSchoolInfo({ ...schoolInfo, currentYear: e.target.value })} className="input">{['2026','2027','2028','2029','2030'].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><label className="label">Current Term</label><select value={schoolInfo.currentTerm} onChange={(e) => setSchoolInfo({ ...schoolInfo, currentTerm: e.target.value })} className="input"><option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option></select></div>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary flex items-center gap-2"><Save className="w-4 h-4" />{loading ? <span className="flex items-center"><Loader className="w-4 h-4 animate-spin mr-2" />Saving...</span> : 'Save Settings'}</button>
        </form>
      </div>

      {/* Pathways */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">CBC Pathways</h2>
        <div className="space-y-4">
          {pathways.map((pathway, i) => (
            <div key={i} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{pathway.name}</h3>
                <span className={`badge ${pathway.active ? 'badge-green' : 'badge-red'}`}>{pathway.active ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="text-sm text-gray-600">{pathway.subjects}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
