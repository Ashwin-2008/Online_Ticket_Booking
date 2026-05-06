const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Company = require('../models/Company');
const Service = require('../models/Service');

const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  await Promise.all([User.deleteMany(), Company.deleteMany(), Service.deleteMany()]);

  const admin = await User.create({
    name: 'Super Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
  });

  const companyUser = await User.create({
    name: 'RedBus Operator',
    email: 'redbus@example.com',
    password: 'Company@123',
    role: 'company',
  });

  const company = await Company.create({
    name: 'RedBus Express',
    email: 'redbus@example.com',
    phone: '9876543210',
    serviceType: 'bus',
    description: 'Premium bus service across South India',
    isApproved: true,
    ownerId: companyUser._id,
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  await Service.insertMany([
    {
      companyId: company._id, serviceType: 'bus', name: 'Salem to Chennai Express',
      source: 'Salem', destination: 'Chennai',
      departureTime: tomorrow, arrivalTime: new Date(tomorrow.getTime() + 4 * 3600000),
      price: 350, totalSeats: 40, availableSeats: 40, amenities: ['AC', 'WiFi', 'USB Charging'],
    },
    {
      companyId: company._id, serviceType: 'bus', name: 'Chennai to Bangalore Night Rider',
      source: 'Chennai', destination: 'Bangalore',
      departureTime: new Date(tomorrow.getTime() + 43200000),
      arrivalTime: new Date(tomorrow.getTime() + 48600000),
      price: 550, totalSeats: 36, availableSeats: 36, amenities: ['AC', 'Sleeper', 'Blanket'],
    },
  ]);

  const movieUser = await User.create({
    name: 'PVR Cinemas',
    email: 'pvr@example.com',
    password: 'Company@123',
    role: 'company',
  });

  const movieCompany = await Company.create({
    name: 'PVR Cinemas',
    email: 'pvr@example.com',
    serviceType: 'movie',
    description: 'Premium movie experience',
    isApproved: true,
    ownerId: movieUser._id,
  });

  const showTime = new Date();
  showTime.setDate(showTime.getDate() + 1);
  showTime.setHours(18, 30, 0, 0);
  const leoShowTime = nextWeekday(6);
  leoShowTime.setHours(20, 0, 0, 0);

  await Service.insertMany([
    {
      companyId: movieCompany._id, serviceType: 'movie', name: 'Kalki 2898 AD',
      venue: 'PVR Phoenix Mall, Chennai',
      departureTime: showTime,
      price: 250, totalSeats: 120, availableSeats: 120,
      description: 'Epic sci-fi blockbuster',
      amenities: ['Dolby Atmos', '4K Screen', 'Recliner Seats'],
    },
    {
      companyId: movieCompany._id, serviceType: 'movie', name: 'Leo',
      venue: 'INOX Salem',
      source: 'Salem',
      departureTime: leoShowTime,
      price: 180, totalSeats: 100, availableSeats: 100,
      description: 'Action thriller',
      amenities: ['Dolby Atmos', '4K Screen'],
    },
  ]);

  console.log('✅ Database seeded successfully');
  console.log(`Admin: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
  console.log('Company: redbus@example.com / Company@123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });

function nextWeekday(targetDay) {
  const date = new Date();
  let daysAhead = (targetDay - date.getDay() + 7) % 7;
  if (daysAhead === 0) daysAhead = 7;
  date.setDate(date.getDate() + daysAhead);
  return date;
}
