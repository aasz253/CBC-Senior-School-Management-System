import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Calendar, MapPin, Newspaper } from 'lucide-react';

const PublicNewsPage = () => {
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsRes, eventsRes] = await Promise.all([
          api.get('/news?isPublic=true'),
          api.get('/news/events?isPublic=true'),
        ]);
        setNews(newsRes.data.news);
        setEvents(eventsRes.data.events);
      } catch (err) {
        console.error('Failed to fetch public content');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">News & Events</h1>
        <p className="text-gray-600 mt-1">Stay updated with the latest from our school</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* News */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Newspaper className="w-5 h-5 mr-2" /> Latest News
          </h2>
          {news.length === 0 ? (
            <p className="text-gray-500">No news available at the moment.</p>
          ) : (
            <div className="space-y-4">
              {news.map(item => (
                <div key={item._id} className="card hover:shadow-md transition-shadow">
                  {item.isPinned && <span className="badge badge-red mb-2">Pinned</span>}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.content}</p>
                  <div className="flex items-center mt-3 text-xs text-gray-400">
                    <span className={`badge ${item.category === 'academic' ? 'badge-blue' : 'badge-gray'} mr-2`}>{item.category}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Events */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" /> Upcoming Events
          </h2>
          {events.length === 0 ? (
            <p className="text-gray-500">No upcoming events.</p>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event._id} className="card p-4">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {new Date(event.date).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      {event.location}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{event.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicNewsPage;
