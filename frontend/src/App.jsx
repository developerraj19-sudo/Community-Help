import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AIChatbot from './components/shared/AIChatbot';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProviderRegisterPage from './pages/ProviderRegisterPage';
import UserDashboard from './pages/UserDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import EmergencyPage from './pages/EmergencyPage';
import UtilityServicesPage from './pages/UtilityServicesPage';
import PoliceComplaintPage from './pages/PoliceComplaintPage';
import TrackingPage from './pages/TrackingPage';
import ProfilePage from './pages/ProfilePage';
import ServiceHistoryPage from './pages/ServiceHistoryPage';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  // Force Google Translate to re-evaluate the DOM when the route changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const gtSelect = document.querySelector('.goog-te-combo');
      if (gtSelect && document.cookie.includes('googtrans=')) {
        // Dispatching a change event triggers Google Translate to scan for new elements
        gtSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 300); // Wait for React to finish mounting the new page components
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/" element={user ? <Navigate to={`/${user.role}-dashboard`} /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to={`/${user.role}-dashboard`} /> : <LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-provider" element={<ProviderRegisterPage />} />
        <Route path="/user-dashboard" element={<PrivateRoute roles={['user']}><UserDashboard /></PrivateRoute>} />
        <Route path="/provider-dashboard" element={<PrivateRoute roles={['provider']}><ProviderDashboard /></PrivateRoute>} />
        <Route path="/admin-dashboard" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
        <Route path="/emergency" element={<PrivateRoute roles={['user']}><EmergencyPage /></PrivateRoute>} />
        <Route path="/utility-services" element={<PrivateRoute roles={['user']}><UtilityServicesPage /></PrivateRoute>} />
        <Route path="/police-complaint" element={<PrivateRoute roles={['user']}><PoliceComplaintPage /></PrivateRoute>} />
        <Route path="/track/:id" element={<PrivateRoute roles={['user']}><TrackingPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><ServiceHistoryPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {user && <AIChatbot />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px', fontFamily: 'Inter', fontSize: '14px' } }} />
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
