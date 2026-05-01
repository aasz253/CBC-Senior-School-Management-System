import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import {
  School, Users, BookOpen, Trophy, MapPin, Calendar, Star,
  ChevronDown, ChevronUp, Award, Building2, Shield, Heart, Music,
  Activity, Briefcase, GraduationCap, Eye,
} from 'lucide-react';

const ImageCard = ({ src, alt, title, subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
    <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="text-gray-300">
          <Users className="w-12 h-12" />
        </div>
      )}
    </div>
    <div className="p-3 text-center">
      {title && <p className="font-semibold text-gray-900 text-sm">{title}</p>}
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

const Section = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
};

const SchoolDetailsPage = () => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get('/school');
        setDetails(res.data.data);
      } catch (err) {
        console.error('Failed to fetch school details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!details) return <div className="p-8 text-center text-gray-500">No school details available.</div>;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBA';
    return new Date(dateStr).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 text-white mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {details.logo ? (
              <img src={details.logo} alt="School Logo" className="w-full h-full object-cover" />
            ) : (
              <School className="w-12 h-12 text-primary-600" />
            )}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-extrabold">{details.name || 'CBC Senior School'}</h1>
            {details.motto && (
              <p className="text-primary-200 text-lg mt-1 italic">"{details.motto}"</p>
            )}
          </div>
        </div>
      </div>

      {/* School Photo */}
      {details.schoolPhoto && (
        <div className="rounded-2xl overflow-hidden mb-8 shadow-lg">
          <img src={details.schoolPhoto} alt="School" className="w-full h-64 md:h-80 object-cover" />
        </div>
      )}

      {/* Vision & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card border-l-4 border-l-primary-500">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary-600" /> Vision
          </h3>
          <p className="text-gray-600">{details.vision}</p>
        </div>
        <div className="card border-l-4 border-l-accent-500">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Award className="w-5 h-5 text-accent-500" /> Mission
          </h3>
          <p className="text-gray-600">{details.mission}</p>
        </div>
      </div>

      {/* Term Dates */}
      {details.currentTerm?.openingDate || details.currentTerm?.closingDate ? (
        <div className="card mb-6 bg-accent-50 border border-accent-100">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-accent-600" />
            <h2 className="text-lg font-bold text-accent-800">
              {details.currentTerm?.name || 'Current'} Term {details.currentTerm?.year || ''}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-accent-600">Opening Date</p>
              <p className="font-semibold text-accent-900">{formatDate(details.currentTerm?.openingDate)}</p>
            </div>
            <div>
              <p className="text-sm text-accent-600">Closing Date</p>
              <p className="font-semibold text-accent-900">{formatDate(details.currentTerm?.closingDate)}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Leadership */}
      <Section title="School Leadership" icon={Shield} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {details.principal?.name && (
            <ImageCard
              src={details.principal.photo}
              alt="Principal"
              title={details.principal.name}
              subtitle="Principal"
            />
          )}
          {details.deputyPrincipal?.name && (
            <ImageCard
              src={details.deputyPrincipal.photo}
              alt="Deputy Principal"
              title={details.deputyPrincipal.name}
              subtitle="Deputy Principal"
            />
          )}
          {details.deanOfStudies?.name && (
            <ImageCard
              src={details.deanOfStudies.photo}
              alt="Dean of Studies"
              title={details.deanOfStudies.name}
              subtitle="Dean of Studies"
            />
          )}
        </div>
        {details.principal?.message && (
          <div className="mt-4 p-4 bg-primary-50 rounded-lg italic text-gray-700">
            "{details.principal.message}"
          </div>
        )}
      </Section>

      {/* Academic Performance */}
      <Section title="Academic Performance" icon={BookOpen}>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Grade 10', value: details.gradeMeans?.grade10 },
            { label: 'Grade 11', value: details.gradeMeans?.grade11 },
            { label: 'Grade 12', value: details.gradeMeans?.grade12 },
          ].map(g => (
            <div key={g.label} className="bg-white rounded-xl p-4 text-center border border-gray-100">
              <p className="text-sm text-gray-500">{g.label}</p>
              <p className="text-3xl font-extrabold text-primary-600">{g.value || 'N/A'}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Student Leadership */}
      <Section title="Student Leadership" icon={GraduationCap}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {details.studentLeadership?.president?.name && (
            <ImageCard
              src={details.studentLeadership.president.photo}
              alt="School President"
              title={details.studentLeadership.president.name}
              subtitle="School President"
            />
          )}
          {details.studentLeadership?.deputyPresident?.name && (
            <ImageCard
              src={details.studentLeadership.deputyPresident.photo}
              alt="Deputy President"
              title={details.studentLeadership.deputyPresident.name}
              subtitle="Deputy School President"
            />
          )}
        </div>
      </Section>

      {/* Sports Clubs */}
      <Section title="Sports Clubs" icon={Trophy}>
        {details.sportsClubs?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {details.sportsClubs.map((club, i) => (
              <ImageCard key={i} src={club.photo} alt={club.name} title={club.name} subtitle={club.description} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No sports clubs listed yet.</p>
        )}
      </Section>

      {/* Co-curricular Activities */}
      <Section title="Co-curricular Activities" icon={Activity}>
        {details.coCurricularActivities?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {details.coCurricularActivities.map((act, i) => (
              <ImageCard key={i} src={act.photo} alt={act.name} title={act.name} subtitle={act.description} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No activities listed yet.</p>
        )}
      </Section>

      {/* Teaching Staff */}
      <Section title="Teaching Staff" icon={Users}>
        {details.staffGallery?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {details.staffGallery.map((staff, i) => (
              <ImageCard key={i} src={staff.photo} alt={staff.name} title={staff.name} subtitle={staff.role} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No staff photos yet.</p>
        )}
      </Section>

      {/* Workers & Guards */}
      <Section title="Workers & Support Staff" icon={Briefcase}>
        {details.workersGallery?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {details.workersGallery.map((w, i) => (
              <ImageCard key={i} src={w.photo} alt={w.name} title={w.name} subtitle={w.role} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No photos yet.</p>
        )}
      </Section>

      {/* School Buildings & Gallery */}
      <Section title="School Gallery" icon={Building2}>
        {details.schoolPhotos?.length > 0 || details.gallery?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {details.schoolPhotos?.map((p, i) => (
              <ImageCard key={`sp-${i}`} src={p.photo} alt={p.title} title={p.title} />
            ))}
            {details.gallery?.map((p, i) => (
              <ImageCard key={`g-${i}`} src={p.photo} alt={p.title} title={p.title} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No gallery photos yet.</p>
        )}
      </Section>

      {/* Location */}
      <Section title="Location" icon={MapPin}>
        {details.location?.address || details.location?.county ? (
          <div className="space-y-2">
            {details.location.county && (
              <p className="text-sm"><span className="font-medium">County:</span> {details.location.county}</p>
            )}
            {details.location.subCounty && (
              <p className="text-sm"><span className="font-medium">Sub-County:</span> {details.location.subCounty}</p>
            )}
            {details.location.address && (
              <p className="text-sm"><span className="font-medium">Address:</span> {details.location.address}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Location details not available.</p>
        )}
      </Section>
    </div>
  );
};

export default SchoolDetailsPage;
