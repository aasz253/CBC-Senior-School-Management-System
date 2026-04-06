import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { GraduationCap, BookOpen, Users, Newspaper, ArrowRight, Shield, Clock, DollarSign } from 'lucide-react';

const LandingPage = () => {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await api.get('/news?isPublic=true&limit=3');
        setNews(res.data.news);
      } catch (err) {
        // Silent fail for public page
      }
    };
    fetchNews();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-3xl mb-6 backdrop-blur-sm">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
              CBC Senior School
              <span className="block text-primary-200">Management System</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-100 max-w-2xl mx-auto mb-8">
              Complete school management for Grades 10, 11 & 12. Manage marks, fees, attendance, assignments, and communication - all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login" className="btn bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 text-lg font-semibold">
                Sign In
              </Link>
              <Link to="/register" className="btn border-2 border-white text-white hover:bg-white/10 px-8 py-3 text-lg font-semibold">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything You Need</h2>
            <p className="text-gray-600 mt-2">Built for Kenyan CBC Senior Schools</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, title: 'CBC Marks', desc: 'Competency-based assessment with Beginning, Approaching, Meeting, Exceeding levels', color: 'bg-blue-100 text-blue-600' },
              { icon: DollarSign, title: 'M-PESA Fees', desc: 'Pay fees via M-PESA Lipa Na M-PESA with automatic balance tracking', color: 'bg-green-100 text-green-600' },
              { icon: Users, title: 'Multi-Role Access', desc: 'Different dashboards for Admin, Teacher, Student, Worker, and Community', color: 'bg-purple-100 text-purple-600' },
              { icon: Shield, title: 'Secure & Private', desc: 'Role-based access ensures everyone sees only what they should', color: 'bg-red-100 text-red-600' },
              { icon: Clock, title: 'Attendance & Timetable', desc: 'Digital attendance tracking and timetable management for all classes', color: 'bg-yellow-100 text-yellow-600' },
              { icon: Newspaper, title: 'News & Events', desc: 'Public and internal news, events calendar, and push notifications', color: 'bg-indigo-100 text-indigo-600' },
            ].map((feature, i) => (
              <div key={i} className="card hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pathways */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">CBC Pathways</h2>
            <p className="text-gray-600 mt-2">Three specialized pathways for Senior School</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'STEM', color: 'from-blue-500 to-blue-700', subjects: 'Physics, Chemistry, Biology, Mathematics, Computer Science' },
              { name: 'Arts & Sports', color: 'from-purple-500 to-purple-700', subjects: 'Music, Drama, Fine Art, Sports Science, Physical Education' },
              { name: 'Social Sciences', color: 'from-green-500 to-green-700', subjects: 'History, Geography, Business Studies, CRE/IRE, Languages' },
            ].map((pathway, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className={`bg-gradient-to-r ${pathway.color} p-6 text-white`}>
                  <h3 className="text-xl font-bold">{pathway.name}</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 text-sm">{pathway.subjects}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News */}
      {news.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Latest News</h2>
              <Link to="/news" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.map(item => (
                <div key={item._id} className="card hover:shadow-md transition-shadow">
                  <span className={`badge ${item.category === 'academic' ? 'badge-blue' : 'badge-gray'} mb-3`}>{item.category}</span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3">{item.content}</p>
                  <p className="text-xs text-gray-400 mt-3">{new Date(item.createdAt).toLocaleDateString('en-KE')}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-100 text-lg mb-8">Join our school management system and streamline your CBC Senior School operations.</p>
          <Link to="/register" className="btn bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 text-lg font-semibold">
            Create Your Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
