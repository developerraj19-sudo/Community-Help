import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiTool, FiUsers, FiShield, FiMapPin, FiCpu, FiArrowRight, FiGlobe, FiChevronDown } from 'react-icons/fi';
import { MdLocalHospital, MdLocalPolice, MdFireTruck } from 'react-icons/md';

export default function LandingPage() {
  const navigate = useNavigate();
  
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };
  
  const [selectedLang, setSelectedLang] = useState(getCookie('googtrans')?.split('/')[2] || 'en');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langRef = useRef(null);

  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ta', name: 'Tamil' },
    { code: 'gom', name: 'Konkani' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lang) => {
    setSelectedLang(lang);
    document.cookie = `googtrans=/en/${lang}; path=/`;
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-red-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="min-w-[2rem] sm:min-w-[2.5rem] px-2 h-8 sm:h-10 bg-red-600 rounded-xl flex items-center justify-center font-black text-sm sm:text-lg flex-shrink-0 whitespace-nowrap">CH</div>
          <span className="font-bold text-lg sm:text-xl hidden sm:block whitespace-nowrap truncate">Community Help</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative z-50" ref={langRef}>
            <button 
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-2 bg-white/10 border border-white/20 hover:border-red-400 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all"
              title="Change Language"
            >
              <FiGlobe className="text-gray-300" />
              <span className="hidden lg:block">{LANGUAGES.find(l => l.code === selectedLang)?.name || 'English'}</span>
              <span className="lg:hidden">{selectedLang.toUpperCase()}</span>
              <FiChevronDown className={`text-gray-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 z-50 overflow-hidden transform origin-top-right transition-all">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      handleLanguageChange(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors flex items-center justify-between ${
                      selectedLang === lang.code ? 'bg-red-900/50 text-red-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {lang.name}
                    {selectedLang === lang.code && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button onClick={() => navigate('/login')} className="hidden sm:block px-5 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition font-medium text-sm">Sign In</button>
            <button onClick={() => navigate('/register')} className="px-3 sm:px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 transition font-medium text-xs sm:text-sm">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 sm:pt-20 pb-12 sm:pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-red-300 text-xs sm:text-sm mb-6 sm:mb-8">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" /> <span className="truncate">Emergency services available 24/7</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 leading-tight">
          Community Help <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
            At Your Fingertips
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Connect with local emergency services and utility professionals instantly. 
          We bridge the gap between those in need and those who can help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => navigate('/register')} className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-bold text-lg transition shadow-xl shadow-red-900/40 flex items-center justify-center gap-2">
            Join as Resident <FiArrowRight />
          </button>
          <button onClick={() => navigate('/register-provider')} className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg transition border border-white/20">
            Join as Service Provider
          </button>
        </div>
      </div>

      {/* Emergency Cards */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mb-16">
        <h2 className="text-center text-2xl font-bold mb-8 text-gray-300">Emergency Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            { icon: MdLocalHospital, label: 'Ambulance', color: 'from-red-600 to-red-800', desc: 'Nearest hospital dispatched in seconds' },
            { icon: MdLocalPolice, label: 'Police', color: 'from-blue-600 to-blue-800', desc: 'Nearest station alerted immediately' },
            { icon: MdFireTruck, label: 'Fire Brigade', color: 'from-orange-500 to-orange-700', desc: 'Fire unit dispatched with live tracking' },
          ].map(({ icon: Icon, label, color, desc }) => (
            <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-center`}>
              <Icon className="w-12 h-12 mx-auto mb-3" />
              <div className="font-bold text-xl mb-1">{label}</div>
              <div className="text-sm text-white/70">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 mb-20">
        <h2 className="text-center text-2xl font-bold mb-10 text-gray-300">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            { icon: FiMapPin, title: 'Location-Based Matching', desc: 'Finds verified providers nearest to you automatically' },
            { icon: FiShield, title: 'Secure JWT Auth', desc: 'Role-based access for Users, Providers & Admins' },
            { icon: FiCpu, title: 'AI Chat Assistant', desc: 'Get emergency guidance and service recommendations' },
            { icon: FiTool, title: 'Utility Services', desc: 'Plumber, Electrician, Carpenter & more on demand' },
            { icon: FiUsers, title: 'Verified Providers', desc: 'All service providers are background-checked' },
            { icon: FiAlertCircle, title: 'SOS with Tracking', desc: 'One-tap SOS with real-time provider location' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition">
              <Icon className="w-8 h-8 text-red-400 mb-3" />
              <div className="font-semibold mb-1">{title}</div>
              <div className="text-sm text-gray-400">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center py-8 border-t border-white/10 text-gray-500 text-sm">
        © 2024 Community Help Platform — Dept. of CS&E, Team 26_GB15
      </footer>
    </div>
  );
}
