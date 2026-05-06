const User = require('../models/User');
const Company = require('../models/Company');
const Booking = require('../models/Booking');
const Service = require('../models/Service');

exports.getDashboard = async (req, res, next) => {
  try {
    const [users, companies, bookings, services] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Company.countDocuments(),
      Booking.countDocuments(),
      Service.countDocuments(),
    ]);
    const revenue = await Booking.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const recentBookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('serviceId', 'name serviceType')
      .sort('-createdAt').limit(10);

    res.json({
      success: true,
      stats: { users, companies, bookings, services, revenue: revenue[0]?.total || 0 },
      recentBookings
    });
  } catch (err) { next(err); }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: 'user' }).sort('-createdAt');
    res.json({ success: true, users });
  } catch (err) { next(err); }
};

exports.toggleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

exports.getAllCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find().populate('ownerId', 'name email').sort('-createdAt');
    res.json({ success: true, companies });
  } catch (err) { next(err); }
};

exports.approveCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id, { isApproved: true }, { new: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, company });
  } catch (err) { next(err); }
};

exports.rejectCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id, { isApproved: false, isActive: false }, { new: true }
    );
    res.json({ success: true, company });
  } catch (err) { next(err); }
};
