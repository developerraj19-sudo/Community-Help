import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch { return null; }
  });
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(false); // No need to block rendering if we have cached data

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Silently update user profile in the background without blocking the UI
      getMe()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user)); // sync cache
          if (res.data.provider) setProvider(res.data.provider);
        })
        .catch((err) => {
          console.error("Background profile sync failed:", err.message);
          // DO NOT setUser(null) here. If it's a real 401 token expiry, 
          // api.js interceptor will automatically clear localStorage and redirect.
          // If it's just a network error or server restart, let them use cached data!
        });
    }
  }, []);

  const loginUser = (token, userData, providerData = null) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    if (providerData) setProvider(providerData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProvider(null);
  };

  return (
    <AuthContext.Provider value={{ user, provider, loading, loginUser, logout, setUser, setProvider }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
