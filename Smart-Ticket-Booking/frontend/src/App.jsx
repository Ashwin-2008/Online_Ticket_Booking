import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './store/slices/authSlice';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AdminDashboard from './pages/admin/Dashboard';
import CompanyDashboard from './pages/company/Dashboard';
import CompanyServices from './pages/company/Services';
import UserDashboard from './pages/user/Dashboard';
import BookingPage from './pages/user/BookingPage';
import BookingHistory from './pages/user/BookingHistory';
import SearchResults from './pages/user/SearchResults';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import Navbar from './components/common/Navbar';

const ProtectedRoute = ({ children, roles }) => {
  const { user, token, loading } = useSelector(s => s.auth);
  if (!token) return <Navigate to="/login" replace />;
  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const dispatch = useDispatch();
  const { token } = useSelector(s => s.auth);

  useEffect(() => {
    if (token) dispatch(getMe());
  }, [dispatch, token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/book/:serviceId" element={<ProtectedRoute roles={['user']}><BookingPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute roles={['user']}><UserDashboard /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute roles={['user']}><BookingHistory /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/company" element={<ProtectedRoute roles={['company']}><CompanyDashboard /></ProtectedRoute>} />
        <Route path="/company/services" element={<ProtectedRoute roles={['company']}><CompanyServices /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatbotWidget />
    </div>
  );
}
