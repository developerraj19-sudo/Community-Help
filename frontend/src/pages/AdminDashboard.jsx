import React, { useState, useEffect } from 'react';
import Navbar from '../components/shared/Navbar';
import { getAdminStats, getPendingProviders, approveProvider, rejectProvider, toggleUser, getAllComplaints, updateComplaintStatus, getAllRequests, updateRequestStatus, getAdminAnalytics } from '../api/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import toast from 'react-hot-toast';
import { FiUsers, FiTool, FiAlertCircle, FiFileText, FiCheck, FiX, FiActivity, FiList } from 'react-icons/fi';
import { MdLocalPolice, MdPlumbing, MdElectricBolt, MdCarpenter, MdAcUnit } from 'react-icons/md';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [requests, setRequests] = useState([]);
  const [expandedComplaint, setExpandedComplaint] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    Promise.all([getAdminStats(), getPendingProviders(), getAllComplaints(), getAllRequests(), getAdminAnalytics()])
      .then(([s, p, c, r, a]) => {
        setStats(s.data.stats);
        setPending(p.data.providers);
        setComplaints(c.data.complaints);
        setRequests(r.data.requests);
        setAnalyticsData(a.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveProvider(id);
      setPending(p => p.filter(pr => pr._id !== id));
      toast.success('Provider approved!');
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to completely reject and delete this application?')) return;
    try {
      await rejectProvider(id);
      setPending(p => p.filter(pr => pr._id !== id));
      toast.success('Provider application deleted.');
    } catch { toast.error('Failed to reject'); }
  };

  const handleUpdateComplaint = async (id, status) => {
    try {
      await updateComplaintStatus(id, { status });
      setComplaints(c => c.map(comp => comp._id === id ? { ...comp, status } : comp));
      toast.success('Complaint status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const handleUpdateRequest = async (id, status) => {
    try {
      await updateRequestStatus(id, { status });
      setRequests(r => r.map(req => req._id === id ? { ...req, status } : req));
      toast.success('Request status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const STATUS_STYLE = { submitted:'bg-yellow-50 text-yellow-700', under_review:'bg-blue-50 text-blue-700', investigating:'bg-purple-50 text-purple-700', resolved:'bg-green-50 text-green-700', closed:'bg-gray-50 text-gray-600', processed:'bg-green-50 text-green-700 border-green-200' };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" /></div>;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: FiActivity },
    { id: 'analytics', label: 'Advanced Analytics', icon: FiActivity },
    { id: 'providers', label: `Pending Providers (${pending.length})`, icon: FiTool },
    { id: 'requests', label: `Service Requests (${requests.length})`, icon: FiActivity },
    { id: 'complaints', label: `Police Complaints (${complaints.length})`, icon: MdLocalPolice },
  ];

  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gray-50 notranslate relative">
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedEvidence(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
            <button onClick={() => setSelectedEvidence(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300 transition">
              <FiX className="w-8 h-8" />
            </button>
            <img src={selectedEvidence} alt="Evidence" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain bg-gray-900" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor and manage the Community Help platform</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: FiUsers, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Providers', value: stats.totalProviders, icon: FiTool, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Service Requests', value: stats.totalRequests, icon: FiActivity, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Active Emergencies', value: stats.activeEmergencies, icon: FiAlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Complaints', value: stats.totalComplaints, icon: FiFileText, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`card ${bg} border-0`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className={`text-3xl font-black ${color}`}>{value}</div>
                <div className="text-gray-600 text-xs font-medium mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition whitespace-nowrap ${tab===id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Platform Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="font-semibold text-green-800">✅ System Online</div>
                <div className="text-sm text-green-600 mt-1">All services operational</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="font-semibold text-blue-800">🔒 Security Active</div>
                <div className="text-sm text-blue-600 mt-1">JWT authentication enabled</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <div className="font-semibold text-purple-800">📍 Location Services</div>
                <div className="text-sm text-purple-600 mt-1">Geo-routing active</div>
              </div>
            </div>
            {pending.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="font-semibold text-yellow-800">⚠️ {pending.length} provider(s) awaiting approval</div>
                <button onClick={() => setTab('providers')} className="text-sm text-yellow-700 underline mt-1">Review now →</button>
              </div>
            )}
          </div>
        )}

        {tab === 'analytics' && analyticsData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Emergency Types Pie Chart */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6">
                <h3 className="font-extrabold text-gray-800 text-lg mb-6 flex items-center gap-2">
                  <span className="w-2 h-6 rounded-full bg-red-500 block"></span>
                  Emergency Distribution
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
                        </filter>
                      </defs>
                      <Pie 
                        data={analyticsData.emergencies} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={75} 
                        outerRadius={105} 
                        paddingAngle={8} 
                        dataKey="value"
                        stroke="none"
                        style={{ filter: 'url(#shadow)' }}
                      >
                        {analyticsData.emergencies.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontWeight: 'bold' }} 
                        itemStyle={{ color: '#1e293b' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Provider Categories Bar Chart */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6">
                <h3 className="font-extrabold text-gray-800 text-lg mb-6 flex items-center gap-2">
                  <span className="w-2 h-6 rounded-full bg-blue-500 block"></span>
                  Workforce Saturation
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.providers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                      <RechartsTooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} 
                      />
                      <Bar 
                        dataKey="value" 
                        fill="url(#barGradient)" 
                        radius={[6, 6, 6, 6]} 
                        barSize={24}
                        background={{ fill: '#f1f5f9', radius: [6, 6, 6, 6] }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue Timeline Area Chart */}
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 lg:col-span-2">
                <h3 className="font-extrabold text-gray-800 text-lg mb-6 flex items-center gap-2">
                  <span className="w-2 h-6 rounded-full bg-emerald-500 block"></span>
                  Financial & Volume Trajectory (7 Days)
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dx={10} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} 
                      />
                      <Legend verticalAlign="top" height={40} iconType="circle" />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" name="Gross Revenue (₹)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                      <Area yAxisId="right" type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorVolume)" name="Request Volume" activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'providers' && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <FiCheck className="w-12 h-12 mx-auto mb-3 text-green-300" />
                <p>All providers have been reviewed</p>
              </div>
            ) : pending.map(p => (
              <div key={p._id} className="card">
                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center font-black text-blue-600 text-lg">
                      {p.user?.name?.[0]}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{p.user?.name}</div>
                      <div className="text-sm text-gray-500">{p.user?.email} · {p.user?.phone}</div>
                      <div className="text-sm text-blue-600 capitalize mt-0.5">{p.serviceCategory?.replace('_',' ')} · {p.experience} yrs exp</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.idProofUrl && (
                      <a href={p.idProofUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition">
                        <FiFileText /> View ID
                      </a>
                    )}
                    <button onClick={() => handleApprove(p._id)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition">
                      <FiCheck /> Approve
                    </button>
                    <button onClick={() => handleReject(p._id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-semibold transition">
                      <FiX /> Reject
                    </button>
                  </div>
                </div>
                {p.about && <p className="text-sm text-gray-600 mt-3 pl-16">{p.about}</p>}
                {p.skills?.length > 0 && (
                  <div className="flex gap-2 mt-2 pl-16 flex-wrap">
                    {p.skills.map(s => <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <FiActivity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No service requests on the platform</p>
              </div>
            ) : requests.map(req => (
              <div key={req._id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-gray-900 capitalize">{req.serviceCategory?.replace('_',' ')}</div>
                    <div className="text-xs text-gray-400">Req by: {req.user?.name} · {new Date(req.createdAt).toLocaleString()}</div>
                    {req.scheduledAt && (
                      <div className="text-xs text-purple-600 font-bold mt-1 bg-purple-50 inline-block px-2 py-0.5 rounded border border-purple-100">
                        🗓️ Scheduled: {new Date(req.scheduledAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_STYLE[req.status] || 'bg-gray-100 text-gray-700'}`}>
                    {req.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium text-gray-800">Assigned Provider:</span> {req.provider ? req.provider.user?.name : <span className="text-yellow-600 italic">Pending Assignment</span>}
                </div>
                {req.description && <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg italic">"{req.description}"</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'complaints' && (
          <div className="space-y-4">
            {complaints.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <MdLocalPolice className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No complaints filed yet</p>
              </div>
            ) : complaints.map(c => (
              <div 
                key={c._id} 
                className={`card cursor-pointer transition-all border-2 ${expandedComplaint === c._id ? 'border-blue-400 shadow-md bg-blue-50/10' : 'border-transparent hover:border-blue-100'}`}
                onClick={() => setExpandedComplaint(expandedComplaint === c._id ? null : c._id)}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-bold text-gray-900">{c.title}</div>
                    <div className="text-xs text-gray-400">
                      #{c.complaintNumber} &middot; {c.user?.name || 'Unknown User'} &middot; {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {c.status === 'processed' ? (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                      ✅ Processed & Forwarded
                    </span>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateComplaint(c._id, 'processed');
                      }}
                      className="text-xs font-bold px-4 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
                    >
                      Process & Forward to Police →
                    </button>
                  )}
                </div>
                <p className={`text-sm text-gray-700 ${expandedComplaint === c._id ? '' : 'line-clamp-2'}`}>
                  {c.description}
                </p>
                
                {expandedComplaint === c._id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div><span className="font-semibold text-gray-800">Phone:</span> {c.user?.phone || 'Not provided'}</div>
                    <div><span className="font-semibold text-gray-800">Incident Date:</span> {new Date(c.incidentDate).toLocaleString()}</div>
                    <div className="md:col-span-2"><span className="font-semibold text-gray-800">Location Address:</span> {c.incidentLocation?.address || 'Not specified'}</div>
                  </div>
                )}

                {c.evidence && c.evidence.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto">
                    {c.evidence.map((url, idx) => (
                      <button 
                        key={idx} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvidence(url);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition whitespace-nowrap border border-blue-100"
                      >
                        <FiFileText /> View Evidence {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-4 text-xs text-gray-500 mt-4">
                  <span className="capitalize flex items-center gap-1"><FiList /> {c.category?.replace('_',' ')}</span>
                  {c.nearestPoliceStation && <span className="flex items-center gap-1"><MdLocalPolice /> {c.nearestPoliceStation}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
