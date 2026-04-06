import { useState, useEffect } from 'react';
import { Clock, Loader } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const TeacherTimetable = () => {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const res = await api.get('/timetable');
      setTimetable(res.data.groupedByDay || {});
    } catch (err) {
      showError('Failed to load timetable');
    } finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
        <p className="text-gray-600 mt-1">Your weekly class schedule</p>
      </div>

      {Object.keys(timetable).length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No timetable entries found</p></div>
      ) : (
        <div className="space-y-6">
          {days.map(day => (
            timetable[day] && (
              <div key={day} className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{day}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {timetable[day].map(entry => (
                    <div key={entry._id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{entry.subject}</span>
                        <span className="badge badge-blue">Period {entry.period}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {entry.startTime} - {entry.endTime}
                      </div>
                      {entry.room && <p className="text-xs text-gray-400 mt-1">Room: {entry.room}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherTimetable;
