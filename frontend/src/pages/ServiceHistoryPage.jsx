import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { useAuth } from '../context/AuthContext';
import { getMyRequests, getProviderRequests, getMyEmergencies, rateRequest } from '../api/api';
import toast from 'react-hot-toast';
import { FiStar, FiClock, FiTool } from 'react-icons/fi';
import { MdLocalHospital, MdLocalPolice, MdFireTruck } from 'react-icons/md';

const STATUS_STYLE = { pending:'bg-yellow-50 text-yellow-700', active:'bg-yellow-50 text-yellow-700', accepted:'bg-blue-50 text-blue-700', 'in-progress':'bg-purple-50 text-purple-700', dispatched:'bg-purple-50 text-purple-700', completed:'bg-green-50 text-green-700', resolved:'bg-green-50 text-green-700', cancelled:'bg-red-50 text-red-700', rejected:'bg-gray-50 text-gray-600' };

function RatingModal({ request, onClose, onRate }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try { await onRate(request._id, { rating, review }); onClose(); toast.success('Rating submitted!'); }
    catch { toast.error('Failed to submit rating'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Rate this Service</h3>
        <div className="flex gap-2 mb-4">
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => setRating(s)}>
              <FiStar className={`w-8 h-8 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
            </button>
          ))}
        </div>
        <textarea value={review} onChange={e => setReview(e.target.value)} rows={3}
          className="input-field mb-4" placeholder="Write a review (optional)..." />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={submit} disabled={loading} className="flex-1 btn-primary">{loading ? 'Submitting...' : 'Submit'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ServiceHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user?.role === 'provider') {
      getProviderRequests().then(r => setRequests(r.data.requests)).catch(console.error).finally(() => setLoading(false));
    } else {
      Promise.all([getMyRequests(), getMyEmergencies()])
        .then(([r, e]) => {
          const all = [...r.data.requests, ...e.data.emergencies].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
          setRequests(all);
        })
        .catch(console.error).finally(() => setLoading(false));
    }
  }, [user]);

  const handleRate = async (id, data) => {
    await rateRequest(id, data);
    setRequests(r => r.map(req => req._id === id ? { ...req, rating: data.rating, review: data.review } : req));
    setRatingTarget(null);
  };

  const filtered = filter === 'all' 
    ? requests 
    : requests.filter(r => {
        if (filter === 'completed') return r.status === 'completed' || r.status === 'resolved';
        if (filter === 'in-progress') return r.status === 'in-progress' || r.status === 'dispatched';
        if (filter === 'pending') return r.status === 'pending' || r.status === 'active';
        return r.status === filter;
      });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {ratingTarget && <RatingModal request={ratingTarget} onClose={() => setRatingTarget(null)} onRate={handleRate} />}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900">{user?.role === 'provider' ? 'Job History' : 'Service History'}</h1>
          <p className="text-gray-500 mt-1">{requests.length} total records</p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {['all','pending','accepted','in-progress','completed','cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${filter===f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="card animate-pulse h-24" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <FiClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No service requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(req => (
              <div key={req._id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${req.type ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'} rounded-xl flex items-center justify-center`}>
                      {req.type ? (
                        req.type === 'ambulance' ? <MdLocalHospital size={20} /> :
                        req.type === 'police' ? <MdLocalPolice size={20} /> :
                        <MdFireTruck size={20} />
                      ) : <FiTool size={20} />}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 capitalize">{req.serviceCategory?.replace('_', ' ') || `${req.type} Emergency`}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {req.scheduledAt ? (
                          <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap">🗓️ Scheduled: {new Date(req.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        ) : (
                          <span className="font-medium text-gray-400 flex items-center gap-1"><FiClock className="w-3 h-3"/> {new Date(req.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${req.status === 'dispatched' && req.etaMinutes && (Date.now() - new Date(req.createdAt).getTime()) / 1000 >= req.etaMinutes * 60 ? 'bg-green-50 text-green-600' : STATUS_STYLE[req.status]}`}>
                    {req.status === 'dispatched' && req.etaMinutes && (Date.now() - new Date(req.createdAt).getTime()) / 1000 >= req.etaMinutes * 60 ? 'arrived' : req.status}
                  </span>
                </div>

                {req.description && <p className="text-sm text-gray-600 mb-3">{req.description}</p>}

                <div className="flex flex-col sm:flex-row sm:items-end justify-between pt-3 border-t border-gray-50 gap-3">
                  <div className="text-sm text-gray-600 space-y-1">
                    {req.type ? (
                      <div><span className="font-semibold text-gray-700">Station:</span> {req.assignedStation || 'Pending'}</div>
                    ) : user?.role === 'provider' ? (
                      <>
                        <div><span className="font-semibold text-gray-700">User:</span> {req.user?.name || 'User'} {req.user?.phone && <span className="ml-1 text-gray-500">· 📞 {req.user.phone}</span>}</div>
                        {req.location?.address && <div><span className="font-semibold text-gray-700">📍 Place:</span> {req.location.address}</div>}
                      </>
                    ) : (
                      <>
                        <div><span className="font-semibold text-gray-700">Provider:</span> {req.provider?.user?.name || 'Provider not assigned'} {req.provider?.user?.phone && <span className="ml-1 text-gray-500">· 📞 {req.provider.user.phone}</span>}</div>
                        {req.location?.address && <div><span className="font-semibold text-gray-700">📍 Place:</span> {req.location.address}</div>}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {req.amount > 0 && <span className="font-semibold text-gray-700">₹{req.amount}</span>}
                    {req.type && req.status === 'dispatched' ? (
                      <button onClick={() => navigate(`/track/${req._id}`)} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-100 transition">
                        Track Live →
                      </button>
                    ) : req.rating ? (
                      <div className="flex items-center gap-1">
                        <FiStar className="fill-yellow-400 text-yellow-400 w-4 h-4" />
                        <span className="text-sm font-medium">{req.rating}</span>
                      </div>
                    ) : !req.type && (req.status === 'completed' || req.status === 'resolved') && user?.role === 'user' ? (
                      <button onClick={() => setRatingTarget(req)} className="px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl text-xs font-semibold hover:bg-yellow-100 transition">
                        <FiStar /> Rate
                      </button>
                    ) : null}
                  </div>
                </div>

                {req.review && <div className="mt-2 text-xs text-gray-500 italic">"{req.review}"</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
