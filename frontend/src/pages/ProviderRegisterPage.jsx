import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerProvider, sendOtp, verifyOtp } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { 
  FiPhone, FiLock, FiArrowLeft, FiUploadCloud, FiFileText, FiChevronDown, FiCheckCircle,
  FiUser, FiDollarSign, FiCreditCard, FiAward, FiMapPin
} from 'react-icons/fi';
import { 
  LuWrench, LuZap, LuHammer, LuWind, LuMicrowave, LuTruck, LuSparkles, LuHome, 
  LuChefHat, LuHeartHandshake, LuActivity, LuTestTube, LuBookOpen, LuBuilding2, LuGlobe
} from 'react-icons/lu';


const SERVICE_CATEGORIES = [
  { value: 'plumber', label: 'Plumber', icon: LuWrench },
  { value: 'electrician', label: 'Electrician', icon: LuZap },
  { value: 'carpenter', label: 'Carpenter', icon: LuHammer },
  { value: 'ac_repair', label: 'AC Repair', icon: LuWind },
  { value: 'appliance_repair', label: 'Appliance', icon: LuMicrowave },
  { value: 'water_tanker', label: 'Water Tanker', icon: LuTruck },
  { value: 'cleaning', label: 'Cleaning', icon: LuSparkles },
  { value: 'maid', label: 'Maid', icon: LuHome },
  { value: 'cook', label: 'Cook', icon: LuChefHat },
  { value: 'caretaker', label: 'Caretaker', icon: LuHeartHandshake },
  { value: 'physiotherapy', label: 'Physiotherapy', icon: LuActivity },
  { value: 'lab_test', label: 'Lab Test', icon: LuTestTube },
  { value: 'tutor', label: 'Home Tutor', icon: LuBookOpen },
  { value: 'company', label: 'Company / Agency', icon: LuBuilding2 },
  { value: 'organization', label: 'Organization / NGO', icon: LuGlobe },
];

const FileUpload = ({ label, file, setFile, required }) => (
  <div>
    <label className="text-gray-300 text-sm mb-2 block">{label} {required && '*'}</label>
    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/20 border-dashed rounded-xl cursor-pointer bg-white/5 hover:border-blue-500 hover:bg-white/10 transition-all group">
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
        {file ? (
          <>
            <FiFileText className="w-8 h-8 text-blue-400 mb-2" />
            <p className="text-sm text-gray-200 font-semibold truncate max-w-[200px]">{file.name}</p>
            <p className="text-xs text-gray-400 mt-1">Click to change file</p>
          </>
        ) : (
          <>
            <FiUploadCloud className="w-8 h-8 text-gray-400 group-hover:text-blue-400 transition-colors mb-2" />
            <p className="text-sm text-gray-300 font-semibold group-hover:text-white transition-colors">Click to upload document</p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG or PDF (MAX. 5MB)</p>
          </>
        )}
      </div>
      <input type="file" required={required && !file} className="hidden" accept="image/*,.pdf" onChange={e => setFile(e.target.files[0])} />
    </label>
  </div>
);

const InputWithIcon = ({ icon: Icon, className, ...props }) => (
  <div className={`relative ${className || ''}`}>
    <Icon className="absolute left-4 top-3.5 text-gray-400 w-5 h-5 pointer-events-none" />
    <input 
      {...props} 
      className={`w-full bg-white/10 border border-white/20 text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${props.className || ''}`} 
    />
  </div>
);

const TextareaWithIcon = ({ icon: Icon, className, ...props }) => (
  <div className={`relative ${className || ''}`}>
    <Icon className="absolute left-4 top-4 text-gray-400 w-5 h-5 pointer-events-none" />
    <textarea 
      {...props} 
      className={`w-full bg-white/10 border border-white/20 text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${props.className || ''}`} 
    />
  </div>
);

