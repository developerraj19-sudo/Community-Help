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
  const [routeDistance, setRouteDistance] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [unitName, setUnitName] = useState('');
  const [actualStartLoc, setActualStartLoc] = useState(null);
  const intervalRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const [initialStartLoc, setInitialStartLoc] = useState(null);

  const userLat = emergency?.location?.coordinates[1] || 0;
  const userLng = emergency?.location?.coordinates[0] || 0;

  // Fetch route and nearby places
  useEffect(() => {
    if (!userLat || !userLng || !emergency) return;
    if (routeCoords.length > 0) return; // Prevent re-fetching when Firestore syncs initial location
    
    let dbStartLat = parseFloat(initialStartLoc?.lat);
    let dbStartLng = parseFloat(initialStartLoc?.lng);
    
    const isFallback = !dbStartLat || !dbStartLng || isNaN(dbStartLat) || isNaN(dbStartLng) || (Math.abs(dbStartLat - userLat) < 0.005 && Math.abs(dbStartLng - userLng) < 0.005);

    const fetchRoute = async () => {
      let finalLat = dbStartLat;
      let finalLng = dbStartLng;
      let placeName = null;

      const MANGALURU_HOSPITALS = [
        { tags: { name: "KMC Hospital" }, lat: 12.8703, lon: 74.8436 },
        { tags: { name: "Wenlock Hospital" }, lat: 12.8687, lon: 74.8437 },
        { tags: { name: "Father Muller Hospital" }, lat: 12.8631, lon: 74.8550 },
        { tags: { name: "A J Hospital" }, lat: 12.9009, lon: 74.8360 },
        { tags: { name: "Indiana Hospital" }, lat: 12.8569, lon: 74.8647 }
      ];

      const MANGALURU_POLICE = [
        { tags: { name: "Pandeshwara Police Station" }, lat: 12.8560, lon: 74.8393 },
        { tags: { name: "Kadri Police Station" }, lat: 12.8902, lon: 74.8526 },
        { tags: { name: "Barke Police Station" }, lat: 12.8833, lon: 74.8333 },
        { tags: { name: "Bunder Police Station" }, lat: 12.8666, lon: 74.8333 },
        { tags: { name: "Urwa Police Station" }, lat: 12.9022, lon: 74.8358 }
      ];

      const MANGALURU_FIRE = [
        { tags: { name: "Pandeshwara Fire Station" }, lat: 12.8555, lon: 74.8400 },
        { tags: { name: "Kadri Fire Station" }, lat: 12.8900, lon: 74.8500 }
      ];

        const targetType = emergency.type === 'police' ? 'police' : emergency.type === 'fire' ? 'fire_station' : 'hospital';
        const targetArray = targetType === 'police' ? MANGALURU_POLICE : targetType === 'fire_station' ? MANGALURU_FIRE : MANGALURU_HOSPITALS;
        
        const sortedPlaces = [...targetArray].sort((a, b) => {
                const distA = Math.pow(a.lat - userLat, 2) + Math.pow(a.lon - userLng, 2);
                const distB = Math.pow(b.lat - userLat, 2) + Math.pow(b.lon - userLng, 2);
                return distA - distB;
              });

            if (sortedPlaces.length > 0) {
              const topPlaces = sortedPlaces.slice(0, 5);
              let bestPlace = topPlaces[0];

              try {
                const coords = [...topPlaces.map(p => `${p.lon},${p.lat}`), `${userLng},${userLat}`].join(';');
                const sources = topPlaces.map((_, i) => i).join(';');
                const destIndex = topPlaces.length;
                
                const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${sources}&destinations=${destIndex}`;
                const res = await fetch(url);
                const tableData = await res.json();
                
                if (tableData.durations && tableData.durations.length === topPlaces.length) {
                  let shortestDuration = Infinity;
                  for (let i = 0; i < topPlaces.length; i++) {
                    const dur = tableData.durations[i][0];
                    if (dur !== null && dur < shortestDuration) {
                      shortestDuration = dur;
                      bestPlace = topPlaces[i];
                    }
                  }
                }
              } catch (e) {
                console.warn("OSRM table check failed, using euclidean nearest", e);
              }

              finalLat = bestPlace.lat;
              finalLng = bestPlace.lon;
              placeName = bestPlace.tags?.name || (targetType === 'police' ? 'Local Police Station' : targetType === 'fire_station' ? 'Local Fire Station' : 'Local Hospital');
              setUnitName(placeName);
            }

      if (isFallback && !placeName) {
        let seed = 0;
        const strId = emergency?._id || 'fallback';
        for (let i = 0; i < strId.length; i++) seed += strId.charCodeAt(i);
        const angle = (seed % 360) * (Math.PI / 180);
        finalLat = userLat + Math.cos(angle) * 0.04;
        finalLng = userLng + Math.sin(angle) * 0.04;
        setUnitName(emergency?.assignedStation || ('Unit ' + ((seed % 10) + 1)));
      }

      setActualStartLoc({ lat: finalLat, lng: finalLng });

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${finalLng},${finalLat};${userLng},${userLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoords(coords);
          if (data.routes[0].distance) setRouteDistance(data.routes[0].distance);
          
          const actualDuration = data.routes[0].duration;
          const realisticSeconds = isFallback && placeName ? Math.ceil(actualDuration) + 120 : (16 * 60);
          setOsrmDuration(realisticSeconds);
          
          setProviderEta(prev => {
            if (prev === null) {
              const storageKey = `track_start_${id}`;
              let startTime = localStorage.getItem(storageKey);
              if (!startTime) {
                startTime = Date.now().toString();
                localStorage.setItem(storageKey, startTime);
              }
              const elapsedSecs = Math.floor((Date.now() - parseInt(startTime)) / 1000);
              const actualElapsed = Math.min(elapsedSecs, realisticSeconds);
              setElapsed(actualElapsed);
              return Math.max(0, Math.floor(realisticSeconds) - actualElapsed);
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("OSRM Routing Error:", err);
      }
    };
    
    fetchRoute();
  }, [userLat, userLng, initialStartLoc, emergency]);


  useEffect(() => {
    getMyEmergencies()
      .then(r => {
        const e = r.data.emergencies.find(em => em._id === id);
        setEmergency(e);
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
        }
      }
    });
    return () => unsub();
  }, [id, osrmDuration]);

  useEffect(() => {
    if (!emergency) return;
    intervalRef.current = setInterval(() => {
      setProviderEta(e => {
        if (e === null) return e; // Wait for OSRM route to load before starting
        
        setElapsed(s => s + 1); // Only increment elapsed if ETA is loaded

        if (e > 0) return e - 1;
        
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
  
  const delaySeconds = 120; // 2 minutes waiting period
  const movingSeconds = Math.max(1, totalSeconds - delaySeconds);
  
  let progress = 0;
  let moveRatio = 0;
  
  if (providerEta !== null) {
    if (providerEta <= movingSeconds) {
      progress = Math.max(0, 100 - (providerEta / movingSeconds) * 100);
      moveRatio = Math.min(1, Math.max(0, 1 - (providerEta / movingSeconds)));
    } else {
      progress = 0;
      moveRatio = 0;
    }
  }

  // Use dynamically calculated start coordinates if available, otherwise default to user location
  let validStartLat = actualStartLoc?.lat || userLat;
  let validStartLng = actualStartLoc?.lng || userLng;

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

  const hospitalIcon = new L.DivIcon({
    html: `<div style="background: white; border: 2px solid #ef4444; border-radius: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: #ef4444; font-weight: bold; font-family: sans-serif; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">H</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  const policeIcon = new L.DivIcon({
    html: `<div style="background: white; border: 2px solid #3b82f6; border-radius: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: #3b82f6; font-weight: bold; font-family: sans-serif; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">P</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  const fireStationIcon = new L.DivIcon({
    html: `<div style="background: white; border: 2px solid #f97316; border-radius: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: #f97316; font-weight: bold; font-family: sans-serif; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">F</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

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
                  Unit: {unitName || cfg.unit}
                  {routeDistance && (
                    <>
                      <span className="text-gray-300 mx-1">•</span>
                      <span>{(routeDistance / 1000).toFixed(1)} km Route</span>
                    </>
                  )}
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

                {/* Nearby Places */}
                {nearbyPlaces.map(place => {
                  const amenity = place.tags?.amenity;
                  const icon = amenity === 'police' ? policeIcon : amenity === 'fire_station' ? fireStationIcon : hospitalIcon;
                  const fallbackName = amenity === 'police' ? 'Police Station' : amenity === 'fire_station' ? 'Fire Station' : 'Nearby Hospital';
                  
                  return (
                    <Marker key={place.id} position={[place.lat, place.lon]} icon={icon}>
                      <Popup className="font-sans font-semibold text-gray-800 text-sm">
                        {place.tags?.name || fallbackName}
                      </Popup>
                    </Marker>
                  );
                })}

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
