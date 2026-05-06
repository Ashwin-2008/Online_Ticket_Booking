const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  serviceType: { type: String, enum: ['bus', 'train', 'movie', 'event', 'flight'], required: true },
  name: { type: String, required: true },
  source: { type: String },
  destination: { type: String },
  departureTime: { type: Date, required: true },
  arrivalTime: { type: Date },
  price: { type: Number, required: true },
  totalSeats: { type: Number, required: true },
  availableSeats: { type: Number, required: true },
  amenities: [String],
  venue: { type: String },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  image: { type: String, default: '' },
}, { timestamps: true });

serviceSchema.index({ serviceType: 1, name: 1 });
serviceSchema.index({ source: 1, destination: 1 });
serviceSchema.index({ serviceType: 1, source: 1, destination: 1, departureTime: 1 });

module.exports = mongoose.model('Service', serviceSchema);
