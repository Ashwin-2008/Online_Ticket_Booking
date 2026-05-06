import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { getMe } from '../../store/slices/authSlice';
import { Ticket, IndianRupee, Users, Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CompanyDashboard() {
  const dispatch = useDispatch();
  const { user, company } = useSelector((s) => s.auth);
  const [stats, setStats] = useState({});
  const [recentBookings, setRecentBookings] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', serviceType: 'bus', description: '', address: '' });

  useEffect(() => {
    if (company) {
      api.get('/company/dashboard').then((r) => {
        setStats(r.data.stats);
        setRecentBookings(r.data.recentBookings);
      });
    }
  }, [company]);

  const registerCompany = async (e) => {
    e.preventDefault();
    try {
      await api.post('/company/register', { ...form, email: user.email });
      toast.success('Company registered! Awaiting admin approval.');
      dispatch(getMe());
      setShowRegister(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register');
    }
  };

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="card">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Register Your Company</h2>
          <p className="text-gray-500 mb-6">Set up your company profile to start offering services.</p>
          <button onClick={() => setShowRegister(true)} className="btn-primary">
            <Plus className="w-4 h-4 inline mr-2" />Register Company
          </button>
          {showRegister && (
            <form onSubmit={registerCompany} className="mt-6 text-left space-y-4">
              <input className="input" placeholder="Company Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <select className="input" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
                {['bus', 'train', 'movie', 'event', 'flight'].map((type) => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
              <textarea className="input" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <button type="submit" className="btn-primary w-full">Submit for Approval</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!company.isApproved) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="card">
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-600 mb-4">Pending</div>
          <h2 className="text-xl font-bold mb-2">Awaiting Approval</h2>
          <p className="text-gray-500">Your company <strong>{company.name}</strong> is pending admin approval. You will be notified once approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          <p className="text-gray-500 capitalize">{company.serviceType} service provider</p>
        </div>
        <Link to="/company/services" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Service
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Services', value: stats.services, icon: Ticket, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Bookings', value: stats.bookings, icon: Users, color: 'text-green-600 bg-green-50' },
          { label: 'Revenue', value: `Rs. ${stats.revenue || 0}`, icon: IndianRupee, color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`inline-flex p-2.5 rounded-xl ${color} mb-3`}><Icon className="w-5 h-5" /></div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-bold text-lg mb-4">Recent Bookings</h2>
        {recentBookings.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No bookings yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Service</th>
                  <th className="pb-3">Seats</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="py-3">{booking.userId?.name}</td>
                    <td className="py-3">{booking.serviceId?.name}</td>
                    <td className="py-3">{booking.seats}</td>
                    <td className="py-3 font-medium text-primary-600">Rs. {booking.totalAmount}</td>
                    <td className="py-3 text-gray-400">{format(new Date(booking.createdAt), 'dd MMM')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
