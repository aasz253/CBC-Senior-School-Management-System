import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Newspaper, Eye, EyeOff, Loader } from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const AdminNews = () => {
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('news');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', isPublic: false, category: 'general', imageUrl: '', expiresAt: '' });
  const [eventData, setEventData] = useState({ title: '', description: '', date: '', location: '', isPublic: false, eventType: 'other' });
  const [submitting, setSubmitting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'news') {
        const res = await api.get('/news');
        setNews(res.data.news);
      } else {
        const res = await api.get('/news/events');
        setEvents(res.data.events);
      }
    } catch (err) {
      showError('Failed to load data');
    } finally { setLoading(false); }
  };

  const openAddModal = () => {
    setSelectedItem(null);
    if (activeTab === 'news') {
      setFormData({ title: '', content: '', isPublic: false, category: 'general', imageUrl: '', expiresAt: '' });
    } else {
      setEventData({ title: '', description: '', date: '', location: '', isPublic: false, eventType: 'other' });
    }
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    if (activeTab === 'news') {
      setFormData({ title: item.title, content: item.content, isPublic: item.isPublic, category: item.category, imageUrl: item.imageUrl || '', expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : '' });
    } else {
      setEventData({ title: item.title, description: item.description, date: new Date(item.date).toISOString().split('T')[0], location: item.location, isPublic: item.isPublic, eventType: item.eventType });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (activeTab === 'news') {
        const payload = { ...formData, expiresAt: formData.expiresAt || undefined };
        if (selectedItem) {
          await api.put(`/news/${selectedItem._id}`, payload);
          showSuccess('News updated');
        } else {
          await api.post('/news', payload);
          showSuccess('News created');
        }
      } else {
        if (selectedItem) {
          await api.put(`/news/events/${selectedItem._id}`, eventData);
          showSuccess('Event updated');
        } else {
          await api.post('/news/events', eventData);
          showSuccess('Event created');
        }
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      const endpoint = activeTab === 'news' ? `/news/${id}` : `/news/events/${id}`;
      await api.delete(endpoint);
      showSuccess('Deleted successfully');
      fetchData();
    } catch (err) {
      showError('Failed to delete');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{activeTab === 'news' ? 'News Management' : 'Events Management'}</h1>
          <p className="text-gray-600 mt-1">Manage school announcements and events</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Add {activeTab === 'news' ? 'News' : 'Event'}</button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('news')} className={`btn text-sm ${activeTab === 'news' ? 'btn-primary' : 'btn-secondary'}`}>News</button>
        <button onClick={() => setActiveTab('events')} className={`btn text-sm ${activeTab === 'events' ? 'btn-primary' : 'btn-secondary'}`}>Events</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : activeTab === 'news' ? (
        <div className="space-y-4">
          {news.length === 0 ? <p className="text-center text-gray-500 py-8">No news articles</p> : news.map(item => (
            <div key={item._id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {item.isPinned && <span className="badge badge-red">Pinned</span>}
                  <span className={`badge ${item.isPublic ? 'badge-green' : 'badge-blue'}`}>{item.isPublic ? 'Public' : 'Internal'}</span>
                  <span className="badge badge-gray">{item.category}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.content}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(item.createdAt).toLocaleDateString('en-KE')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(item._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {events.length === 0 ? <p className="text-center text-gray-500 py-8">No events</p> : events.map(event => (
            <div key={event._id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${event.isPublic ? 'badge-green' : 'badge-blue'}`}>{event.isPublic ? 'Public' : 'Internal'}</span>
                  <span className="badge badge-gray">{event.eventType}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(event.date).toLocaleDateString('en-KE')} @ {event.location}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(event)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(event._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold">{selectedItem ? 'Edit' : 'Add'} {activeTab === 'news' ? 'News' : 'Event'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Title</label><input type="text" value={activeTab === 'news' ? formData.title : eventData.title} onChange={(e) => activeTab === 'news' ? setFormData({ ...formData, title: e.target.value }) : setEventData({ ...eventData, title: e.target.value })} className="input" required /></div>
              {activeTab === 'news' ? (
                <>
                  <div><label className="label">Content</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="input" rows={4} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input"><option value="general">General</option><option value="academic">Academic</option><option value="sports">Sports</option><option value="events">Events</option><option value="fees">Fees</option><option value="exams">Exams</option><option value="holiday">Holiday</option></select></div>
                    <div><label className="label">Expires</label><input type="date" value={formData.expiresAt} onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })} className="input" /></div>
                  </div>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isPublic} onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })} className="w-4 h-4" /><span className="text-sm text-gray-700">Public (visible to community)</span></label>
                </>
              ) : (
                <>
                  <div><label className="label">Description</label><textarea value={eventData.description} onChange={(e) => setEventData({ ...eventData, description: e.target.value })} className="input" rows={3} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Date</label><input type="date" value={eventData.date} onChange={(e) => setEventData({ ...eventData, date: e.target.value })} className="input" required /></div>
                    <div><label className="label">Location</label><input type="text" value={eventData.location} onChange={(e) => setEventData({ ...eventData, location: e.target.value })} className="input" required /></div>
                  </div>
                  <div><label className="label">Type</label><select value={eventData.eventType} onChange={(e) => setEventData({ ...eventData, eventType: e.target.value })} className="input"><option value="other">Other</option><option value="sports">Sports</option><option value="academic">Academic</option><option value="cultural">Cultural</option><option value="meeting">Meeting</option><option value="holiday">Holiday</option><option value="exam">Exam</option></select></div>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={eventData.isPublic} onChange={(e) => setEventData({ ...eventData, isPublic: e.target.checked })} className="w-4 h-4" /><span className="text-sm text-gray-700">Public event</span></label>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">{submitting ? <span className="flex items-center justify-center"><Loader className="w-4 h-4 animate-spin mr-2" />Saving...</span> : selectedItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNews;
