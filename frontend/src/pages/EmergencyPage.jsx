import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { triggerSOS, getMyEmergencies, resolveEmergency } from '../api/api';
import toast from 'react-hot-toast';
import { MdLocalHospital, MdLocalPolice, MdFireTruck } from 'react-icons/md';
import { FiMapPin, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const EMERGENCY_TYPES = [
  {
    type: 'ambulance', label: 'Ambulance', icon: MdLocalHospital, color: 'red',
    bg: 'bg-red-600 hover:bg-red-700', light: 'bg-red-50 border-red-200',
    desc: 'Medical emergency — dispatches nearest hospital ambulance',
    tips: ['Keep patient calm and still', 'Ensure airway is clear', 'Apply pressure to wounds', 'Do not move if spine injury suspected'],
  },
  {
    type: 'police', label: 'Police', icon: MdLocalPolice, color: 'blue',
    bg: 'bg-blue-600 hover:bg-blue-700', light: 'bg-blue-50 border-blue-200',
    desc: 'Crime, danger, or law enforcement needed',
    tips: ['Move to a safe location if possible', 'Note suspect details', 'Do not confront suspects', 'Preserve any evidence'],
  },
  {
    type: 'fire', label: 'Fire Brigade', icon: MdFireTruck, color: 'orange',
    bg: 'bg-orange-500 hover:bg-orange-600', light: 'bg-orange-50 border-orange-200',
    desc: 'Fire, gas leak, or rescue operation needed',
    tips: ['Evacuate immediately — do not use lifts', 'Stay low under smoke', 'Close doors to slow fire spread', 'Meet at assembly point'],
  },
];

export default function EmergencyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = location.state?.type;
  const [selected, setSelected] = useState(preselected || null);
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState('Detecting location...');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispatched, setDispatched] = useState(null);
  const [past, setPast] = useState([]);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setAddress('Location detected ✓'); },
      () => { setCoords({ lat: 12.9141, lng: 74.8560 }); setAddress('Mangaluru, Karnataka (default)'); }
    );
    getMyEmergencies().then(r => setPast(r.data.emergencies)).catch(console.error);
  }, []);

  const handleSOS = async () => {
    if (!selected) { toast.error('Select an emergency type first'); return; }
    
    if (alreadyActive) {
      toast.error(`You already have an active ${selected.toUpperCase()} emergency!`);
      navigate(`/track/${alreadyActive._id}`);
      return;
    }

    if (!coords) { toast.error('Location not available'); return; }
    setLoading(true);
    // 3-second countdown
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return null; }
        return prev - 1;
      });
    }, 1000);
    await new Promise(r => setTimeout(r, 3000));
    try {
      const { data } = await triggerSOS({ type: selected, lat: coords.lat, lng: coords.lng, address, description });
      setDispatched(data);
      setPast(prev => [data.emergency, ...prev]); // Realtime update
      toast.success(data.message, { duration: 6000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'SOS failed');
    } finally { setLoading(false); setCountdown(null); }
  };

  const handleResolve = async (id) => {
    try {
      await resolveEmergency(id);
      setDispatched(null);
      setPast(p => p.map(e => e._id === id ? { ...e, status: 'resolved' } : e));
      toast.success('Emergency marked as resolved');
    } catch (err) { toast.error('Failed to resolve'); }
  };

  const selectedType = EMERGENCY_TYPES.find(t => t.type === selected);
  const alreadyActive = past.find(e => e.type === selected && e.status !== 'resolved' && e.status !== 'cancelled');
  const statusColors = { active:'text-red-600 bg-red-50',dispatched:'text-orange-600 bg-orange-50',resolved:'text-green-600 bg-green-50',cancelled:'text-gray-600 bg-gray-50' };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <FiAlertCircle className="text-red-500" /> Emergency Services
          </h1>
          <p className="text-gray-500 mt-1">Select the type of emergency and press SOS to dispatch help immediately</p>
        </div>

        {/* Dispatched Result */}
        {dispatched && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <FiCheckCircle className="text-green-600 w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-green-800 text-lg">Help is on the way!</div>
                <div className="text-green-600 text-sm">{dispatched.message}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white rounded-xl p-3 border border-green-100">
                <div className="text-xs text-gray-500">Nearest Unit</div>
                <div className="font-semibold text-gray-800">{dispatched.nearestUnit}</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-green-100">
                <div className="text-xs text-gray-500">ETA</div>
                <div className="font-semibold text-gray-800">{dispatched.emergency?.etaMinutes} minutes</div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => navigate(`/track/${dispatched.emergency._id}`)} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">
                Track Live →
              </button>
              <button onClick={() => handleResolve(dispatched.emergency._id)} className="flex-1 py-2.5 bg-white border border-green-200 text-green-700 rounded-xl font-medium hover:bg-green-50 transition">
                Mark Resolved
              </button>
            </div>
          </div>
        )}

        {/* Emergency Type Selection */}
        <div className="card mb-6">
          <h2 className="font-bold text-gray-900 mb-4">1. Select Emergency Type</h2>
          <div className="grid grid-cols-3 gap-4">
            {EMERGENCY_TYPES.map(({ type, label, icon: Icon, bg, light }) => (
              <button key={type} onClick={() => setSelected(type)}
                className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${selected === type ? `${light} border-current shadow-lg scale-105` : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                <div className={`w-14 h-14 rounded-2xl ${selected === type ? bg : 'bg-gray-100'} flex items-center justify-center transition-all`}>
                  <Icon className={`w-8 h-8 ${selected === type ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <span className={`font-bold text-sm ${selected === type ? '' : 'text-gray-700'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedType && (
          <div className={`card border-2 ${selectedType.light} mb-6`}>
            <h3 className="font-bold text-gray-800 mb-3">⚠️ First Aid Tips — {selectedType.label}</h3>
            <ul className="space-y-2">
              {selectedType.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 mt-0.5">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Location + Description */}
        <div className="card mb-6">
          <h2 className="font-bold text-gray-900 mb-4">2. Your Location</h2>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-4">
            <FiMapPin className="text-red-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{address}</span>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="input-field text-sm" placeholder="Additional details (optional) — describe the situation..." />
        </div>

        {/* SOS Button */}
        <div className="flex flex-col items-center gap-4">
          {alreadyActive ? (
            <button disabled className="w-40 h-40 rounded-full font-black text-gray-500 bg-gray-200 text-xl transition-all shadow-md cursor-not-allowed flex flex-col items-center justify-center gap-2">
              <FiAlertCircle className="w-8 h-8 opacity-50" />
              <span>BLOCKED</span>
            </button>
          ) : (
            <button onClick={handleSOS} disabled={loading || !selected || !coords}
              className={`w-40 h-40 rounded-full font-black text-white text-2xl transition-all shadow-2xl
                ${loading ? 'bg-gray-400 cursor-wait' : 'bg-red-600 hover:bg-red-700 sos-pulse active:scale-95'}
                disabled:opacity-50 disabled:cursor-not-allowed`}>
              {countdown ? countdown : loading ? '...' : 'SOS'}
            </button>
          )}

          {countdown && !alreadyActive && <p className="text-gray-500 font-medium">Sending SOS in {countdown}s... tap to cancel</p>}
          {!selected && <p className="text-gray-400 text-sm">← Select emergency type first</p>}
          {alreadyActive && <p className="text-red-500 font-medium text-sm flex items-center gap-1"><FiAlertCircle /> You already have an active {selected.toUpperCase()} emergency.</p>}
        </div>

        {/* Past Emergencies */}
        {past.length > 0 && (
          <div className="card mt-8">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><FiClock />Emergency History</h2>
            <div className="space-y-3">
              {past.map(e => (
                <div key={e._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-semibold text-gray-800 capitalize">{e.type} Emergency</div>
                    <div className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
