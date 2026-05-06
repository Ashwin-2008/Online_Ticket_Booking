const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  serviceType: {
    type: String,
    enum: ['bus', 'train', 'movie', 'event', 'flight'],
    required: true
  },
  description: { type: String },
  logo: { type: String, default: '' },
  address: { type: String },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalBookings: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
