import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { renderToString } from 'react-dom/server';
import Navbar from '../components/shared/Navbar';
import { getMyEmergencies } from '../api/api';
import { FiMapPin, FiClock, FiPhone, FiArrowLeft, FiCheckCircle, FiNavigation } from 'react-icons/fi';
import { MdLocalHospital, MdLocalPolice, MdFireTruck } from 'react-icons/md';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
const userIcon = new L.DivIcon({
  html: `
    <div style="
      background-color: #3b82f6; 
      width: 20px; height: 20px; 
      border-radius: 50%; 
      border: 3px solid white; 
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 10px rgba(0,0,0,0.3);
    "></div>
  `,
  className: 'custom-leaflet-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const TYPE_CONFIG = {
  ambulance: { icon: MdLocalHospital, color: 'red', label: 'Ambulance', unit: 'Ambulance Unit 3', phone: '108' },
  police: { icon: MdLocalPolice, color: 'blue', label: 'Police', unit: 'Patrol Car PC-47', phone: '100' },
  fire: { icon: MdFireTruck, color: 'orange', label: 'Fire Brigade', unit: 'Fire Engine FE-12', phone: '101' },
};

function getBearing(startLat, startLng, destLat, destLng) {
  const startLatRad = startLat * Math.PI / 180;
  const startLngRad = startLng * Math.PI / 180;
  const destLatRad = destLat * Math.PI / 180;
  const destLngRad = destLng * Math.PI / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

function getPositionAlongPath(coords, ratio) {
  if (!coords || coords.length === 0) return { pos: null, index: 0, bearing: 0 };
  if (ratio <= 0) {
    const bearing = coords.length > 1 ? getBearing(coords[0][0], coords[0][1], coords[1][0], coords[1][1]) : 0;
    return { pos: coords[0], index: 0, bearing };
  }
  if (ratio >= 1) {
    const bearing = coords.length > 1 ? getBearing(coords[coords.length - 2][0], coords[coords.length - 2][1], coords[coords.length - 1][0], coords[coords.length - 1][1]) : 0;
    return { pos: coords[coords.length - 1], index: coords.length - 1, bearing };
  }

  let totalDist = 0;
  const dists = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const d = L.latLng(coords[i]).distanceTo(L.latLng(coords[i + 1]));
    dists.push(d);
    totalDist += d;
  }

  const targetDist = totalDist * ratio;
  let currDist = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    if (currDist + dists[i] >= targetDist) {
      const segmentRatio = dists[i] === 0 ? 0 : (targetDist - currDist) / dists[i];
      const lat = coords[i][0] + (coords[i + 1][0] - coords[i][0]) * segmentRatio;
      const lng = coords[i][1] + (coords[i + 1][1] - coords[i][1]) * segmentRatio;
      const bearing = getBearing(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
      return { pos: [lat, lng], index: i, bearing };
    }
    currDist += dists[i];
  }
  const bearing = coords.length > 1 ? getBearing(coords[coords.length - 2][0], coords[coords.length - 2][1], coords[coords.length - 1][0], coords[coords.length - 1][1]) : 0;
  return { pos: coords[coords.length - 1], index: coords.length - 1, bearing };
}

function MapUpdater({ startLat, startLng, endLat, endLng }) {
  const map = useMap();
  useEffect(() => {
    if (startLat && startLng && endLat && endLng) {
      const bounds = L.latLngBounds([[startLat, startLng], [endLat, endLng]]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, startLat, startLng, endLat, endLng]);
  return null;
}

export default function TrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emergency, setEmergency] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [providerEta, setProviderEta] = useState(null);
  const [providerLoc, setProviderLoc] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [osrmDuration, setOsrmDuration] = useState(null);
  const intervalRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [initialStartLoc, setInitialStartLoc] = useState(null);

  const userLat = emergency?.location?.coordinates[1] || 0;
  const userLng = emergency?.location?.coordinates[0] || 0;

  // Wait for the actual provider location from Firestore to start routing
  useEffect(() => {
    if (!userLat || !userLng || !emergency) return;
    
    let validStartLat = parseFloat(initialStartLoc?.lat);
    let validStartLng = parseFloat(initialStartLoc?.lng);
    
    if (!validStartLat || !validStartLng || isNaN(validStartLat) || isNaN(validStartLng) || (Math.abs(validStartLat - userLat) < 0.005 && Math.abs(validStartLng - userLng) < 0.005)) {
      let seed = 0;
      const strId = emergency?._id || 'fallback';
      for (let i = 0; i < strId.length; i++) seed += strId.charCodeAt(i);
      const angle = (seed % 360) * (Math.PI / 180);
      validStartLat = userLat + Math.cos(angle) * 0.005; // ~550m for nearest route
      validStartLng = userLng + Math.sin(angle) * 0.005;
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${validStartLng},${validStartLat};${userLng},${userLat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoords(coords);
          
          const realisticSeconds = 120; // Force exactly 2 minutes
          setOsrmDuration(realisticSeconds);
          
          setProviderEta(prev => {
            if (prev === null) {
              setElapsed(0);
              return realisticSeconds;
            }
            return prev;
          });
        }
      })
      .catch(err => console.error("OSRM Routing Error:", err));
  }, [userLat, userLng, initialStartLoc, emergency]);


  useEffect(() => {
    getMyEmergencies()
      .then(r => {
        const e = r.data.emergencies.find(em => em._id === id);
        setEmergency(e);
        setProviderEta(prev => {
          if (e && prev === null && !osrmDuration) {
            setElapsed(0); // Force elapsed to 0 so the progress bar starts from the beginning
            return 120; // Force strictly to 2 minutes
          }
          return prev;
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Firestore Real-Time Sync
    const unsub = onSnapshot(doc(db, 'emergency_status', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status) setEmergency(prev => prev ? { ...prev, status: data.status } : null);
        if (data.providerLat && data.providerLng) {
          setProviderLoc({ lat: data.providerLat, lng: data.providerLng });
          setInitialStartLoc(prev => prev || { lat: data.providerLat, lng: data.providerLng });
          // Only use ETA from Firebase if we haven't started counting down locally
          setProviderEta(prev => {
            if (prev === null && data.etaMinutes !== undefined) {
              return data.etaMinutes * 60;
            }
            return prev;
          });
        }
      }
    });
    return () => unsub();
  }, [id, osrmDuration]);

  useEffect(() => {
    if (!emergency) return;
    intervalRef.current = setInterval(() => {
      setElapsed(s => s + 1);
      setProviderEta(e => {
        if (e !== null && e > 0) return e - 1;
        
        // Auto-resolve when ETA hits exactly 0
        if (e === 1 || e === 0) {
           clearInterval(intervalRef.current);
           if (emergency.status !== 'resolved') {
             import('../api/api').then(({ resolveEmergency }) => {
               resolveEmergency(emergency._id).then(() => {
                 toast.success('Emergency automatically resolved upon arrival!');
                 setTimeout(() => navigate('/user-dashboard'), 3000);
               }).catch(console.error);
             });
           }
           return 0;
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [emergency, navigate]);

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!emergency) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="card">
          <FiMapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Emergency not found</p>
          <button onClick={() => navigate('/emergency')} className="mt-4 btn-primary">← Back to Emergency</button>
        </div>
      </div>
    </div>
  );

  const cfg = TYPE_CONFIG[emergency.type] || TYPE_CONFIG.ambulance;
  const Icon = cfg.icon;
  const colorMap = { red: { bg: 'bg-red-600', light: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' }, blue: { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' }, orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' } };
  const c = colorMap[cfg.color];
  const etaMins = providerEta !== null ? Math.ceil(providerEta / 60) : emergency.etaMinutes;
  const isArrived = providerEta === 0 || emergency.status === 'resolved';
  
  // Calculate smooth visual movement using real OSRM duration if available
  const totalSeconds = osrmDuration || (emergency.etaMinutes * 60);
  const currentSeconds = providerEta !== null ? providerEta : totalSeconds;
  
  const progress = providerEta !== null ? Math.max(0, 100 - (providerEta / totalSeconds) * 100) : 0;
  // Progress from 0.0 to 1.0
  const moveRatio = Math.min(1, Math.max(0, 1 - (currentSeconds / totalSeconds)));

  // Force valid coordinates. If backend gives us strings or exact matches, force an offset.
  let validStartLat = parseFloat(initialStartLoc?.lat);
  let validStartLng = parseFloat(initialStartLoc?.lng);
  
  if (!validStartLat || !validStartLng || isNaN(validStartLat) || isNaN(validStartLng) || (Math.abs(validStartLat - userLat) < 0.005 && Math.abs(validStartLng - userLng) < 0.005)) {
    // Deterministic 8km offset generator
    let seed = 0;
    const strId = emergency?._id || 'fallback';
    for (let i = 0; i < strId.length; i++) seed += strId.charCodeAt(i);
    const angle = (seed % 360) * (Math.PI / 180);
    validStartLat = userLat + Math.cos(angle) * 0.005;
    validStartLng = userLng + Math.sin(angle) * 0.005;
  }

  const currentPosData = routeCoords.length > 0
    ? getPositionAlongPath(routeCoords, moveRatio)
    : {
      pos: [validStartLat + (userLat - validStartLat) * moveRatio, validStartLng + (userLng - validStartLng) * moveRatio],
      index: 0,
      bearing: getBearing(validStartLat, validStartLng, userLat, userLng)
    };

  const currentPos = currentPosData.pos;
  const currentLat = currentPos && !isNaN(currentPos[0]) ? currentPos[0] : validStartLat;
  const currentLng = currentPos && !isNaN(currentPos[1]) ? currentPos[1] : validStartLng;
  const currentBearing = currentPosData.bearing;

  // Erase travelled path by only drawing from current vehicle position onwards
  const remainingRoute = routeCoords.length > 0
    ? [currentPos, ...routeCoords.slice(currentPosData.index + 1)]
    : [[currentLat, currentLng], [userLat, userLng]];

  // Make absolutely sure MapUpdater gets the final, enforced coordinates
  const finalStartLat = validStartLat;
  const finalStartLng = validStartLng;

  // Dynamically generate hyper-realistic rotated vehicle image icon
  const vehicleSrc = emergency?.type === 'ambulance' ? '/icons/ambulance.png'
    : emergency?.type === 'police' ? '/icons/police.png'
      : '/icons/fire.png';

  // Since the user's vehicle icons are side-profile and face LEFT by default,
  // we do NOT rotate them like a steering wheel (which breaks perspective).
  // Instead, we flip them horizontally based on the east/west direction of travel.
  const isMovingEast = currentBearing >= 0 && currentBearing <= 180;
  const flipTransform = isMovingEast ? 'scaleX(-1)' : 'scaleX(1)';

  const providerIcon = emergency && vehicleSrc ? new L.DivIcon({
    html: `
      <div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
        <img src="${vehicleSrc}" style="width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; transform: ${flipTransform}; transition: transform 0.3s ease-in-out;" alt="Vehicle"/>
      </div>
    `,
    className: 'custom-leaflet-icon provider-moving-icon',
    iconSize: [60, 60],
    iconAnchor: [30, 30],
  }) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 font-medium">
          <FiArrowLeft /> Back
        </button>

        {/* Sleek Status Header */}
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/40 border border-gray-100 p-6 mb-6 overflow-hidden relative">
          <div className={`absolute top-0 right-0 w-32 h-32 ${c.bg} opacity-[0.03] rounded-full blur-3xl -mr-10 -mt-10`}></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${c.light} ${c.text}`}>
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                  {cfg.label} <span className={c.text}>{isArrived ? 'Arrived' : 'Dispatched'}</span>
                </h1>
                <p className="text-gray-500 text-sm font-semibold mt-1 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${c.bg}`}></span>
                  Unit: {cfg.unit}
                </p>
              </div>
            </div>
            
            {/* Professional ETA Box */}
            {isArrived ? (
              <div className="bg-green-50 border border-green-100 text-green-700 font-bold text-sm flex items-center gap-2 px-4 py-3 rounded-2xl w-full sm:w-auto justify-center shadow-sm">
                <FiCheckCircle className="w-5 h-5" /> Arrived Securely
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                <div className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-3 w-full sm:w-auto shadow-inner">
                  <div className="sm:hidden text-gray-500 font-bold text-sm pl-2">Estimated Arrival</div>
                  <div className="text-right flex items-end gap-1.5 pr-2 sm:pr-0">
                    <div className={`text-4xl font-black leading-none tracking-tighter ${c.text}`}>{fmt(providerEta || totalSeconds)}</div>
                    <div className="text-gray-500 font-bold text-xs uppercase tracking-wider pb-0.5 leading-tight">ETA</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Premium Progress Bar */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-extrabold text-gray-900 flex items-center gap-2">
               <span className="relative flex h-2.5 w-2.5">
                 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.bg} opacity-40`}></span>
                 <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.bg}`}></span>
               </span>
               Help is on the way
            </span>
            <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg shadow-inner flex items-center gap-1">
              <FiClock className="w-3.5 h-3.5" /> {fmt(elapsed)}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
            <div className={`h-full ${c.bg} transition-all duration-1000 rounded-full relative overflow-hidden`} style={{ width: `${Math.min(100, progress)}%` }}>
               <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs uppercase tracking-wider text-gray-400 mt-3 font-bold">
            <span className={`flex items-center gap-1 ${progress > 0 ? c.text : ''}`}><Icon className="w-3.5 h-3.5" /> Dispatched</span>
            <span className={`flex items-center gap-1 ${progress > 50 ? c.text : ''}`}><FiNavigation className="w-3.5 h-3.5" /> En Route</span>
            <span className={`flex items-center gap-1 ${progress >= 100 ? c.text : ''}`}><FiMapPin className="w-3.5 h-3.5" /> Location</span>
          </div>

          {/* Live Tracking Map */}
          <div className="mt-4 h-64 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 z-0 relative">
            {emergency.location?.coordinates ? (
              <MapContainer
                center={[userLat, userLng]}
                zoom={14}
                scrollWheelZoom={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                <MapUpdater startLat={finalStartLat} startLng={finalStartLng} endLat={userLat} endLng={userLng} />

                {/* Full Route Line (Grey) */}
                {routeCoords.length > 0 && (
                  <Polyline
                    positions={routeCoords}
                    color="#9ca3af"
                    weight={4}
                    opacity={0.5}
                    dashArray="5, 10"
                  />
                )}

                {/* Zomato Style Solid Route Line (Remaining Route) */}
                <Polyline
                  positions={remainingRoute}
                  color="#1f2937"
                  weight={5}
                  opacity={0.9}
                />

                {/* Location Accuracy Radius (Swiggy Style) */}
                <Circle
                  center={[userLat, userLng]}
                  radius={150}
                  pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }}
                />

                {/* User Location */}
                <Marker position={[userLat, userLng]} icon={userIcon}>
                  <Popup>Your Location</Popup>
                </Marker>

                {/* Provider Location (Smoothly animates towards user) */}
                <Marker position={[currentLat, currentLng]} icon={providerIcon}>
                  <Popup>{cfg.unit} (ETA: {etaMins}m)</Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">Loading map...</div>
            )}
          </div>
        </div>

        {/* Emergency Info */}
        <div className="card mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Emergency Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <FiMapPin className={c.text} />
              <span className="text-gray-700">{emergency.location?.address || 'Location detected'}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <FiClock className={c.text} />
              <span className="text-gray-700">Dispatched at {new Date(emergency.createdAt).toLocaleTimeString()}</span>
            </div>
            {emergency.assignedStation && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Icon className={c.text} />
                <span className="text-gray-700">{emergency.assignedStation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Helpline */}
        <div className={`card ${c.light} border ${c.border}`}>
          <h3 className="font-bold text-gray-900 mb-3">Emergency Helplines</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[['Ambulance', '108', MdLocalHospital, 'text-red-500 bg-red-50'], ['Police', '100', MdLocalPolice, 'text-blue-500 bg-blue-50'], ['Fire', '101', MdFireTruck, 'text-orange-500 bg-orange-50']].map(([name, num, Icon, classes]) => (
              <a key={num} href={`tel:${num}`}
                className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-xl p-3 hover:shadow-md transition">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${classes}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs text-gray-500 font-medium">{name}</span>
                <span className="font-black text-gray-800">{num}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
