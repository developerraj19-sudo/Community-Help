import React, { useState, useEffect } from 'react';
import Navbar from '../components/shared/Navbar';
import { useAuth } from '../context/AuthContext';
import { getProviderMe, getProviderRequests, updateRequestStatus, toggleAvailability } from '../api/api';
import toast from 'react-hot-toast';
import { FiToggleLeft, FiToggleRight, FiStar, FiTool, FiClock, FiCheck, FiX } from 'react-icons/fi';

const STATUS_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  accepted: 'bg-blue-50 text-blue-700 border-blue-200',
  'in-progress': 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  rejected: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [provider, setProvider] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    Promise.all([getProviderMe(), getProviderRequests()])
      .then(([p, r]) => { setProvider(p.data.provider); setRequests(r.data.requests); })
      .catch(err => { if (err.response?.status !== 404) toast.error('Failed to load data'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        const gtSelect = document.querySelector('.goog-te-combo');
        if (gtSelect && document.cookie.includes('googtrans=')) {
          gtSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 100);
    }
  }, [loading]);

  const handleToggleAvailability = async () => {
    setTogglingAvail(true);
    try {
      const newVal = !provider.isAvailable;
      await toggleAvailability({ isAvailable: newVal });
      setProvider(p => ({ ...p, isAvailable: newVal }));
      toast.success(newVal ? 'You are now available' : 'You are now offline');
    } catch { toast.error('Failed to update availability'); }
    finally { setTogglingAvail(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const { data } = await updateRequestStatus(id, { status });
      setRequests(r => r.map(req => req._id === id ? data.request : req));
      toast.success(`Request ${status}`);
    } catch { toast.error('Failed to update'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const filteredRequests = requests.filter(r => activeFilter === 'all' || r.serviceCategory === activeFilter);
  const pending = filteredRequests.filter(r => r.status === 'pending');
  const active = filteredRequests.filter(r => ['accepted', 'in-progress'].includes(r.status));
  const completed = filteredRequests.filter(r => r.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Provider Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your service requests</p>
          </div>
          {provider && (
            <button onClick={handleToggleAvailability} disabled={togglingAvail}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-semibold transition ${provider.isAvailable ? 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'}`}>
              {provider.isAvailable ? <FiToggleRight className="w-6 h-6 text-green-500" /> : <FiToggleLeft className="w-6 h-6" />}
              {provider.isAvailable ? 'Available' : 'Offline'}
            </button>
          )}
        </div>

        {/* Provider Profile Card */}
        {provider && (
          <div className="card mb-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black">
                {user?.name?.[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-black text-xl">{user?.name}</div>
                  {(provider.serviceCategory === 'company' || provider.serviceCategory === 'organization') && (
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Agency</span>
                  )}
                </div>
                <div className="text-blue-100 capitalize">{provider.serviceCategory?.replace('_', ' ')} · {provider.experience} yrs exp</div>
                <div className="flex flex-wrap items-center gap-4 mt-1 text-sm">
                  <span className="flex items-center gap-1 whitespace-nowrap"><FiStar className="fill-yellow-300 text-yellow-300 flex-shrink-0" /> {provider.rating?.toFixed(1) || 'New'}</span>
                  <span className="flex items-center gap-1 whitespace-nowrap"><FiTool className="flex-shrink-0" /> {provider.totalJobs || 0} jobs</span>
                </div>
              </div>
              {!provider.isApproved && (
                <button 
                  onClick={() => toast.success('Your verification request has been sent to the admin and is under review.')}
                  className="bg-yellow-400 hover:bg-yellow-500 transition-colors text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Pending Approval
                </button>
              )}
            </div>
          </div>
        )}

        {/* Offered Services Filter */}
        {provider?.offeredServices?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Filter by Service</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
              >
                All Services
              </button>
              {provider.offeredServices.map(s => (
                <button
                  key={s}
                  onClick={() => setActiveFilter(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeFilter === s ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pending', count: pending.length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Active', count: active.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Completed', count: completed.length, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`card ${bg} border-0`}>
              <div className={`text-3xl font-black ${color}`}>{count}</div>
              <div className="text-gray-600 text-sm font-medium">{label} Requests</div>
            </div>
          ))}
        </div>

        {/* Pending Requests */}
        {pending.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <FiClock className="text-yellow-500" /> New Requests
            </h2>
            <div className="space-y-4">
              {pending.map(req => (
                <div key={req._id} className="card border-2 border-yellow-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-gray-900 capitalize">{req.serviceCategory?.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-500">From: {req.user?.name} · {req.user?.phone}</div>
                      {req.description && <p className="text-sm text-gray-600 mt-1">{req.description}</p>}
                    </div>
                    <span className="text-xs flex flex-col items-end text-right">
                      {req.scheduledAt ? (
                        <>
                          <span className="text-purple-600 font-bold bg-purple-50 border border-purple-100 px-2 py-1 rounded-md mb-1 whitespace-nowrap">
                            🗓️ Scheduled:<br />{new Date(req.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <span className="text-gray-400">Req: {new Date(req.createdAt).toLocaleDateString()}</span>
                        </>
                      ) : (
                        <span className="text-gray-500">{new Date(req.createdAt).toLocaleString()}</span>
                      )}
                    </span>
                  </div>
                  {req.location?.address && (
                    <div className="text-sm text-gray-500 flex items-center gap-1 mb-3">📍 {req.location.address}</div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => handleUpdateStatus(req._id, 'accepted')}
                      className="flex-1 py-2.5 px-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition whitespace-nowrap">
                      <FiCheck className="flex-shrink-0" /> Accept
                    </button>
                    <button onClick={() => handleUpdateStatus(req._id, 'rejected')}
                      className="flex-1 py-2.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition whitespace-nowrap">
                      <FiX className="flex-shrink-0" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Jobs */}
        {active.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 text-lg mb-4">🔨 Active Jobs</h2>
            <div className="space-y-3">
              {active.map(req => (
                <div key={req._id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900 capitalize">{req.serviceCategory?.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-500">{req.user?.name} · {req.user?.phone}</div>
                      {req.scheduledAt && (
                        <div className="text-xs text-purple-600 font-bold mt-1.5 bg-purple-50 border border-purple-100 inline-block px-2 py-1 rounded-md">
                          🗓️ Scheduled: {new Date(req.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[req.status]}`}>{req.status.replace('-', ' ')}</span>
                      {req.status === 'accepted' && (
                        <button onClick={() => handleUpdateStatus(req._id, 'in-progress')} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition">
                          Start Job
                        </button>
                      )}
                      {req.status === 'in-progress' && (
                        <button onClick={() => handleUpdateStatus(req._id, 'completed')} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition">
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {requests.length === 0 && !loading && (
          <div className="card text-center py-16 text-gray-400">
            <FiTool className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No service requests yet</p>
            <p className="text-sm mt-1">Make sure you are available to receive requests</p>
          </div>
        )}
      </div>
    </div>
  );
}
