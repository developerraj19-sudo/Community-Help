import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiX, FiLogOut, FiUser, FiClock, FiAlertCircle, FiGlobe, FiChevronDown } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'kn', name: 'Kannada' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'gom', name: 'Konkani' }
  ];

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
  };

  const currentLang = getCookie('googtrans')?.split('/')[2] || 'en';
  const [selectedLang, setSelectedLang] = useState(currentLang);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setSelectedLang(lang);

    document.cookie = `googtrans=/en/${lang}; path=/`;
    document.cookie = `googtrans=/en/${lang}; domain=${window.location.hostname}; path=/`;

    const gtSelect = document.querySelector('.goog-te-combo');
    if (gtSelect) {
      gtSelect.value = lang;
      gtSelect.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      window.location.reload();
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const links = {
    user: [
      { to: '/user-dashboard', label: 'Dashboard' },
      { to: '/emergency', label: 'Emergency' },
      { to: '/utility-services', label: 'Services' },
      { to: '/history', label: 'History' },
    ],
    provider: [
      { to: '/provider-dashboard', label: 'Dashboard' },
      { to: '/history', label: 'Jobs' },
    ],
    admin: [
      { to: '/admin-dashboard', label: 'Dashboard' },
    ],
  };

  const navLinks = links[user?.role] || [];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="min-w-[2rem] h-8 px-2 bg-red-600 rounded-lg flex items-center justify-center font-black text-white text-sm flex-shrink-0 whitespace-nowrap transition-all">CH</div>
            <span className="font-bold text-gray-900 whitespace-nowrap truncate hidden sm:block">Community Help</span>
          </Link>

          <div className="hidden md:flex items-center gap-1 lg:gap-2 flex-shrink min-w-0 overflow-hidden">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} className="px-2 lg:px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-sm transition whitespace-nowrap truncate">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user?.role !== 'admin' && (
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  title="Change Language"
                >
                  <FiGlobe className="text-gray-500" />
                  <span className="hidden lg:block">{LANGUAGES.find(l => l.code === selectedLang)?.name || 'English'}</span>
                  <span className="lg:hidden">{selectedLang.toUpperCase()}</span>
                  <FiChevronDown className={`text-gray-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-50 overflow-hidden transform origin-top-right transition-all">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          handleLanguageChange({ target: { value: lang.code } });
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center justify-between ${selectedLang === lang.code ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {lang.name}
                        {selectedLang === lang.code && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {user && (
              <Link to="/profile" className="hidden md:flex items-center gap-2 lg:gap-3 bg-gray-50 rounded-xl px-3 lg:px-4 py-2 border border-gray-100 h-10 lg:h-12 flex-shrink min-w-0 hover:bg-red-50 hover:border-red-100 transition cursor-pointer">
                <div className="w-7 h-7 lg:w-8 lg:h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiUser className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-xs lg:text-sm font-bold text-gray-800 leading-snug whitespace-nowrap truncate">{user?.name}</div>
                  <div className="text-[10px] lg:text-xs text-gray-500 capitalize leading-snug whitespace-nowrap hidden lg:block border-l border-gray-300 pl-2 flex-shrink-0">{user?.role}</div>
                </div>
              </Link>
            )}

            {user ? (
              <button onClick={handleLogout} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition" title="Sign Out">
                <FiLogOut />
              </button>
            ) : (
              <Link to="/login" className="hidden md:block px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition">
                Sign In
              </Link>
            )}
            <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
              {open ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
          <div className="space-y-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-2">
            {user ? (
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium">
                Sign Out
              </button>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
