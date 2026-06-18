import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sendOtp, verifyOtp } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiTool, FiPhone, FiLock } from 'react-icons/fi';

export default function RegisterPage() {
  const [role, setRole] = useState(''); // 'user' or 'provider'
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (selectedRole) => {
    if (selectedRole === 'provider') {
      navigate('/register-provider');
    } else {
      setRole('user');
      setStep(2);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password) return toast.error('Name, Phone, and Password are required');
    
    setLoading(true);
    try {
      const formattedPhone = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;
      const { data } = await sendOtp({ phone: formattedPhone });
      if (data.success) {
        toast.success('OTP sent successfully!');
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!form.otp) return toast.error('Please enter the OTP');

    setLoading(true);
    try {
      const formattedPhone = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;
      // verifyOtp handles creating the user if they don't exist
      const { data } = await verifyOtp({ phone: formattedPhone, otp: form.otp, name: form.name, password: form.password });
      loginUser(data.token, data.user);
      
      toast.success('Account created successfully!');
      navigate('/user-dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const inputCls = "w-full bg-[#1a2231] border border-gray-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-red-500 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0f18] text-white">
      <div className="w-full max-w-md z-10 space-y-6">
        
        <div className="text-center">
          <div className="w-14 h-14 bg-[#e53935] rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-4">CH</div>
          <h1 className="text-3xl font-extrabold mb-1">Create Account</h1>
          <p className="text-gray-400 text-sm">Join the Community Help platform</p>
        </div>

        <div className="bg-[#121822] rounded-3xl border border-gray-800 p-6 shadow-2xl">
          
          {/* Step 1: Select Role */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-center font-bold text-gray-300 mb-4">How would you like to join?</h2>
              
              <button onClick={() => handleRoleSelect('user')} className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-700 bg-[#1a2231] hover:border-red-500 hover:bg-[#1a2231]/80 transition-all text-left group">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <FiUser size={24} />
                </div>
                <div>
                  <div className="font-bold text-lg text-white">As a User</div>
                  <div className="text-sm text-gray-400">I want to request and hire services</div>
                </div>
              </button>

              <button onClick={() => handleRoleSelect('provider')} className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-700 bg-[#1a2231] hover:border-blue-500 hover:bg-[#1a2231]/80 transition-all text-left group">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <FiTool size={24} />
                </div>
                <div>
                  <div className="font-bold text-lg text-white">As a Provider</div>
                  <div className="text-sm text-gray-400">I want to offer my professional services</div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: User Details */}
          {step === 2 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="flex items-center gap-2 mb-4 text-red-400 font-bold text-sm cursor-pointer" onClick={() => setStep(1)}>
                ← Back
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-300 block mb-2">Full Name</label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} placeholder="Full Name" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300 block mb-2">Mobile Number</label>
                <div className="relative">
                  <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputCls} placeholder="Mobile Number" />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-300 block mb-2">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={inputCls} placeholder="Password" />
                </div>
              </div>
              
              <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#e53935] hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 3: Verify OTP */}
          {step === 3 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-4 pb-4 border-b border-gray-800">
                <p className="text-gray-400 text-sm mb-1">Enter OTP sent to your phone <strong className="text-white">{form.phone}</strong></p>
                <button type="button" onClick={() => setStep(2)} className="text-[#e53935] text-sm font-bold hover:text-red-400">Change Details</button>
              </div>
              
              <div>
                <label className="text-sm font-bold text-gray-300 block mb-2">Enter OTP sent to your phone</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input required type="text" value={form.otp} onChange={e => setForm({...form, otp: e.target.value})} maxLength={6} className={`${inputCls} tracking-widest text-center font-bold text-xl`} placeholder="000000" />
                </div>
              </div>
              
              <button type="submit" disabled={loading || form.otp.length !== 6} className="w-full py-3.5 bg-[#e53935] hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[#e53935] font-semibold hover:text-red-400 transition-colors">Sign in</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
