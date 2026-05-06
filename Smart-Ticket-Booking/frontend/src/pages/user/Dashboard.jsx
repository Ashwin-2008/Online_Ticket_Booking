import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchMyBookings } from '../../store/slices/bookingSlice';
import { Ticket, Clock, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';

export default function UserDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { list: bookings } = useSelector((s) => s.bookings);

  useEffect(() => {
    dispatch(fetchMyBookings());
    const refresh = () => dispatch(fetchMyBookings());
    window.addEventListener('focus', refresh);
    window.addEventListener('bookings:changed', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('bookings:changed', refresh);
    };
  }, [dispatch]);

  const recent = useMemo(() => bookings.slice(0, 5), [bookings]);
  const stats = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    spent: bookings.filter((b) => b.status !== 'cancelled').reduce((sum, b) => sum + b.totalAmount, 0),
  }), [bookings]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="text-gray-500 mt-1">Here is your booking overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Bookings', value: stats.total, icon: Ticket, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active', value: stats.confirmed, icon: Clock, color: 'text-green-600 bg-green-50' },
          { label: 'Cancelled', value: stats.cancelled, icon: Ticket, color: 'text-red-600 bg-red-50' },
          { label: 'Total Spent', value: `Rs. ${stats.spent}`, icon: IndianRupee, color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`inline-flex p-2.5 rounded-xl ${color} mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Recent Bookings</h2>
            <Link to="/bookings" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No bookings yet</div>
          ) : (
            <div className="space-y-3">
              {recent.map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-sm">{booking.serviceId?.name}</p>
                    <p className="text-xs text-gray-400">
                      {booking.serviceId?.departureTime && format(new Date(booking.serviceId.departureTime), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">Rs. {booking.totalAmount}</p>
                    <span className={`badge ${booking.status === 'confirmed' ? 'badge-green' : 'badge-red'} text-xs`}>{booking.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-bold text-lg mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: 'Search Bus', href: '/search?type=bus', tag: 'BUS' },
              { label: 'Book Movie', href: '/search?type=movie', tag: 'MOVIE' },
              { label: 'Find Flights', href: '/search?type=flight', tag: 'FLIGHT' },
              { label: 'Events Near You', href: '/search?type=event', tag: 'EVENT' },
            ].map(({ label, href, tag }) => (
              <Link key={label} to={href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                <span className="badge badge-blue">{tag}</span>
                <span className="font-medium text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
