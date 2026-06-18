import React, { useState, useEffect } from 'react';
import Navbar from '../components/shared/Navbar';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/api';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiBriefcase, FiDollarSign, FiClock, FiShield } from 'react-icons/fi';

export default function ProfilePage() {
  const { user, provider, loginUser } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // State for user fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // State for provider fields
  const [about, setAbout] = useState('');
  const [hourlyRate, setHourlyRate] = useState(0);
  const [minimumCharge, setMinimumCharge] = useState(0);
  const [serviceRadius, setServiceRadius] = useState(10);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
    if (provider) {
      setAbout(provider.about || '');
      setHourlyRate(provider.hourlyRate || 0);
      setMinimumCharge(provider.minimumCharge || 0);
      setServiceRadius(provider.serviceRadius || 10);
    }
  }, [user, provider]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { name, email, phone, address };
      if (user?.role === 'provider') {
        payload.about = about;
        payload.hourlyRate = hourlyRate;
        payload.minimumCharge = minimumCharge;
        payload.serviceRadius = serviceRadius;
      }
      
      const { data } = await updateProfile(payload);
      
      // Update local storage via auth context
      loginUser(localStorage.getItem('token'), data.user);
      
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full shadow-lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-12 font-sans selection:bg-red-500 selection:text-white">
      <Navbar />
      
      {/* Premium Header Banner */}
      <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 pt-16 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            Profile Settings
          </h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Manage your account details, security preferences, and professional workspace.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-20">
        
        {/* Dynamic Avatar Card */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 rounded-full p-2 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <div className="w-full h-full bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center text-5xl font-black text-white uppercase shadow-inner">
              {name.charAt(0) || user.role.charAt(0)}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-white rounded-full shadow-sm border border-slate-100">
            <div className={`w-2 h-2 rounded-full ${user.role === 'provider' ? 'bg-purple-500' : 'bg-green-500'} animate-pulse`}></div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{user.role} Account</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Basic Info Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-5 sm:p-8 md:p-10 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60 group">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FiUser className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Basic Information</h2>
                <p className="text-sm text-slate-500">Your personal details and contact info.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-red-500 transition-colors">
                    <FiUser className="w-5 h-5" />
                  </div>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-700 font-medium" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-red-500 transition-colors">
                    <FiMail className="w-5 h-5" />
                  </div>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-700 font-medium" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Phone Number</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-red-500 transition-colors">
                    <FiPhone className="w-5 h-5" />
                  </div>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-700 font-medium" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Home Address</label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-red-500 transition-colors">
                    <FiMapPin className="w-5 h-5" />
                  </div>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-700 font-medium" />
                </div>
              </div>
            </div>
          </div>

          {/* Provider Settings Card */}
          {user?.role === 'provider' && (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-5 sm:p-8 md:p-10 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60 group">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <FiBriefcase className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Professional Settings</h2>
                  <p className="text-sm text-slate-500">Configure how customers see you and your rates.</p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">About / Bio</label>
                  <textarea value={about} onChange={e => setAbout(e.target.value)} rows={4} className="w-full p-5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all text-slate-700 font-medium resize-none" placeholder="Tell customers about your experience, your work ethic, and what makes you the best choice..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Hourly Rate (₹)</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-purple-600 transition-colors">
                        <FiDollarSign className="w-5 h-5" />
                      </div>
                      <input type="number" min="0" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all text-slate-700 font-medium" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Minimum Charge (₹)</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-purple-600 transition-colors">
                        <FiDollarSign className="w-5 h-5" />
                      </div>
                      <input type="number" min="0" value={minimumCharge} onChange={e => setMinimumCharge(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all text-slate-700 font-medium" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Service Radius (km)</label>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-purple-600 transition-colors">
                        <FiMapPin className="w-5 h-5" />
                      </div>
                      <input type="number" min="0" value={serviceRadius} onChange={e => setServiceRadius(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all text-slate-700 font-medium" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Area */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FiShield className="text-emerald-500" />
              <span>Your data is securely encrypted.</span>
            </div>
            
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl shadow-red-500/30 hover:shadow-red-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none disabled:transform-none"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><FiSave className="w-5 h-5" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
