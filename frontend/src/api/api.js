import axios from 'axios';

// In production on Vercel, use REACT_APP_API_URL. Locally, fallback to relative /api which proxies to localhost:5000.
const API_URL = process.env.REACT_APP_API_URL || '/api';
const API = axios.create({ baseURL: API_URL });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const sendOtp = (data) => API.post('/auth/send-otp', data);
export const verifyOtp = (data) => API.post('/auth/verify-otp', data);
export const verifyFirebaseToken = (data) => API.post('/auth/verify-firebase-token', data);
export const register = (data) => API.post('/auth/register', data);
export const registerProvider = (data) => API.post('/auth/register-provider', data);
export const getMe = () => API.get('/auth/me');
export const updateLocation = (data) => API.put('/auth/update-location', data);

// Providers
export const getNearbyProviders = (params) => API.get('/providers/nearby', { params });
export const getProviderMe = () => API.get('/providers/me');
export const updateProviderProfile = (data) => API.put('/providers/me', data);
export const toggleAvailability = (data) => API.put('/providers/availability', data);
export const getProvider = (id) => API.get(`/providers/${id}`);
export const getAllProviders = () => API.get('/providers');
export const approveProvider = (id) => API.put(`/providers/${id}/approve`);
export const rejectProvider = (id) => API.delete(`/providers/${id}/reject`);

// Services
export const createRequest = (data) => API.post('/services/request', data);
export const getMyRequests = () => API.get('/services/my');
export const getProviderRequests = () => API.get('/services/provider-requests');
export const updateRequestStatus = (id, data) => API.put(`/services/${id}/status`, data);
export const rateRequest = (id, data) => API.post(`/services/${id}/rate`, data);
export const getAllRequests = () => API.get('/services');

// Emergency
export const triggerSOS = (data) => API.post('/emergency/sos', data);
export const getMyEmergencies = () => API.get('/emergency/my');
export const resolveEmergency = (id) => API.put(`/emergency/${id}/resolve`);

// Complaints
export const fileComplaint = (data) => API.post('/complaints', data);
export const getMyComplaints = () => API.get('/complaints/my');
export const getComplaint = (id) => API.get(`/complaints/${id}`);
export const getAllComplaints = () => API.get('/complaints');
export const updateComplaintStatus = (id, data) => API.put(`/complaints/${id}/status`, data);

// Users
export const getProfile = () => API.get('/users/profile');
export const updateProfile = (data) => API.put('/auth/profile', data);
export const getAllUsers = () => API.get('/users');

// Admin
export const getAdminStats = () => API.get('/admin/stats');
export const getAdminAnalytics = () => API.get('/admin/analytics');
export const getPendingProviders = () => API.get('/admin/pending-providers');
export const toggleUser = (id) => API.put(`/admin/users/${id}/toggle`);

// AI
export const chatWithAI = (data) => API.post('/ai/chat', data);

export default API;
