import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyServices } from '../../store/slices/serviceSlice';
import api from '../../utils/api';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const emptyForm = { name: '', source: '', destination: '', venue: '', departureTime: '', arrivalTime: '', price: '', totalSeats: '', description: '', amenities: '' };

export default function CompanyServices() {
  const dispatch = useDispatch();
  const { myServices } = useSelector((s) => s.services);
  const { company } = useSelector((s) => s.auth);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    dispatch(fetchMyServices());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean) };
    try {
      if (editing) {
        await api.put(`/services/${editing}`, payload);
        toast.success('Service updated!');
      } else {
        await api.post('/services', payload);
        toast.success('Service created!');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditing(null);
      dispatch(fetchMyServices());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleEdit = (service) => {
    setForm({
      ...service,
      amenities: service.amenities?.join(', ') || '',
      departureTime: service.departureTime?.slice(0, 16),
      arrivalTime: service.arrivalTime?.slice(0, 16) || '',
    });
    setEditing(service._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    await api.delete(`/services/${id}`);
    toast.success('Service deleted');
    dispatch(fetchMyServices());
  };

  const isTransport = ['bus', 'train', 'flight'].includes(company?.serviceType);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
        <button onClick={() => { setShowModal(true); setForm(emptyForm); setEditing(null); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {myServices.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary-500 mb-4">Services</p>
          <h3 className="text-xl font-bold text-gray-700">No services yet</h3>
          <p className="text-gray-500 mt-2">Add your first service to start accepting bookings.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {myServices.map((service) => (
            <div key={service._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{service.name}</h3>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1 flex-wrap">
                    {service.source && <span>{service.source} to {service.destination}</span>}
                    {service.venue && <span>Venue: {service.venue}</span>}
                    <span>Time: {format(new Date(service.departureTime), 'dd MMM, hh:mm a')}</span>
                    <span>Seats: {service.availableSeats}/{service.totalSeats}</span>
                    <span className="font-medium text-primary-600">Rs. {service.price}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(service)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(service._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editing ? 'Edit Service' : 'Add New Service'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input className="input" placeholder="Service Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              {isTransport ? (
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="Source City" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                  <input className="input" placeholder="Destination City" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                </div>
              ) : (
                <input className="input" placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Departure Time</label>
                  <input className="input" type="datetime-local" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} required />
                </div>
                {isTransport && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Arrival Time</label>
                    <input className="input" type="datetime-local" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input" type="number" placeholder="Price (Rs.)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                <input className="input" type="number" placeholder="Total Seats" value={form.totalSeats} onChange={(e) => setForm({ ...form, totalSeats: e.target.value })} required />
              </div>
              <input className="input" placeholder="Amenities (comma separated)" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
              <textarea className="input" placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
