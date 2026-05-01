import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  Save, Upload, Plus, Trash2, Loader, Image as ImageIcon,
  School, Users, BookOpen, Trophy, MapPin, Calendar, Star,
  Shield, Activity, Building2, Briefcase, GraduationCap, Award,
} from 'lucide-react';

const ImageUpload = ({ label, value, onChange }) => {
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(res.data.url);
      setPreview(res.data.url);
    } catch (err) {
      // Store locally if no upload endpoint
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result);
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
          {preview ? (
            <img src={preview} alt={label} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id={`upload-${label}`} />
          <label htmlFor={`upload-${label}`} className="btn btn-secondary text-sm cursor-pointer inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload
          </label>
          <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
        </div>
        {uploading && <Loader className="w-4 h-4 animate-spin" />}
      </div>
    </div>
  );
};

const InputField = ({ label, ...props }) => (
  <div>
    <label className="label">{label}</label>
    <input className="input" {...props} />
  </div>
);

const TextareaField = ({ label, ...props }) => (
  <div>
    <label className="label">{label}</label>
    <textarea className="input" rows={3} {...props} />
  </div>
);

const DynamicList = ({ items, setItems, labelKey = 'name', roleKey = 'role' }) => {
  const addItem = () => setItems([...items, { [labelKey]: '', photo: '', [roleKey]: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: val };
    setItems(updated);
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
            {item.photo ? (
              <img src={item.photo} alt={item[labelKey]} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400"><Users className="w-5 h-5" /></div>
            )}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            <input className="input text-sm" placeholder="Name" value={item[labelKey] || ''} onChange={e => updateItem(i, labelKey, e.target.value)} />
            <input className="input text-sm" placeholder="Role/Description" value={item[roleKey] || ''} onChange={e => updateItem(i, roleKey, e.target.value)} />
            <input className="input text-sm col-span-2" placeholder="Photo URL" value={item.photo || ''} onChange={e => updateItem(i, 'photo', e.target.value)} />
          </div>
          <button onClick={() => removeItem(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <button onClick={addItem} className="btn btn-secondary text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" /> Add {labelKey}
      </button>
    </div>
  );
};

const AdminSchoolDetails = () => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get('/school');
        const data = res.data.data;
        // Ensure arrays exist
        data.sportsClubs = data.sportsClubs || [];
        data.coCurricularActivities = data.coCurricularActivities || [];
        data.staffGallery = data.staffGallery || [];
        data.workersGallery = data.workersGallery || [];
        data.schoolPhotos = data.schoolPhotos || [];
        data.gallery = data.gallery || [];
        setDetails(data);
      } catch (err) {
        showError('Failed to load school details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, []);

  const update = (field, value) => setDetails(prev => ({ ...prev, [field]: value }));
  const updateNested = (parent, field, value) => setDetails(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
  const updateDeep = (parent, child, field, value) => setDetails(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: { ...prev[parent][child], [field]: value } } }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/school', details);
      success('School details updated successfully');
    } catch (err) {
      showError('Failed to update school details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader className="w-8 h-8 animate-spin text-primary-600" /></div>;
  if (!details) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage School Details</h1>
        <button onClick={save} disabled={saving} className="btn btn-primary flex items-center gap-2">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* School Identity */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <School className="w-5 h-5 text-primary-600" /> School Identity
        </h2>
        <div className="space-y-4">
          <InputField label="School Name" value={details.name} onChange={e => update('name', e.target.value)} />
          <InputField label="Motto" value={details.motto} onChange={e => update('motto', e.target.value)} />
          <TextareaField label="Vision" value={details.vision} onChange={e => update('vision', e.target.value)} />
          <TextareaField label="Mission" value={details.mission} onChange={e => update('mission', e.target.value)} />
          <ImageUpload label="School Logo" value={details.logo} onChange={v => update('logo', v)} />
          <ImageUpload label="School Photo (Hero)" value={details.schoolPhoto} onChange={v => update('schoolPhoto', v)} />
        </div>
      </div>

      {/* Leadership */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-600" /> Leadership
        </h2>
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h3 className="font-semibold text-gray-700">Principal</h3>
            <InputField label="Name" value={details.principal?.name || ''} onChange={e => updateNested('principal', 'name', e.target.value)} />
            <ImageUpload label="Photo" value={details.principal?.photo || ''} onChange={v => updateNested('principal', 'photo', v)} />
            <TextareaField label="Message" value={details.principal?.message || ''} onChange={e => updateNested('principal', 'message', e.target.value)} />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h3 className="font-semibold text-gray-700">Deputy Principal</h3>
            <InputField label="Name" value={details.deputyPrincipal?.name || ''} onChange={e => updateNested('deputyPrincipal', 'name', e.target.value)} />
            <ImageUpload label="Photo" value={details.deputyPrincipal?.photo || ''} onChange={v => updateNested('deputyPrincipal', 'photo', v)} />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h3 className="font-semibold text-gray-700">Dean of Studies</h3>
            <InputField label="Name" value={details.deanOfStudies?.name || ''} onChange={e => updateNested('deanOfStudies', 'name', e.target.value)} />
            <ImageUpload label="Photo" value={details.deanOfStudies?.photo || ''} onChange={v => updateNested('deanOfStudies', 'photo', v)} />
          </div>
        </div>
      </div>

      {/* Academic Performance */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" /> Academic Performance (Mean)
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <InputField label="Grade 10 Mean" type="number" step="0.01" value={details.gradeMeans?.grade10 || ''} onChange={e => update('gradeMeans', { ...details.gradeMeans, grade10: parseFloat(e.target.value) || 0 })} />
          <InputField label="Grade 11 Mean" type="number" step="0.01" value={details.gradeMeans?.grade11 || ''} onChange={e => update('gradeMeans', { ...details.gradeMeans, grade11: parseFloat(e.target.value) || 0 })} />
          <InputField label="Grade 12 Mean" type="number" step="0.01" value={details.gradeMeans?.grade12 || ''} onChange={e => update('gradeMeans', { ...details.gradeMeans, grade12: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>

      {/* Student Leadership */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary-600" /> Student Leadership
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">School President</h3>
            <InputField label="Name" value={details.studentLeadership?.president?.name || ''} onChange={e => updateDeep('studentLeadership', 'president', 'name', e.target.value)} />
            <ImageUpload label="Photo" value={details.studentLeadership?.president?.photo || ''} onChange={v => updateDeep('studentLeadership', 'president', 'photo', v)} />
          </div>
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Deputy President</h3>
            <InputField label="Name" value={details.studentLeadership?.deputyPresident?.name || ''} onChange={e => updateDeep('studentLeadership', 'deputyPresident', 'name', e.target.value)} />
            <ImageUpload label="Photo" value={details.studentLeadership?.deputyPresident?.photo || ''} onChange={v => updateDeep('studentLeadership', 'deputyPresident', 'photo', v)} />
          </div>
        </div>
      </div>

      {/* Sports Clubs */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary-600" /> Sports Clubs
        </h2>
        <DynamicList items={details.sportsClubs} setItems={v => update('sportsClubs', v)} roleKey="description" />
      </div>

      {/* Co-curricular */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-600" /> Co-curricular Activities
        </h2>
        <DynamicList items={details.coCurricularActivities} setItems={v => update('coCurricularActivities', v)} roleKey="description" />
      </div>

      {/* Teaching Staff */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" /> Teaching Staff Gallery
        </h2>
        <DynamicList items={details.staffGallery} setItems={v => update('staffGallery', v)} />
      </div>

      {/* Workers & Guards */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary-600" /> Workers & Guards Gallery
        </h2>
        <DynamicList items={details.workersGallery} setItems={v => update('workersGallery', v)} />
      </div>

      {/* School Photos */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-600" /> School Gallery (Buildings, Events)
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">School Photos</h3>
            <DynamicList items={details.schoolPhotos} setItems={v => update('schoolPhotos', v)} labelKey="title" roleKey="" />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">General Gallery</h3>
            <DynamicList items={details.gallery} setItems={v => update('gallery', v)} labelKey="title" roleKey="" />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-600" /> Location
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="County" value={details.location?.county || ''} onChange={e => update('location', { ...details.location, county: e.target.value })} />
          <InputField label="Sub-County" value={details.location?.subCounty || ''} onChange={e => update('location', { ...details.location, subCounty: e.target.value })} />
          <InputField label="Address" value={details.location?.address || ''} onChange={e => update('location', { ...details.location, address: e.target.value })} />
          <InputField label="Map Embed URL" value={details.location?.mapEmbed || ''} onChange={e => update('location', { ...details.location, mapEmbed: e.target.value })} />
        </div>
      </div>

      {/* Term Dates */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" /> Current Term Dates
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <InputField label="Term Name" value={details.currentTerm?.name || ''} onChange={e => update('currentTerm', { ...details.currentTerm, name: e.target.value })} />
          <InputField label="Year" type="number" value={details.currentTerm?.year || ''} onChange={e => update('currentTerm', { ...details.currentTerm, year: parseInt(e.target.value) || 2026 })} />
          <InputField label="Opening Date" type="date" value={details.currentTerm?.openingDate ? details.currentTerm.openingDate.split('T')[0] : ''} onChange={e => update('currentTerm', { ...details.currentTerm, openingDate: e.target.value })} />
          <InputField label="Closing Date" type="date" value={details.currentTerm?.closingDate ? details.currentTerm.closingDate.split('T')[0] : ''} onChange={e => update('currentTerm', { ...details.currentTerm, closingDate: e.target.value })} />
        </div>
        <div className="mt-4 p-3 bg-accent-50 rounded-lg">
          <p className="text-sm text-accent-700">
            💡 Check the <a href="https://www.education.go.ke/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Ministry of Education website</a> for official term dates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSchoolDetails;
