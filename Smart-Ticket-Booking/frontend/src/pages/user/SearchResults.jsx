import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { searchServices } from '../../store/slices/serviceSlice';
import { MapPin, Clock, Users, IndianRupee, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const typeLabels = { bus: 'Bus', train: 'Train', movie: 'Movie', event: 'Event', flight: 'Flight' };

export default function SearchResults() {
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: services, loading } = useSelector((s) => s.services);
  const { user } = useSelector((s) => s.auth);

  useEffect(() => {
    const query = Object.fromEntries(params.entries());
    dispatch(searchServices(query));
  }, [dispatch, params]);

  const type = params.get('type');
  const source = params.get('source');
  const destination = params.get('destination');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {source ? `${typeLabels[type] || 'Service'}: ${source} to ${destination}` : `${typeLabels[type] || 'All'} Services`}
          </h1>
          <p className="text-gray-500 mt-1">{services.length} results found</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card h-32 animate-pulse bg-gray-100" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-500 mb-4">Search</p>
          <h3 className="text-xl font-bold text-gray-700">No services found</h3>
          <p className="text-gray-500 mt-2">Try different dates or locations</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <div key={service._id} className="card hover:shadow-md transition-all border-l-4 border-primary-500">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-blue uppercase">{typeLabels[service.serviceType]}</span>
                    <h3 className="font-bold text-gray-900">{service.name}</h3>
                    <span className="badge bg-slate-100 text-slate-700">{service.companyId?.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                    {service.source && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {service.source} to {service.destination}
                      </span>
                    )}
                    {service.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {service.venue}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(service.departureTime), 'dd MMM, hh:mm a')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {service.availableSeats} seats left
                    </span>
                  </div>
                  {service.amenities?.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {service.amenities.map((amenity) => (
                        <span key={amenity} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-2xl font-bold text-primary-600">
                    <IndianRupee className="w-5 h-5" />
                    {service.price}
                  </div>
                  <p className="text-xs text-gray-400 mb-3">per person</p>
                  <button
                    onClick={() => (user ? navigate(`/book/${service._id}`) : navigate('/login'))}
                    disabled={service.availableSeats === 0}
                    className="btn-primary flex items-center gap-2 text-sm py-2"
                  >
                    Book Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
