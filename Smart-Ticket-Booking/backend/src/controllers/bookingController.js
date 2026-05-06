const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Company = require('../models/Company');

exports.createBooking = async (req, res, next) => {
  try {
    const { serviceId, seats, passengerDetails, bookedVia } = req.body;
    const seatCount = Number(seats);
    if (!seatCount || seatCount < 1) {
      return res.status(400).json({ success: false, message: 'Please select at least one seat' });
    }

    const service = await Service.findOneAndUpdate(
      { _id: serviceId, isActive: true, availableSeats: { $gte: seatCount } },
      { $inc: { availableSeats: -seatCount } },
      { new: true }
    );
    if (!service) {
      return res.status(400).json({ success: false, message: 'Service unavailable or not enough seats available' });
    }

    try {
      const totalAmount = service.price * seatCount;
      const booking = await Booking.create({
        userId: req.user._id,
        serviceId,
        companyId: service.companyId,
        seats: seatCount,
        totalAmount,
        passengerDetails,
        bookedVia: bookedVia || 'web',
      });

      await Company.findByIdAndUpdate(service.companyId, {
        $inc: { totalBookings: 1, totalRevenue: totalAmount }
      });

      const populated = await booking.populate([
        { path: 'serviceId', select: 'name source destination venue departureTime price serviceType image' },
        { path: 'companyId', select: 'name' }
      ]);

      res.status(201).json({ success: true, booking: populated });
    } catch (error) {
      await Service.findByIdAndUpdate(serviceId, { $inc: { availableSeats: seatCount } });
      throw error;
    }
  } catch (err) { next(err); }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('serviceId', 'name source destination venue departureTime price serviceType image')
      .populate('companyId', 'name logo')
      .sort('-createdAt');
    res.json({ success: true, bookings });
  } catch (err) { next(err); }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status === 'cancelled')
      return res.status(400).json({ success: false, message: 'Already cancelled' });

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    booking.cancellationReason = req.body.reason || 'User cancelled';
    await booking.save();

    await Service.findByIdAndUpdate(booking.serviceId, { $inc: { availableSeats: booking.seats } });
    await Company.findByIdAndUpdate(booking.companyId, {
      $inc: { totalBookings: -1, totalRevenue: -booking.totalAmount }
    });

    res.json({ success: true, booking });
  } catch (err) { next(err); }
};

exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('serviceId')
      .populate('companyId', 'name logo phone')
      .populate('userId', 'name email phone');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (err) { next(err); }
};
