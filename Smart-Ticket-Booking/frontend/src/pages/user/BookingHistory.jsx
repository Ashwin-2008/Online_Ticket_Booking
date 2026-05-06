import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyBookings, cancelBooking } from '../../store/slices/bookingSlice';
import { format } from 'date-fns';
import { MapPin, Clock, IndianRupee, X } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors = { confirmed: 'badge-green', cancelled: 'badge-red', pending: 'badge-yellow', completed: 'badge-blue' };
const typeLabels = { bus: 'BUS', train: 'TRAIN', movie: 'MOVIE', event: 'EVENT', flight: 'FLIGHT' };

export default function BookingHistory() {
  const dispatch = useDispatch();
  const { list: bookings, loading } = useSelector((s) => s.bookings);

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    const res = await dispatch(cancelBooking({ id, reason: 'User requested cancellation' }));
    if (res.meta.requestStatus === 'fulfilled') {
      window.dispatchEvent(new Event('bookings:changed'));
      toast.success('Booking cancelled. Refund initiated.');
    }
    else toast.error(res.payload || 'Failed to cancel');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="card h-28 animate-pulse bg-gray-100" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-500 mb-4">Bookings</p>
          <h3 className="text-xl font-bold text-gray-700">No bookings yet</h3>
          <p className="text-gray-500 mt-2">Start exploring services to book your first ticket!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-blue">{typeLabels[booking.serviceId?.serviceType]}</span>
                    <h3 className="font-bold text-gray-900">{booking.serviceId?.name}</h3>
                    <span className={statusColors[booking.status]}>{booking.status}</span>
                    {booking.bookedVia === 'chatbot' && <span className="badge bg-purple-100 text-purple-700">AI</span>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {booking.serviceId?.source && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {booking.serviceId.source} to {booking.serviceId.destination}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {booking.serviceId?.departureTime && format(new Date(booking.serviceId.departureTime), 'dd MMM yyyy, hh:mm a')}
                    </span>
                    <span>Seats: <strong>{booking.seats}</strong></span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Booking ID: {booking._id?.slice(-8).toUpperCase()} | {format(new Date(booking.createdAt), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xl font-bold text-primary-600">
                    <IndianRupee className="w-4 h-4" />
                    {booking.totalAmount}
                  </div>
                  {booking.paymentStatus === 'refunded' && <p className="text-xs text-green-600 font-medium">Refunded</p>}
                  {booking.status === 'confirmed' && (
                    <button onClick={() => handleCancel(booking._id)} className="mt-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
