import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then((res) => {
          setUser(res.data.user);
          if (res.data.provider) setProvider(res.data.provider);
        })
        .catch((err) => {
          console.error("Failed to fetch user profile during auth context initialization:", err.message);
          // Only clear user state locally so it forces login, but DO NOT maliciously delete the token 
          // from localStorage unless the API specifically returned 401 (which api.js already handles).
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
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
