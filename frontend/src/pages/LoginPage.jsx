import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sendOtp, verifyOtp, login } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { FiPhone, FiLock, FiCheckCircle, FiArrowLeft, FiUser, FiTool, FiShield } from 'react-icons/fi';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('user');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) return toast.error('Please enter your mobile number');
    if (!password) return toast.error('Please enter your password');

    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const { data } = await login({ phone: formattedPhone, password });
      if (data.requiresOtp) {
        toast.success('OTP sent successfully!');
        setStep('otp');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter the OTP');

    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const { data } = await verifyOtp({ phone: formattedPhone, otp });

      // Role validation
      if (selectedRole === 'provider' && data.user.role !== 'provider') {
        setLoading(false);
        return toast.error('This number is not registered as a Provider. Please register as a Provider first.');
      }
      if (selectedRole === 'user' && data.user.role !== 'user') {
        setLoading(false);
        return toast.error('This number is registered as a Provider. Please select the Provider tab to login.');
      }

      loginUser(data.token, data.user);

      if (data.isNewUser) {
        toast.success('Welcome! Your account has been created.');
      } else {
        toast.success(`Welcome back, ${data.user.name}!`);
      }
      navigate(`/${data.user.role}-dashboard`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please enter email and password');

    setLoading(true);
    try {
      const { data } = await login({ email, password });
      loginUser(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(`/${data.user.role}-dashboard`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally { setLoading(false); }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0f18] text-white">
      {/* Background gradients for the nice aesthetic */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#e53935]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#e53935]/10 blur-[120px] rounded-full" />
      </div>

      {/* Back to Home Button */}
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors z-20 font-medium">
        <FiArrowLeft className="w-5 h-5" />
        <span className="hidden sm:inline">Back to Home</span>
      </Link>

      <div className="w-full max-w-md z-10 space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 bg-[#e53935] rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-4 shadow-lg shadow-red-500/20">
            CH
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to access community services and emergency tools.</p>
        </div>

        {/* Role Tabs */}
        {step === 'phone' && (
          <div className="bg-[#121822] rounded-2xl border border-gray-800 p-3">
            <div className="flex gap-2">
              <button
                onClick={() => handleRoleSelect('user')}
                type="button"
                className={`flex-1 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${selectedRole === 'user' ? 'bg-[#e53935]' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                User
              </button>
              <button
                onClick={() => handleRoleSelect('provider')}
                type="button"
                className={`flex-1 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${selectedRole === 'provider' ? 'bg-[#e53935]' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                Provider
              </button>
              <button
                onClick={() => handleRoleSelect('admin')}
                type="button"
                className={`flex-1 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${selectedRole === 'admin' ? 'bg-[#e53935]' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                Admin
              </button>
            </div>
          </div>
        )}


        {/* Form Container */}
        <div className="bg-[#121822] rounded-3xl border border-gray-800 p-6 shadow-2xl">
          {selectedRole === 'admin' ? (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="text-sm font-bold text-gray-300 block mb-2">Admin Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#1a2231] border border-gray-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder-gray-500"
                    placeholder="Admin Email"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-300 block mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                    <FiLock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#1a2231] border border-gray-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder-gray-500"
                    placeholder="Password"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#e53935] hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(229,57,53,0.3)] text-lg mt-2 flex justify-center items-center gap-2"
              >
                {loading ? 'Logging in...' : <><FiCheckCircle /> Admin Login</>}
              </button>
            </form>
          ) : step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="text-sm font-bold text-gray-300 block mb-2">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                    <FiPhone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-[#1a2231] border border-gray-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder-gray-500"
                    placeholder="Mobile Number"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300 block mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                    <FiLock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#1a2231] border border-gray-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder-gray-500"
                    placeholder="Password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#e53935] hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(229,57,53,0.3)] text-lg mt-2 flex justify-center items-center gap-2"
              >
                {loading ? 'Sending OTP...' : <><FiCheckCircle /> Send OTP</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-400">Enter OTP sent to your phone <span className="font-bold text-white">{phone}</span></p>
                <button type="button" onClick={() => setStep('phone')} className="text-[#e53935] text-sm font-bold hover:text-red-400 transition-colors mt-2">
                  Change Number
                </button>
              </div>

              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                    <FiLock className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    maxLength={6}
                    className="w-full bg-[#1a2231] border border-gray-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all tracking-widest font-mono text-center text-xl placeholder-gray-500"
                    placeholder="000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 bg-[#e53935] hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(229,57,53,0.3)] text-lg mt-2 flex justify-center items-center gap-2"
              >
                {loading ? 'Verifying...' : <><FiCheckCircle /> Verify OTP</>}
              </button>
            </form>
          )}

        </div>

        {/* Footer Links */}
        {step === 'phone' && selectedRole !== 'admin' && (
          <div className="mt-8 text-center text-gray-400">
            Don't have an account? <Link to="/register" className="text-red-500 hover:text-red-400 font-bold underline transition-colors">Register Now</Link>
            {selectedRole === 'provider' && (
              <div className="mt-2 text-sm">
                <Link to="/register-provider" className="text-gray-500 hover:text-gray-300 underline transition-colors">Provider Registration</Link>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
