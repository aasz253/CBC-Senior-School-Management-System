import { useState, useEffect } from 'react';
import { ClipboardList, Newspaper, Calendar, Loader } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const WorkerDashboard = () => {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsRes, eventsRes] = await Promise.all([
          api.get('/news'),
          api.get('/news/events'),
        ]);
        setNews(newsRes.data.news);
        setEvents(eventsRes.data.events);
      } catch (err) {
        showError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
        <p className="text-gray-600 mt-1">School Worker Dashboard</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School News */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Newspaper className="w-5 h-5" /> School News
          </h3>
          {news.length === 0 ? (
            <p className="text-gray-500 text-sm">No news available</p>
          ) : (
            <div className="space-y-3">
              {news.slice(0, 5).map(item => (
                <div key={item._id} className="p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${item.isPublic ? 'badge-green' : 'badge-blue'}`}>{item.isPublic ? 'Public' : 'Internal'}</span>
                    <span className="badge badge-gray">{item.category}</span>
                  </div>
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(item.createdAt).toLocaleDateString('en-KE')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Upcoming Events
          </h3>
          {events.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 5).map(event => (
                <div key={event._id} className="p-3 border border-gray-100 rounded-lg">
                  <h4 className="font-medium text-gray-900">{event.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{new Date(event.date).toLocaleDateString('en-KE')}</span>
                    <span>{event.location}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assigned Tasks */}
      <div className="card mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" /> My Assigned Tasks
        </h3>
        <div className="text-center py-8">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tasks assigned yet. Contact admin for task assignments.</p>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