export default function ProviderRegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', otp: '',
    serviceCategory: '', providerType: 'individual', experience: '', about: '', workStyle: '',
    skills: '', offeredServices: [], hourlyRate: '', minimumCharge: '', lat: '', lng: ''
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [idProofFile, setIdProofFile] = useState(null);
  const [idProofType, setIdProofType] = useState('Aadhar Card');
  const [companyLicenseFile, setCompanyLicenseFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleDetectLocation = () => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        toast.success("Location detected successfully");
        setLocationLoading(false);
      },
      (err) => {
        toast.error("Could not detect location. Please enable location permissions.");
        setLocationLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSendOtpAndNext = async () => {
    if(!form.name || !form.phone || !form.password) { toast.error('Name, Phone, and Password are required'); return; }
    setLoading(true);
    try {
      const formattedPhone = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;
      const { data } = await sendOtp({ phone: formattedPhone });
      
      if (data.success) {
        toast.success('OTP sent successfully!');
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step !== 3) {
      if (!form.lat || !form.lng) {
        toast.error('Please detect your location before proceeding.');
        return;
      }
      setStep(3);
      return;
    }

    if (!form.otp) {
      toast.error('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = form.phone.startsWith('+') ? form.phone : `+91${form.phone}`;

      if ((form.serviceCategory === 'company' || form.serviceCategory === 'organization') && form.offeredServices.length === 0) {
        toast.error('Please select at least one offered service.');
        setLoading(false);
        return;
      }

      // 1. Verify OTP and authenticate
      const verifyRes = await verifyOtp({ phone: formattedPhone, otp: form.otp, password: form.password });
      const { token, user } = verifyRes.data;
      
      // Temporarily set token in localStorage so the next request succeeds
      localStorage.setItem('token', token);

      // --- NEW BULLETPROOF IMAGE UPLOAD (Base64 to MongoDB) ---
      // We are completely bypassing Firebase Storage to avoid all CORS and Bucket Not Found errors!
      const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });

      let idProofBase64 = '';
      let companyLicenseBase64 = '';

      if (idProofFile) {
        idProofBase64 = await fileToBase64(idProofFile);
      } else {
        toast.error('ID Proof is required');
        setLoading(false);
        return;
      }

      if (form.serviceCategory === 'company' || form.serviceCategory === 'organization') {
        if (companyLicenseFile) {
          companyLicenseBase64 = await fileToBase64(companyLicenseFile);
        } else {
          toast.error('Company/NGO License is required');
          setLoading(false);
          return;
        }
      }

      // 2. Register Provider Profile
      const payload = {
        name: form.name,
        email: form.email,
        serviceCategory: form.serviceCategory,
        providerType: form.providerType,
        experience: Number(form.experience),
        about: form.about,
        workStyle: '',
        hourlyRate: Number(form.hourlyRate),
        minimumCharge: Number(form.minimumCharge),
        skills: [],
        offeredServices: form.offeredServices,
        idProof: idProofBase64,
        companyLicense: companyLicenseBase64,
        // Grab current location so they appear in nearby searches!
        lat: Number(form.lat),
        lng: Number(form.lng)
      };

      const { data } = await registerProvider(payload);
      
      // 3. DO NOT LOG THEM IN AS A PROVIDER. Wait for Admin Approval.
      localStorage.removeItem('token'); // clear the temporary token
      
      // Show exact message requested by user
      toast.success('Your verification is sent to admin for verification', { duration: 5000 });
      navigate('/login');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const inputCls = "w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-4">CH</div>
          <h1 className="text-3xl font-black text-white">Join as Provider</h1>
          <p className="text-gray-400 mt-1">Offer your services to the community</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1,2,3].map(s => (
              <div key={s} className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-blue-500' : 'w-2 bg-white/20'}`} />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-5 sm:p-8 space-y-5">
          {step === 1 && (
            <>
              <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold text-sm cursor-pointer hover:text-blue-300 transition-colors" onClick={() => navigate('/register')}>
                ← Back
              </div>
              <h2 className="text-white font-bold text-lg">Personal Details</h2>
              <input required className={inputCls} placeholder="Full Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input type="email" className={inputCls} placeholder="Email Address (Optional)" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <div className="relative">
                <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type="tel" className={`${inputCls} pl-11`} placeholder="Phone Number *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type="password" className={`${inputCls} pl-11`} placeholder="Create a Password *" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <button type="button" disabled={loading} onClick={handleSendOtpAndNext}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition">
                {loading ? 'Sending OTP...' : 'Next: Service Details →'}
              </button>
            </>
          )}
          
          {step === 2 && (
            <>
              <h2 className="text-white font-bold text-lg">Professional Details</h2>
              <div className="mb-6">
                <label className="text-gray-300 text-sm mb-3 block">Service Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {SERVICE_CATEGORIES.map(c => {
                    const Icon = c.icon;
                    const isSelected = form.serviceCategory === c.value;
                    return (
                      <div 
                        key={c.value} 
                        onClick={() => setForm({...form, serviceCategory: c.value})}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30'}`}
                      >
                        <Icon className={`w-6 h-6 mb-2 transition-colors ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                        <span className={`text-xs font-semibold text-center transition-colors ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>{c.label}</span>
                        {isSelected && <FiCheckCircle className="absolute top-2 right-2 w-4 h-4 text-blue-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {(form.serviceCategory === 'company' || form.serviceCategory === 'organization') && (
                <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <label className="text-gray-300 text-sm mb-3 block">Select Utility Services Offered *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {SERVICE_CATEGORIES.filter(c => c.value !== 'company' && c.value !== 'organization').map(c => {
                      const Icon = c.icon;
                      const isSelected = form.offeredServices.includes(c.value);
                      const toggleService = () => {
                        setForm(prev => {
                          const newServices = isSelected 
                            ? prev.offeredServices.filter(s => s !== c.value)
                            : [...prev.offeredServices, c.value];
                          return { ...prev, offeredServices: newServices };
                        });
                      };
                      
                      return (
                        <div 
                          key={c.value} 
                          onClick={toggleService}
                          className={`relative flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'}`}
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                          <span className={`text-xs font-semibold leading-tight transition-colors ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>{c.label}</span>
                          {isSelected && <FiCheckCircle className="absolute top-2 right-2 w-3 h-3 text-blue-500" />}
                        </div>
                      );
                    })}
                  </div>
                  {form.offeredServices.length === 0 && <p className="text-xs text-red-400 mt-2">Please select at least one service.</p>}
                </div>
              )}

              <div>
                <label className="text-gray-300 text-sm mb-2 block">Select ID Proof Type *</label>
                <select 
                  value={idProofType} 
                  onChange={(e) => setIdProofType(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Aadhar Card" className="text-gray-900">Aadhar Card</option>
                  <option value="PAN Card" className="text-gray-900">PAN Card</option>
                  <option value="Driving License" className="text-gray-900">Driving License</option>
                  <option value="Voter ID" className="text-gray-900">Voter ID</option>
                  <option value="Passport" className="text-gray-900">Passport</option>
                </select>

                <FileUpload 
                  label={`Upload ${idProofType}`} 
                  file={idProofFile} 
                  setFile={setIdProofFile} 
                  required={true} 
                />
              </div>
              
              {(form.serviceCategory === 'company' || form.serviceCategory === 'organization') && (
                <FileUpload 
                  label="Upload Company/NGO License" 
                  file={companyLicenseFile} 
                  setFile={setCompanyLicenseFile} 
                  required={true} 
                />
              )}

              <InputWithIcon 
                icon={FiAward} 
                required 
                type="number" 
                min="0" 
                placeholder="Years of Experience" 
                value={form.experience} 
                onChange={e => setForm({...form, experience: e.target.value})} 
              />
              <TextareaWithIcon 
                icon={FiUser} 
                required 
                rows={4} 
                placeholder="Professional Overview (About yourself, your work, and skills...)" 
                value={form.about} 
                onChange={e => setForm({...form, about: e.target.value})} 
              />
              <div className="grid grid-cols-2 gap-4">
                <InputWithIcon 
                  icon={FiDollarSign} 
                  type="number" 
                  min="0"
                  placeholder="Hourly Rate (₹)" 
                  value={form.hourlyRate} 
                  onChange={e => setForm({...form, hourlyRate: e.target.value})} 
                />
                <InputWithIcon 
                  icon={FiCreditCard} 
                  type="number" 
                  min="0"
                  placeholder="Min Charge (₹)" 
                  value={form.minimumCharge} 
                  onChange={e => setForm({...form, minimumCharge: e.target.value})} 
                />
              </div>

              <div className="mb-4">
                <label className="text-gray-300 text-sm mb-2 block">Provider Location *</label>
                <div className="flex gap-2">
                  <input type="text" readOnly className={`${inputCls} flex-1 text-sm bg-black/20 text-gray-400 cursor-not-allowed`} placeholder="Latitude" value={form.lat} />
                  <input type="text" readOnly className={`${inputCls} flex-1 text-sm bg-black/20 text-gray-400 cursor-not-allowed`} placeholder="Longitude" value={form.lng} />
                </div>
                <button type="button" onClick={handleDetectLocation} disabled={locationLoading} className="mt-2 w-full py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                  <FiMapPin /> {locationLoading ? 'Detecting Location...' : 'Auto Detect Location'}
                </button>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition">← Back</button>
                <button type="submit" className="flex-2 flex-grow py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition">
                  Next: Verification →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-white font-bold text-lg text-center">Verify Phone Number</h2>
              <div className="text-center mb-4">
                <p className="text-gray-300 text-sm">OTP sent to <span className="font-bold text-white">{form.phone}</span></p>
                <button type="button" onClick={() => setStep(1)} className="text-blue-400 text-xs mt-1 hover:text-blue-300">Change Details</button>
              </div>
              <div>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" required value={form.otp} onChange={e => setForm({...form, otp: e.target.value})} maxLength={6}
                    className={`${inputCls} pl-11 tracking-widest text-center`}
                    placeholder="------" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition">← Back</button>
                <button type="submit" disabled={loading} className="flex-2 flex-grow py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition">
                  {loading ? 'Verifying...' : 'Register Provider'}
                </button>
              </div>
            </>
          )}
        </form>
        <p className="text-center text-gray-400 mt-6">
          Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
