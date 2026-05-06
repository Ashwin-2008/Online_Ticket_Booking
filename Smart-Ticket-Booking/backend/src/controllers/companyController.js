const Company = require('../models/Company');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

exports.registerCompany = async (req, res, next) => {
  try {
    const existing = await Company.findOne({ ownerId: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'Company already registered' });

    const company = await Company.create({ ...req.body, ownerId: req.user._id });
    res.status(201).json({ success: true, company });
  } catch (err) { next(err); }
};

exports.getMyCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({ ownerId: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, company });
  } catch (err) { next(err); }
};

exports.updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findOneAndUpdate(
      { ownerId: req.user._id }, req.body, { new: true }
    );
    res.json({ success: true, company });
  } catch (err) { next(err); }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const company = await Company.findOne({ ownerId: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const [services, bookings] = await Promise.all([
      Service.countDocuments({ companyId: company._id }),
      Booking.countDocuments({ companyId: company._id }),
    ]);
    const revenue = await Booking.aggregate([
      { $match: { companyId: company._id, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const recentBookings = await Booking.find({ companyId: company._id })
      .populate('userId', 'name email')
      .populate('serviceId', 'name departureTime')
      .sort('-createdAt').limit(10);

    res.json({
      success: true,
      stats: { services, bookings, revenue: revenue[0]?.total || 0 },
      company,
      recentBookings
    });
  } catch (err) { next(err); }
};
