const Footer = () => (
  <footer className="bg-gray-900 text-gray-400 py-8 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-semibold text-lg mb-2">CBC Senior School</h3>
          <p className="text-sm">Empowering learners through competency-based education for Grades 10, 11 & 12.</p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm">
            <li><a href="/news" className="hover:text-white transition-colors">News & Events</a></li>
            <li><a href="/login" className="hover:text-white transition-colors">Login</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-2">Contact</h3>
          <p className="text-sm">Email: info@cbcschool.ac.ke</p>
          <p className="text-sm">Phone: +254 700 000 000</p>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-6 pt-6 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} CBC Senior School Management System. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
