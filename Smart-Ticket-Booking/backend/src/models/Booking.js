const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  seats: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'paid' },
  paymentId: { type: String, default: () => `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}` },
  passengerDetails: [{
    name: String,
    age: Number,
    seatNumber: String,
  }],
  bookedVia: { type: String, enum: ['web', 'chatbot'], default: 'web' },
  cancellationReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
