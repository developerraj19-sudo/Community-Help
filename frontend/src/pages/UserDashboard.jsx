import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { useAuth } from '../context/AuthContext';
import { getMyRequests, getMyEmergencies } from '../api/api';
import { MdLocalHospital, MdLocalPolice, MdFireTruck } from 'react-icons/md';
import { FiAlertCircle, FiActivity, FiTool, FiCheckCircle, FiClock, FiPlus } from 'react-icons/fi';
import { MdPlumbing, MdElectricBolt, MdCarpenter, MdAcUnit } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyRequests(), getMyEmergencies()])
      .then(([r, e]) => { setRequests(r.data.requests); setEmergencies(e.data.emergencies); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Only show the most recent active emergency per type to prevent UI clutter from old duplicates
  const activeEmergencies = emergencies
    .filter(e => e.status !== 'resolved' && e.status !== 'cancelled')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter((em, index, self) => index === self.findIndex((t) => t.type === em.type));

  const allHistory = [...requests, ...emergencies].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentRequests = allHistory.slice(0, 3);

  const emergencyServices = [
    { type: 'ambulance', label: 'Ambulance', icon: MdLocalHospital, bg: 'from-red-500 to-red-700', ring: 'ring-red-400' },
    { type: 'police', label: 'Police', icon: MdLocalPolice, bg: 'from-blue-500 to-blue-700', ring: 'ring-blue-400' },
    { type: 'fire', label: 'Fire Brigade', icon: MdFireTruck, bg: 'from-orange-500 to-orange-700', ring: 'ring-orange-400' },
  ];

  const statusColors = { pending:'bg-yellow-100 text-yellow-700', active:'bg-yellow-100 text-yellow-700', accepted:'bg-blue-100 text-blue-700', completed:'bg-green-100 text-green-700', resolved:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-700', rejected:'bg-gray-100 text-gray-600', 'in-progress':'bg-purple-100 text-purple-700', dispatched:'bg-purple-100 text-purple-700' };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 mt-1">How can we help you today?</p>
        </div>

        {/* Active Emergency Alerts */}
        {activeEmergencies.length > 0 && (
          <div className="space-y-4 mb-6">
            {activeEmergencies.map((em) => (
              <div key={em._id} className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <FiAlertCircle className="text-red-600 w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-red-800">Active Emergency: {em.type.toUpperCase()}</div>
                    <div className="text-red-600 text-sm">Status: {em.status} · ETA: {em.etaMinutes} min</div>
                  </div>
                </div>
                <button onClick={() => navigate(`/track/${em._id}`)} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition">
                  Track →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SOS Emergency Buttons */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FiAlertCircle className="text-red-500" /> Emergency Services
            </h2>
            <span className="text-xs text-gray-400 bg-green-50 text-green-600 border border-green-100 px-3 py-1 rounded-full font-medium">24/7 Available</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {emergencyServices.map(({ type, label, icon: Icon, bg, ring }) => {
              const existingActive = activeEmergencies.find(em => em.type === type);
              return (
                <div key={type} role="button" tabIndex={0} 
                  onClick={() => {
                    if (existingActive) {
                      toast.error(`You already have an active ${label} emergency!`);
                      navigate(`/track/${existingActive._id}`);
                    } else {
                      navigate('/emergency', { state: { type } });
                    }
                  }}
                  className={`emergency-card bg-gradient-to-br ${bg} text-white ${ring} ring-4 ring-opacity-0 hover:ring-opacity-30 ${existingActive ? 'opacity-70 grayscale' : ''}`}>
                  <Icon className="w-10 h-10 mx-auto mb-2" />
                  <div className="font-bold mb-1 text-sm leading-snug">{label}</div>
                  <div className="text-xs text-white/90 leading-relaxed whitespace-nowrap">{existingActive ? 'Track Now' : 'Tap for SOS'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="card bg-gradient-to-br from-blue-50/50 via-blue-50 to-indigo-50/50 border-blue-100/50">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <FiTool className="text-white w-4 h-4" />
              </div>
              Utility Services
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                [MdPlumbing, 'Plumber', 'plumber'],
                [MdElectricBolt, 'Electrician', 'electrician'],
                [MdCarpenter, 'Carpenter', 'carpenter'],
                [MdAcUnit, 'AC Repair', 'ac_repair']
              ].map(([Icon, label, category]) => (
                <button key={category} onClick={() => navigate('/utility-services', { state: { activeCategory: category } })}
                  className="group flex flex-col items-center justify-center gap-2 p-4 bg-white hover:bg-blue-600 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-600/20 transition-all duration-300 border border-transparent">
                  <Icon className="text-2xl text-blue-500 group-hover:text-white transition-colors" />
                  <span className="text-xs font-bold text-gray-700 group-hover:text-white transition-colors text-center w-full truncate">{label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => navigate('/utility-services')} className="w-full mt-4 py-3 bg-white text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100">
              Explore All Services →
            </button>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><FiClock className="text-purple-500" />Recent Requests</h2>
            {loading ? <div className="text-center py-6 text-gray-400">Loading...</div>
            : recentRequests.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <FiClock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No service requests yet</p>
              </div>
            ) : recentRequests.map(req => (
              <div key={req._id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <div className="font-medium text-gray-800 text-sm capitalize">{req.serviceCategory?.replace('_',' ') || `${req.type} Emergency`}</div>
                  <div className="text-xs text-gray-400">
                    {req.scheduledAt ? (
                      <span className="text-purple-600 font-medium whitespace-nowrap">Scheduled: {new Date(req.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    ) : (
                      new Date(req.createdAt).toLocaleDateString()
                    )}
                  </div>
                </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-md ${req.status === 'dispatched' && req.etaMinutes && (Date.now() - new Date(req.createdAt).getTime()) / 1000 >= req.etaMinutes * 60 ? 'bg-green-100 text-green-700' : statusColors[req.status] || 'bg-gray-100 text-gray-700'}`}>
                    {req.status === 'dispatched' && req.etaMinutes && (Date.now() - new Date(req.createdAt).getTime()) / 1000 >= req.etaMinutes * 60 ? 'arrived' : req.status}
                  </div>
              </div>
            ))}
            {allHistory.length > 0 && (
              <button onClick={() => navigate('/history')} className="w-full mt-3 py-2 btn-secondary text-sm rounded-xl">View All →</button>
            )}
          </div>
        </div>

        {/* Police Complaint Quick Access */}
        <div className="card bg-gradient-to-r from-blue-600 to-blue-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <MdLocalPolice className="w-12 h-12 opacity-80" />
            <div>
              <div className="font-bold text-lg">File a Police Complaint</div>
              <div className="text-blue-100 text-sm">Register complaint — routed to nearest police station based on your location</div>
            </div>
          </div>
          <button onClick={() => navigate('/police-complaint')} className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition whitespace-nowrap">
            File Now →
          </button>
        </div>
      </div>
    </div>
  );
}
