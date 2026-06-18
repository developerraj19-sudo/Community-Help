import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getProviderRequests, getMyRequests } from '../api/api';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const previousRequestsRef = useRef([]);

  const playDing = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch(e) { console.error('Audio play failed', e); }
  };

  const showBrowserNotification = (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      // Request permission only if the user interacts, or gracefully on load
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user || user.role === 'admin') return; // Skip for admin right now

    let isMounted = true;

    const checkNotifications = async () => {
      try {
        const { data } = user.role === 'provider' ? await getProviderRequests() : await getMyRequests();
        const currentRequests = data.requests || [];
        
        if (isMounted) {
          const prev = previousRequestsRef.current;
          if (prev.length > 0) {
            currentRequests.forEach(req => {
              const oldReq = prev.find(p => p._id === req._id);
              if (!oldReq) {
                if (user.role === 'provider') {
                  playDing();
                  toast(`New Service Request received!`, { icon: '🔔', duration: 6000 });
                  showBrowserNotification('New Request', 'A new customer requested your service.');
                  setUnreadCount(c => c + 1);
                }
              } else if (oldReq.status !== req.status) {
                // If status changed and it's not a generic pending
                if (req.status !== 'pending' && req.status !== oldReq.status) {
                  playDing();
                  const msg = user.role === 'provider' 
                    ? `Request status updated to ${req.status}` 
                    : `Your request was ${req.status} by the provider!`;
                  toast(msg, { icon: '🔔', duration: 6000, style: { border: '1px solid #3b82f6', background: '#eff6ff' } });
                  showBrowserNotification('Status Update', msg);
                  setUnreadCount(c => c + 1);
                }
              }
            });
          }
          previousRequestsRef.current = currentRequests;
        }
      } catch (err) {
        // ignore network errors for background polling
      }
    };

    // Run once on mount, then poll
    checkNotifications();
    const interval = setInterval(checkNotifications, 10000); // Poll every 10 seconds
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
