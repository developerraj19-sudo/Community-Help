import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { getNearbyProviders, createRequest } from '../api/api';
import toast from 'react-hot-toast';
import { FiStar, FiMapPin, FiClock, FiTool, FiSearch, FiCalendar, FiChevronDown } from 'react-icons/fi';

import { MdPlumbing, MdElectricBolt, MdCarpenter, MdAcUnit, MdHomeRepairService, MdWaterDrop, MdCleaningServices, MdHouse, MdRestaurantMenu, MdElderly, MdHealing, MdSchool } from 'react-icons/md';

const CATEGORIES = [
  { id: 'plumber', label: 'Plumber', icon: MdPlumbing },
  { id: 'electrician', label: 'Electrician', icon: MdElectricBolt },
  { id: 'carpenter', label: 'Carpenter', icon: MdCarpenter },
  { id: 'ac_repair', label: 'AC Repair', icon: MdAcUnit },
  { id: 'appliance_repair', label: 'Appliance Repair', icon: MdHomeRepairService },
  { id: 'water_tanker', label: 'Water Tanker', icon: MdWaterDrop },
  { id: 'cleaning', label: 'Cleaning', icon: MdCleaningServices },
  { id: 'maid', label: 'House Maid', icon: MdHouse },
  { id: 'cook', label: 'Cook', icon: MdRestaurantMenu },
  { id: 'caretaker', label: 'Caretaker', icon: MdElderly },
  { id: 'physiotherapy', label: 'Physiotherapy', icon: MdHealing },
  { id: 'tutor', label: 'Tutor', icon: MdSchool },
];

