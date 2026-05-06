import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createBooking, fetchMyBookings } from '../../store/slices/bookingSlice';
import api from '../../utils/api';
import { MapPin, Clock, Users, IndianRupee, CreditCard, CheckCircle, QrCode, Copy, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function BookingPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [service, setService] = useState(null);
  const [seats, setSeats] = useState(() => Math.max(1, Number(location.state?.seats || 1)));
  const [passengers, setPassengers] = useState([{ name: '', age: '' }]);
  const [loading, setLoading] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    setServiceError('');
    api.get(`/services/${serviceId}`)
      .then((r) => setService(r.data.service))
      .catch(() => setServiceError('This service is no longer available. Please search again from SmartBot or the search page.'));
  }, [serviceId]);

  useEffect(() => {
    setPassengers(Array.from({ length: seats }, (_, i) => passengers[i] || { name: '', age: '' }));
  }, [seats]);

  const handleBook = async () => {
    setLoading(true);
    const res = await dispatch(createBooking({
      serviceId,
      seats,
      passengerDetails: passengers,
      bookedVia: location.state?.fromChatbot ? 'chatbot' : 'web',
    }));
    setLoading(false);

    if (res.meta.requestStatus === 'fulfilled') {
      setBooking(res.payload);
      setStep(4);
      dispatch(fetchMyBookings());
      window.dispatchEvent(new Event('bookings:changed'));
      toast.success('Booking confirmed!');
    } else {
      toast.error(res.payload || 'Booking failed');
    }
  };

  const totalAmount = service ? service.price * seats : 0;
  const paymentRef = `ST${serviceId?.slice(-6).toUpperCase()}${seats}${totalAmount}`;
  const upiUrl = service
    ? `upi://pay?pa=smartticket@upi&pn=SmartTicket&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(paymentRef)}`
    : '';

  const copyPaymentRef = async () => {
    try {
      await navigator.clipboard.writeText(paymentRef);
      toast.success('Payment reference copied');
    } catch {
      toast.error('Could not copy reference');
    }
  };

  if (serviceError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Could not open booking</h2>
          <p className="text-gray-500 mb-6">{serviceError}</p>
          <button onClick={() => navigate('/search')} className="btn-primary">Search Services</button>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center gap-4 mb-8">
        {['Select Seats', 'Passenger Details', 'Payment', 'Confirmation'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > i + 1 ? 'OK' : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${step === i + 1 ? 'text-primary-600' : 'text-gray-400'}`}>{label}</span>
            {i < 3 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {step === 4 && booking ? (
        <div className="card text-center animate-bounce-in">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 mb-6">
            Your booking ID: <span className="font-mono font-bold text-primary-600">{booking._id?.slice(-8).toUpperCase()}</span>
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Service</span><span className="font-medium">{service.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Seats</span><span className="font-medium">{seats}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Amount Paid</span><span className="font-bold text-green-600">Rs. {booking.totalAmount}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment ID</span><span className="font-mono text-xs">{booking.paymentId}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/bookings')} className="btn-primary flex-1">View My Bookings</button>
            <button onClick={() => navigate('/')} className="btn-secondary flex-1">Back to Home</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="card border-l-4 border-primary-500">
            <h3 className="font-bold text-lg text-gray-900 mb-3">{service.name}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              {service.source && service.destination && <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-primary-500" />{service.source} to {service.destination}</span>}
              {service.venue && <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-primary-500" />{service.venue}</span>}
              <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-primary-500" />{format(new Date(service.departureTime), 'dd MMM yyyy, hh:mm a')}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4 text-primary-500" />{service.availableSeats} seats available</span>
            </div>
          </div>

          {step === 1 && (
            <div className="card">
              <h3 className="font-bold text-lg mb-4">Select Seats</h3>
              <div className="flex items-center gap-4 mb-6">
                <label className="text-sm font-medium text-gray-700">Number of Seats:</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSeats(Math.max(1, seats - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">-</button>
                  <span className="text-xl font-bold w-8 text-center">{seats}</span>
                  <button onClick={() => setSeats(Math.min(service.availableSeats, seats + 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold">+</button>
                </div>
              </div>
              <div className="bg-primary-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-gray-600">Total Amount</span>
                <span className="text-2xl font-bold text-primary-600 flex items-center gap-1">
                  <IndianRupee className="w-5 h-5" />
                  {service.price * seats}
                </span>
              </div>
              <button onClick={() => setStep(2)} className="btn-primary w-full mt-4">Continue</button>
            </div>
          )}

          {step === 2 && (
            <div className="card">
              <h3 className="font-bold text-lg mb-4">Passenger Details</h3>
              <div className="space-y-4">
                {passengers.map((passenger, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-600 mb-3">Passenger {i + 1}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="input"
                        placeholder="Full Name"
                        value={passenger.name}
                        onChange={(e) => {
                          const next = [...passengers];
                          next[i].name = e.target.value;
                          setPassengers(next);
                        }}
                        required
                      />
                      <input
                        className="input"
                        type="number"
                        placeholder="Age"
                        value={passenger.age}
                        onChange={(e) => {
                          const next = [...passengers];
                          next[i].age = e.target.value;
                          setPassengers(next);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between text-sm mb-2"><span>Seats x {seats}</span><span>Rs. {service.price} x {seats}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span className="text-primary-600">Rs. {totalAmount}</span></div>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(3)} disabled={passengers.some((p) => !p.name)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-lg">Scan and Pay</h3>
              </div>

              <div className="grid md:grid-cols-[220px_1fr] gap-6 items-center">
                <div className="mx-auto">
                  <DemoQrCode value={paymentRef} />
                </div>

                <div className="space-y-4">
                  <div className="bg-primary-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Amount to pay</p>
                    <p className="text-3xl font-bold text-primary-600 flex items-center gap-1">
                      <IndianRupee className="w-6 h-6" />
                      {totalAmount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">UPI ID</p>
                    <p className="font-semibold text-gray-900">smartticket@upi</p>
                    <p className="text-xs uppercase tracking-wide text-gray-400 mt-3 mb-1">Reference</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">{paymentRef}</code>
                      <button onClick={copyPaymentRef} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600" title="Copy reference">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <a href={upiUrl} className="btn-secondary w-full flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4" />
                    Open UPI App
                  </a>
                </div>
              </div>

              <div className="mt-5 p-4 bg-green-50 rounded-xl flex items-start gap-3 text-sm text-green-700">
                <ShieldCheck className="w-5 h-5 mt-0.5" />
                <p>After payment, click confirm below. This demo records the booking as paid and updates your dashboard immediately.</p>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleBook} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {loading ? 'Verifying Payment...' : 'I Have Paid'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DemoQrCode({ value }) {
  const cells = Array.from({ length: 225 }, (_, index) => {
    const x = index % 15;
    const y = Math.floor(index / 15);
    const finder =
      (x < 5 && y < 5) ||
      (x > 9 && y < 5) ||
      (x < 5 && y > 9);
    const finderInner =
      ((x === 1 || x === 2 || x === 3) && (y === 1 || y === 2 || y === 3)) ||
      ((x === 11 || x === 12 || x === 13) && (y === 1 || y === 2 || y === 3)) ||
      ((x === 1 || x === 2 || x === 3) && (y === 11 || y === 12 || y === 13));
    const hash = value.split('').reduce((sum, char, charIndex) => sum + char.charCodeAt(0) * (charIndex + 1), 0);
    const active = finder ? (x === 0 || x === 4 || y === 0 || y === 4 || finderInner) : ((x * 17 + y * 31 + hash) % 5 < 2);
    return <span key={index} style={{ backgroundColor: active ? '#020617' : '#ffffff' }} />;
  });

  return (
    <div className="p-3 rounded-xl border border-slate-700 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
      <div className="grid grid-cols-[repeat(15,10px)] grid-rows-[repeat(15,10px)] gap-0.5">
        {cells}
      </div>
    </div>
  );
}
