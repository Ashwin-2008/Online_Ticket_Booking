import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Train, Film, Calendar, Plane, Search, Zap, Shield, Clock } from 'lucide-react';

const serviceTypes = [
  { id: 'bus', label: 'Bus', icon: Bus, color: 'bg-orange-100 text-orange-600' },
  { id: 'train', label: 'Train', icon: Train, color: 'bg-blue-100 text-blue-600' },
  { id: 'movie', label: 'Movies', icon: Film, color: 'bg-rose-100 text-rose-600' },
  { id: 'event', label: 'Events', icon: Calendar, color: 'bg-green-100 text-green-600' },
  { id: 'flight', label: 'Flights', icon: Plane, color: 'bg-sky-100 text-sky-600' },
];

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({ type: 'bus', source: '', destination: '', date: '', seats: 1 });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(search);
    navigate(`/search?${params}`);
  };

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-cyan-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm tracking-[0.3em] uppercase mb-6">
            Smart Booking Platform
          </p>
          <h1 className="text-5xl font-extrabold mb-4 leading-tight">
            Book Smarter with <span className="text-yellow-300">AI</span>
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Bus, train, movie, event and flight booking in one place with an AI assistant that understands natural language.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {serviceTypes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSearch({ ...search, type: id })}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
                  search.type === id ? 'bg-white text-primary-700 shadow-lg scale-105' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="bg-white rounded-2xl p-4 shadow-2xl max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {['bus', 'train', 'flight'].includes(search.type) && (
                <>
                  <input
                    className="input"
                    placeholder="From (e.g. Salem)"
                    value={search.source}
                    onChange={(e) => setSearch({ ...search, source: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="To (e.g. Chennai)"
                    value={search.destination}
                    onChange={(e) => setSearch({ ...search, destination: e.target.value })}
                  />
                </>
              )}
              {['movie', 'event'].includes(search.type) && (
                <input
                  className="input sm:col-span-2"
                  placeholder="Search movies or events"
                  value={search.source}
                  onChange={(e) => setSearch({ ...search, source: e.target.value })}
                />
              )}
              <input
                className="input"
                type="date"
                value={search.date}
                onChange={(e) => setSearch({ ...search, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
              <input
                className="input"
                type="number"
                min="1"
                max="10"
                placeholder="Seats"
                value={search.seats}
                onChange={(e) => setSearch({ ...search, seats: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-3 flex items-center justify-center gap-2 py-3">
              <Search className="w-5 h-5" />
              Search {serviceTypes.find((s) => s.id === search.type)?.label}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why SmartTicket?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: 'AI-Powered Booking',
              desc: 'Chat naturally to search and book tickets in seconds.',
              color: 'text-amber-500 bg-amber-50',
            },
            {
              icon: Shield,
              title: 'Secure and Reliable',
              desc: 'JWT-secured flows, role-based access, and real-time seat checks.',
              color: 'text-green-500 bg-green-50',
            },
            {
              icon: Clock,
              title: 'Instant Confirmation',
              desc: 'Get digital confirmations immediately after successful booking.',
              color: 'text-blue-500 bg-blue-50',
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card text-center hover:shadow-md transition-shadow">
              <div className={`inline-flex p-4 rounded-2xl ${color} mb-4`}>
                <Icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">All Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {serviceTypes.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => navigate(`/search?type=${id}`)}
                className="card text-center hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div className={`inline-flex p-3 rounded-xl ${color} mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="font-semibold text-gray-800">{label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
