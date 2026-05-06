import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Users, Building2, Ticket, IndianRupee, CheckCircle, XCircle, ToggleLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('overview');
  const [recentBookings, setRecentBookings] = useState([]);

  const loadDashboard = () => {
    api.get('/admin/dashboard').then((r) => {
      setStats(r.data.stats);
      setRecentBookings(r.data.recentBookings);
    });
  };

  useEffect(() => {
    loadDashboard();
    api.get('/admin/companies').then((r) => setCompanies(r.data.companies));
    api.get('/admin/users').then((r) => setUsers(r.data.users));
  }, []);

  const approveCompany = async (id) => {
    await api.put(`/admin/companies/${id}/approve`);
    toast.success('Company approved!');
    api.get('/admin/companies').then((r) => setCompanies(r.data.companies));
  };

  const rejectCompany = async (id) => {
    await api.put(`/admin/companies/${id}/reject`);
    toast.success('Company rejected');
    api.get('/admin/companies').then((r) => setCompanies(r.data.companies));
  };

  const toggleUser = async (id) => {
    await api.put(`/admin/users/${id}/toggle`);
    api.get('/admin/users').then((r) => setUsers(r.data.users));
  };

  const tabs = ['overview', 'companies', 'users'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === item ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Users', value: stats.users, icon: Users, color: 'text-blue-600 bg-blue-50' },
              { label: 'Companies', value: stats.companies, icon: Building2, color: 'text-purple-600 bg-purple-50' },
              { label: 'Bookings', value: stats.bookings, icon: Ticket, color: 'text-green-600 bg-green-50' },
              { label: 'Services', value: stats.services, icon: Ticket, color: 'text-orange-600 bg-orange-50' },
              { label: 'Revenue', value: `Rs. ${stats.revenue || 0}`, icon: IndianRupee, color: 'text-emerald-600 bg-emerald-50' },
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3">User</th>
                    <th className="pb-3">Service</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentBookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="py-3">{booking.userId?.name}</td>
                      <td className="py-3">{booking.serviceId?.name}</td>
                      <td className="py-3 font-medium">Rs. {booking.totalAmount}</td>
                      <td className="py-3"><span className={`badge ${booking.status === 'confirmed' ? 'badge-green' : 'badge-red'}`}>{booking.status}</span></td>
                      <td className="py-3 text-gray-400">{format(new Date(booking.createdAt), 'dd MMM')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'companies' && (
        <div className="card">
          <h2 className="font-bold text-lg mb-4">Companies ({companies.length})</h2>
          <div className="space-y-3">
            {companies.map((company) => (
              <div key={company._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-bold">{company.name}</p>
                  <p className="text-sm text-gray-500">{company.email} | {company.serviceType}</p>
                  <p className="text-xs text-gray-400">Owner: {company.ownerId?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${company.isApproved ? 'badge-green' : 'badge-yellow'}`}>
                    {company.isApproved ? 'Approved' : 'Pending'}
                  </span>
                  {!company.isApproved && (
                    <>
                      <button onClick={() => approveCompany(company._id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => rejectCompany(company._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <h2 className="font-bold text-lg mb-4">Users ({users.length})</h2>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-bold">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${user.isActive ? 'badge-green' : 'badge-red'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                  <button onClick={() => toggleUser(user._id)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg">
                    <ToggleLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