function ProviderCard({ provider, onRequest }) {
  const [requesting, setRequesting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedService, setSelectedService] = useState(
    provider.offeredServices?.[0] || provider.serviceCategory
  );
  const stars = Math.round(provider.rating || 0);

  const handleConfirm = async () => {
    setShowConfirm(false);
    setRequesting(true);
    try {
      await onRequest(provider._id, selectedService);
      toast.success('Service request sent!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send request'); }
    finally { setRequesting(false); }
  };

  // Modal is rendered down in the component tree

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0">
          {provider.user?.name?.[0] || 'P'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{provider.user?.name || 'Provider'}</span>
                {(provider.serviceCategory === 'company' || provider.serviceCategory === 'organization') && (
                  <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Agency</span>
                )}
              </div>
              <div className="text-sm text-gray-500 capitalize">{provider.serviceCategory?.replace('_', ' ')}</div>
            </div>
            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
              <FiStar className="text-yellow-500 w-3.5 h-3.5 fill-yellow-500" />
              <span className="text-xs font-bold text-gray-700">{provider.rating?.toFixed(1) || 'New'}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1 whitespace-nowrap"><FiClock className="flex-shrink-0" /> {provider.experience || 0} yrs exp</span>
            <span className="flex items-center gap-1 whitespace-nowrap"><FiTool className="flex-shrink-0" /> {provider.totalJobs || 0} jobs</span>
            {provider.hourlyRate > 0 && <span className="whitespace-nowrap">₹{provider.hourlyRate}/hr</span>}
          </div>
          {provider.about && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{provider.about}</p>}
          {provider.offeredServices?.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-2">
              {provider.offeredServices.map(s => {
                const catInfo = CATEGORIES.find(c => c.id === s);
                return (
                  <span key={s} className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-md">
                    {catInfo?.label || s}
                  </span>
                );
              })}
            </div>
          ) : provider.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {provider.skills.slice(0, 3).map(s => (
                <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-50">
        <span className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${provider.isAvailable ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
          {provider.isAvailable ? '● Available' : '○ Busy'}
        </span>
        <button onClick={() => setShowConfirm(true)} disabled={requesting || !provider.isAvailable}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition whitespace-nowrap">
          {requesting ? 'Sending...' : 'Request Service'}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in fade-in zoom-in duration-200">
            <h3 className="font-black text-xl text-gray-900 mb-2">Confirm Booking</h3>
            <p className="text-gray-600 text-sm mb-4">
              You are about to request services from <strong>{provider.user?.name || 'this provider'}</strong>.
            </p>
            
            {(provider.serviceCategory === 'company' || provider.serviceCategory === 'organization') && provider.offeredServices?.length > 0 ? (
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Which service do you need?</label>
                <select 
                  value={selectedService}
                  onChange={e => setSelectedService(e.target.value)}
                  className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize font-medium text-gray-900 cursor-pointer"
                >
                  {provider.offeredServices.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-gray-600 text-sm mb-6">
                Service Required: <strong className="text-gray-900 capitalize">{provider.serviceCategory?.replace('_', ' ')}</strong>
                <br /><br />
                Are you sure you want to proceed?
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition">Cancel</button>
              <button onClick={handleConfirm} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/30">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Remove DEMO_PROVIDERS since we're using original backend data
export default function UtilityServicesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const preCategory = location.state?.category;
  const [activeCategory, setActiveCategory] = useState(preCategory || '');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: 12.9141, lng: 74.8560 })
    );
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [activeCategory, coords]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const params = { category: activeCategory };
      if (coords) { params.lat = coords.lat; params.lng = coords.lng; }
      const { data } = await getNearbyProviders(params);
      setProviders(data.providers || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch providers');
      setProviders([]);
    } finally { setLoading(false); }
  };

  const handleRequest = async (providerId, serviceCategory) => {
    try {
      setLoading(true);
      const { data } = await createRequest({ providerId, serviceCategory, description, scheduledAt, lat: coords?.lat, lng: coords?.lng });
      toast.success(scheduledAt ? 'Service scheduled successfully!' : 'Service requested successfully!');
      navigate(`/history`); // Navigate to history to see the request
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request service');
    } finally {
      setLoading(false);
    }
  };

  const cat = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900">Utility Services</h1>
          <p className="text-gray-500 mt-1">Find verified service providers near you</p>
        </div>

        {/* Mobile Category Toggle */}
        <button 
          onClick={() => setShowCategories(!showCategories)}
          className="md:hidden w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 mb-4 font-bold text-gray-700 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <FiTool className="text-blue-500" />
            <span>{activeCategory ? `Category: ${CATEGORIES.find(c => c.id === activeCategory)?.label}` : 'Select Category'}</span>
          </div>
          <FiChevronDown className={`text-gray-500 transition-transform ${showCategories ? 'rotate-180' : ''}`} />
        </button>

        {/* Category Grid */}
        <div className={`${showCategories ? 'grid' : 'hidden'} md:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8`}>
          {CATEGORIES.map(cat => {
            const isSelected = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setShowCategories(false); }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200 hover:bg-blue-50'}`}>
                <Icon className={`w-8 h-8 mb-2 flex-shrink-0 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
                <span className="text-xs font-bold text-center break-words w-full px-1">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Schedule */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-11 h-12" placeholder="Describe your requirement..."
              value={description} onChange={e => setDescription(e.target.value)} disabled={loading} />
          </div>
          <div className="relative w-full md:w-auto min-w-[260px] group">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 z-10 w-5 h-5 group-hover:text-blue-600 transition-colors" />
            <input 
              type="datetime-local" 
              className="input-field pl-12 pr-4 h-12 w-full text-sm font-bold text-gray-700 bg-white border-gray-200 hover:border-blue-300 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-sm relative z-0" 
              value={scheduledAt} 
              onChange={e => setScheduledAt(e.target.value)} 
              disabled={loading}
            />
            {/* Custom Overlay to mask native empty state 'dd-mm-yyyy' */}
            {!scheduledAt && (
              <div className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none bg-white right-12 flex items-center h-8 z-10">
                Schedule (Optional)
              </div>
            )}
          </div>
          <button onClick={() => {
            if (!activeCategory) return toast.error('Please select a category first');
            handleRequest(null, activeCategory);
          }} disabled={loading} className="btn-blue h-12 whitespace-nowrap flex items-center gap-2">
            <FiTool /> {loading ? 'Processing...' : scheduledAt ? 'Schedule Nearest' : 'Request Nearest'}
          </button>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            {cat ? <><cat.icon className="w-5 h-5 text-blue-500" /> {cat.label} Providers</> : 'All Nearby Providers'}
            <span className="ml-2 text-sm text-gray-400 font-normal">({providers.length} found)</span>
          </h2>
          <button onClick={fetchProviders} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3].map(i => <div key={i} className="card animate-pulse"><div className="h-32 bg-gray-100 rounded-xl" /></div>)}
          </div>
        ) : providers.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <FiTool className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No providers found {cat ? `for ${cat.label}` : ''} in your area</p>
            <p className="text-sm mt-1">Try expanding your search radius</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map(p => <ProviderCard key={p._id} provider={p} onRequest={handleRequest} />)}
          </div>
        )}
      </div>
    </div>
  );
}
