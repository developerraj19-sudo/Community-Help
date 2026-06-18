import React, { useState, useEffect } from 'react';
import Navbar from '../components/shared/Navbar';
import { fileComplaint, getMyComplaints } from '../api/api';
import toast from 'react-hot-toast';
import { MdLocalPolice, MdDirectionsCar } from 'react-icons/md';
import { FiFileText, FiMapPin, FiCheckCircle, FiClock, FiUpload, FiImage, FiLock, FiShield, FiAlertTriangle, FiUserMinus, FiHome, FiMonitor, FiList, FiX } from 'react-icons/fi';

const CATEGORIES = [
  { value: 'theft', label: 'Theft / Robbery', icon: FiLock },
  { value: 'assault', label: 'Assault / Violence', icon: FiShield },
  { value: 'fraud', label: 'Fraud / Cheating', icon: FiAlertTriangle },
  { value: 'accident', label: 'Road Accident', icon: MdDirectionsCar },
  { value: 'missing_person', label: 'Missing Person', icon: FiUserMinus },
  { value: 'domestic_violence', label: 'Domestic Violence', icon: FiHome },
  { value: 'cybercrime', label: 'Cybercrime', icon: FiMonitor },
  { value: 'other', label: 'Other', icon: FiList },
];

const STATUS_STYLE = {
  submitted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  under_review: 'bg-blue-50 text-blue-700 border-blue-200',
  investigating: 'bg-purple-50 text-purple-700 border-purple-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  closed: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function PoliceComplaintPage() {
  const [form, setForm] = useState({ title: '', description: '', category: 'other', incidentDate: '', address: '' });
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const [tab, setTab] = useState('new');

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: 12.9141, lng: 74.8560 })
    );
    getMyComplaints().then(r => setComplaints(r.data.complaints)).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await fileComplaint({ ...form, evidence: evidenceFiles, lat: coords?.lat || 0, lng: coords?.lng || 0 });
      setSubmitted(data);
      setComplaints(prev => [data.complaint, ...prev]);
      toast.success(`Complaint filed! Number: ${data.complaint.complaintNumber}`);
      setForm({ title: '', description: '', category: 'other', incidentDate: '', address: '' });
      setEvidenceFiles([]);
      setTab('history');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file complaint');
    } finally { setLoading(false); }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    if (evidenceFiles.length + files.length > 3) {
      return toast.error('You can upload a maximum of 3 images');
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) return toast.error(`${file.name} is too large (max 5MB)`);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidenceFiles(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEvidence = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
            <MdLocalPolice className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Police Complaint</h1>
            <p className="text-gray-500 mt-0.5">Your complaint will be routed to the nearest police station</p>
          </div>
        </div>

        {submitted && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <FiCheckCircle className="text-green-600 w-6 h-6" />
              <div className="font-bold text-green-800">Complaint Registered Successfully!</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="bg-white rounded-xl p-3 border border-green-100">
                <div className="text-xs text-gray-500">Complaint Number</div>
                <div className="font-bold text-gray-800">{submitted.complaint.complaintNumber}</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-green-100">
                <div className="text-xs text-gray-500">Assigned Station</div>
                <div className="font-semibold text-gray-800 text-sm">{submitted.assignedStation}</div>
              </div>
            </div>
            <p className="text-green-700 text-sm mt-3">Save your complaint number for future reference.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {[['new','File New Complaint'],['history','My Complaints']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 ${tab===t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'new' ? <FiFileText /> : <FiClock />} {label}
            </button>
          ))}
        </div>

        {tab === 'new' ? (
          <form onSubmit={handleSubmit} className="card space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Complaint Title *</label>
              <input required className="input-field" placeholder="Brief title of the incident"
                value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Category *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORIES.map(c => {
                  const Icon = c.icon;
                  const isSelected = form.category === c.value;
                  return (
                    <button type="button" key={c.value} onClick={() => setForm({...form, category: c.value})}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="text-center text-xs font-semibold leading-tight">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Incident Description *</label>
              <textarea required rows={4} className="input-field" placeholder="Describe the incident in detail — what happened, who was involved, any witnesses..."
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Date of Incident</label>
                <input type="datetime-local" className="input-field" value={form.incidentDate} onChange={e => setForm({...form, incidentDate: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Incident Location</label>
                <input className="input-field" placeholder="Address of incident" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Proof / Evidence Images (Max 3)</label>
              <div className="flex items-center gap-4 flex-wrap">
                {evidenceFiles.length < 3 && (
                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 transition w-full md:w-auto h-16">
                    <FiUpload className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Upload Image(s)</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
                <div className="flex gap-3">
                  {evidenceFiles.map((imgBase64, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                      <img src={imgBase64} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeEvidence(idx)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 text-xs hover:bg-black/70 w-5 h-5 flex items-center justify-center leading-none">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
              <FiMapPin className="text-blue-500 flex-shrink-0" />
              <span className="text-sm text-blue-700">
                Your current location is detected — complaint will be routed to the nearest police station automatically.
              </span>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 btn-blue rounded-xl text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              <FiFileText /> {loading ? 'Filing Complaint...' : 'File Complaint'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {complaints.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <FiFileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No complaints filed yet</p>
              </div>
            ) : complaints.map(c => (
              <div key={c._id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900">{c.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">#{c.complaintNumber} · {new Date(c.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_STYLE[c.status]}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{c.description}</p>
                {c.nearestPoliceStation && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-blue-600">
                    <MdLocalPolice /> {c.nearestPoliceStation}
                  </div>
                )}
                {c.evidence && c.evidence.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FiImage /> Attached Evidence</div>
                    <div className="flex gap-2 overflow-x-auto">
                      {c.evidence.map((img, i) => (
                        <button key={i} onClick={(e) => { e.stopPropagation(); setSelectedEvidence(img); }} className="focus:outline-none">
                          <img src={img} alt="Proof" className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition cursor-pointer" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
