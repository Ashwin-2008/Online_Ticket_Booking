const Service = require('../models/Service');
const Company = require('../models/Company');

exports.createService = async (req, res, next) => {
  try {
    const company = await Company.findOne({ ownerId: req.user._id });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    if (!company.isApproved) return res.status(403).json({ success: false, message: 'Company not approved yet' });

    const service = await Service.create({
      ...req.body,
      companyId: company._id,
      serviceType: company.serviceType,
      availableSeats: req.body.totalSeats,
    });
    res.status(201).json({ success: true, service });
  } catch (err) { next(err); }
};

exports.getMyServices = async (req, res, next) => {
  try {
    const company = await Company.findOne({ ownerId: req.user._id });
    const services = await Service.find({ companyId: company._id }).sort('-createdAt');
    res.json({ success: true, services });
  } catch (err) { next(err); }
};

exports.updateService = async (req, res, next) => {
  try {
    const company = await Company.findOne({ ownerId: req.user._id });
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, companyId: company._id }, req.body, { new: true }
    );
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, service });
  } catch (err) { next(err); }
};

exports.deleteService = async (req, res, next) => {
  try {
    const company = await Company.findOne({ ownerId: req.user._id });
    await Service.findOneAndDelete({ _id: req.params.id, companyId: company._id });
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) { next(err); }
};

exports.searchServices = async (req, res, next) => {
  try {
    const {
      type,
      name,
      city,
      venue,
      source,
      destination,
      date,
      seats = 1,
    } = req.query;

    const query = buildSearchQuery({
      serviceType: type,
      name,
      city,
      venue,
      source,
      destination,
      date,
      seats,
    });

    const services = await Service.find(query)
      .populate('companyId', 'name serviceType logo isApproved')
      .sort('price');

    const filtered = services.filter(s => s.companyId?.isApproved);
    res.json({ success: true, services: filtered });
  } catch (err) { next(err); }
};

function buildSearchQuery({ serviceType, name, city, venue, source, destination, date, seats = 1 }) {
  const query = { isActive: true, availableSeats: { $gte: Number(seats) } };

  if (serviceType) query.serviceType = serviceType;

  if (name) {
    query.name = new RegExp(escapeRegex(name), 'i');
  }

  if (serviceType === 'movie') {
    const locationTerm = city || venue || source || destination;
    if (locationTerm) {
      query.venue = new RegExp(escapeRegex(locationTerm), 'i');
    }
  } else {
    if (source) query.source = new RegExp(escapeRegex(source), 'i');
    if (destination) query.destination = new RegExp(escapeRegex(destination), 'i');
    if (city && !source && !destination) {
      query.$or = [
        { source: new RegExp(escapeRegex(city), 'i') },
        { destination: new RegExp(escapeRegex(city), 'i') },
      ];
    }
  }

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    query.departureTime = { $gte: start, $lt: end };
  }

  return query;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate('companyId', 'name logo serviceType');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, service });
  } catch (err) { next(err); }
};
