const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Company = require('../models/Company');
const Service = require('../models/Service');
const connectDB = require('../config/db');

const DEMO_MARKER = '[Chatbot test data]';

const companyConfigs = {
  bus: {
    name: 'SmartBus Travels',
    email: 'smartbus@example.com',
    phone: '9000001001',
    description: 'Demo bus services for chatbot testing',
  },
  train: {
    name: 'Smart Railways',
    email: 'smartrail@example.com',
    phone: '9000001002',
    description: 'Demo train services for chatbot testing',
  },
  flight: {
    name: 'SmartJet Airways',
    email: 'smartjet@example.com',
    phone: '9000001003',
    description: 'Demo flight services for chatbot testing',
  },
  movie: {
    name: 'Smart Cinemas',
    email: 'smartcinemas@example.com',
    phone: '9000001004',
    description: 'Demo movie shows for chatbot testing',
  },
  event: {
    name: 'Smart Events',
    email: 'smartevents@example.com',
    phone: '9000001005',
    description: 'Demo events for chatbot testing',
  },
};

async function seedChatbotTestData() {
  await connectDB();

  const companies = {};
  for (const [serviceType, config] of Object.entries(companyConfigs)) {
    const owner = await upsertCompanyUser(config);
    companies[serviceType] = await upsertCompany(serviceType, config, owner._id);
  }

  await Service.deleteMany({ description: new RegExp(escapeRegex(DEMO_MARKER)) });
  await Service.insertMany(buildServices(companies));

  const counts = await Service.aggregate([
    { $match: { description: new RegExp(escapeRegex(DEMO_MARKER)) } },
    { $group: { _id: '$serviceType', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log('Chatbot test data seeded successfully.');
  counts.forEach(({ _id, count }) => console.log(`${_id}: ${count}`));
  await mongoose.disconnect();
}

async function upsertCompanyUser(config) {
  const password = await bcrypt.hash('Company@123', 10);
  return User.findOneAndUpdate(
    { email: config.email },
    {
      $set: {
        name: config.name,
        email: config.email,
        password,
        role: 'company',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertCompany(serviceType, config, ownerId) {
  return Company.findOneAndUpdate(
    { email: config.email },
    {
      $set: {
        name: config.name,
        email: config.email,
        phone: config.phone,
        serviceType,
        description: config.description,
        isApproved: true,
        isActive: true,
        ownerId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function buildServices(companies) {
  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  const friday = nextWeekday(5);
  const saturday = nextWeekday(6);
  const sunday = nextWeekday(0);
  const monday = nextWeekday(1);
  const nextFriday = nextWeekday(5, true);
  const nextWeekend = addDays(saturday, 7);

  return [
    movie(companies.movie, 'Kalki 2898 AD', 'PVR Phoenix Mall, Chennai', tomorrow, 18, 0, 250, 120, ['Action', 'Sci-Fi', 'IMAX', 'Recliner Seats']),
    movie(companies.movie, 'Kalki 2898 AD', 'PVR Phoenix Mall, Chennai', tomorrow, 19, 30, 260, 100, ['Action', 'Sci-Fi', 'Dolby Atmos']),
    movie(companies.movie, 'Leo', 'INOX Salem', saturday, 20, 0, 180, 100, ['Action', 'Thriller', 'Dolby Atmos']),
    movie(companies.movie, 'Leo', 'INOX Salem', saturday, 22, 0, 200, 80, ['Action', 'Thriller']),
    movie(companies.movie, 'Avengers Endgame', 'KG Cinemas, Coimbatore', tomorrow, 18, 45, 240, 110, ['Action', 'IMAX', '4K Screen']),
    movie(companies.movie, 'Avengers Endgame', 'Brookefields Cinema, Coimbatore', saturday, 20, 30, 260, 90, ['Action', 'IMAX']),
    movie(companies.movie, 'IMAX Special Screening', 'PVR Phoenix Mall, Chennai', tomorrow, 20, 0, 300, 75, ['IMAX', 'Action']),
    movie(companies.movie, 'Horror Night', 'Escape Cinemas, Chennai', today, 21, 30, 210, 95, ['Horror', 'Dolby Atmos']),
    movie(companies.movie, 'Action Blast', 'ARRS Multiplex, Salem', today, 17, 30, 160, 100, ['Action']),
    movie(companies.movie, 'Salem Action Show', 'INOX Salem', today, 20, 15, 180, 100, ['Action']),

    service(companies.bus, 'Salem to Chennai AC Sleeper', 'bus', 'Salem', 'Chennai', tomorrow, 8, 0, 420, 40, ['AC', 'Sleeper', 'WiFi', 'Charging Point']),
    service(companies.bus, 'Salem to Chennai Non AC Budget Express', 'bus', 'Salem', 'Chennai', tomorrow, 10, 0, 350, 45, ['Non AC', 'WiFi', 'Charging Point']),
    service(companies.bus, 'Bangalore to Hyderabad Cheap Rider', 'bus', 'Bangalore', 'Hyderabad', friday, 7, 30, 499, 40, ['AC']),
    service(companies.bus, 'Madurai to Coimbatore Night Sleeper', 'bus', 'Madurai', 'Coimbatore', today, 21, 30, 520, 36, ['Sleeper', 'AC', 'Window Seat']),
    service(companies.bus, 'Chennai to Trichy Overnight Sleeper', 'bus', 'Chennai', 'Trichy', today, 22, 15, 480, 38, ['Sleeper', 'AC']),
    service(companies.bus, 'Chennai to Bangalore Night Rider', 'bus', 'Chennai', 'Bangalore', tomorrow, 22, 0, 650, 36, ['Sleeper', 'AC']),
    service(companies.bus, 'Salem to Bangalore Sleeper Coach', 'bus', 'Salem', 'Bangalore', tomorrow, 21, 0, 600, 36, ['Sleeper', 'AC']),
    service(companies.bus, 'Salem to Ooty Family Coach', 'bus', 'Salem', 'Ooty', sunday, 9, 0, 450, 42, ['AC', 'Family']),
    service(companies.bus, 'City WiFi Charging Shuttle', 'bus', 'Salem', 'Chennai', tomorrow, 11, 30, 390, 30, ['WiFi', 'Charging Point']),

    service(companies.flight, 'SmartJet Chennai to Dubai', 'flight', 'Chennai', 'Dubai', monday, 9, 30, 25000, 180, ['Baggage Included', 'Meals']),
    service(companies.flight, 'SmartJet Chennai to Dubai Business', 'flight', 'Chennai', 'Dubai', nextFriday, 18, 30, 42000, 24, ['Business Class', 'Baggage Included', 'Meals']),
    service(companies.flight, 'SmartJet Bangalore to Mumbai Evening', 'flight', 'Bangalore', 'Mumbai', tomorrow, 18, 0, 6500, 150, ['Baggage Included']),
    service(companies.flight, 'SmartJet Chennai to Singapore Non Stop', 'flight', 'Chennai', 'Singapore', tomorrow, 23, 0, 18000, 160, ['Non Stop', 'Baggage Included']),
    service(companies.flight, 'SmartJet Chennai to London Business', 'flight', 'Chennai', 'London', nextFriday, 19, 30, 68000, 20, ['Business Class', 'Baggage Included']),
    service(companies.flight, 'SmartJet Chennai to Delhi Weekend Saver', 'flight', 'Chennai', 'Delhi', saturday, 8, 30, 5200, 160, ['Baggage Included']),
    service(companies.flight, 'SmartJet Bangalore to Goa Morning', 'flight', 'Bangalore', 'Goa', tomorrow, 9, 0, 4800, 120, ['Baggage Included']),
    service(companies.flight, 'SmartJet Mumbai to Goa Morning', 'flight', 'Mumbai', 'Goa', tomorrow, 10, 0, 4500, 120, ['Baggage Included']),
    service(companies.flight, 'SmartJet Late Night Connector', 'flight', 'Chennai', 'Delhi', today, 21, 15, 7000, 120, ['Baggage Included']),

    service(companies.train, 'Chennai Express', 'train', 'Chennai', 'Madurai', tomorrow, 6, 0, 300, 160, ['Sleeper', 'Lower Berth']),
    service(companies.train, 'Chennai Express Saturday Special', 'train', 'Chennai', 'Madurai', saturday, 7, 0, 320, 140, ['Sleeper']),
    service(companies.train, 'Night Sleeper Special', 'train', 'Chennai', 'Bangalore', today, 22, 30, 280, 120, ['Sleeper', 'Lower Berth']),
    service(companies.train, 'Bangalore Early Arrival Express', 'train', 'Chennai', 'Bangalore', tomorrow, 23, 0, 450, 120, ['Sleeper']),
    service(companies.train, 'Hyderabad Tatkal Express', 'train', 'Chennai', 'Hyderabad', tomorrow, 20, 0, 650, 80, ['Tatkal', 'Sleeper']),
    service(companies.train, 'Lower Berth Superfast', 'train', 'Chennai', 'Coimbatore', tomorrow, 8, 30, 290, 100, ['Lower Berth']),
    service(companies.train, 'Budget Passenger Train', 'train', 'Salem', 'Coimbatore', tomorrow, 14, 0, 180, 200, ['General']),
    service(companies.train, 'Late Night Coimbatore Express', 'train', 'Chennai', 'Coimbatore', today, 22, 45, 420, 100, ['Sleeper']),
    service(companies.train, 'Fast Coimbatore Intercity', 'train', 'Chennai', 'Coimbatore', tomorrow, 6, 30, 380, 120, ['AC Chair Car']),

    event(companies.event, 'AR Rahman Live Concert', 'Nehru Stadium Chennai', 'Chennai', saturday, 19, 0, 1500, 500, ['VIP', 'Music', 'Concert']),
    event(companies.event, 'Stand-Up Comedy Night', 'Coimbatore Hall', 'Coimbatore', today, 21, 0, 600, 200, ['Comedy']),
    event(companies.event, 'Weekend Comedy Festival', 'Chennai Comedy Club', 'Chennai', saturday, 18, 0, 800, 150, ['Comedy', 'Weekend']),
    event(companies.event, 'Bangalore Music Fest', 'Bangalore Palace Grounds', 'Bangalore', tomorrow, 18, 30, 900, 300, ['Music', 'Concert']),
    event(companies.event, 'Tech Future Conference', 'Chennai Trade Centre', 'Chennai', addDays(today, 14), 10, 0, 999, 250, ['Tech', 'Conference', 'Students']),
    event(companies.event, 'College Students Open Mic', 'Coimbatore Hall', 'Coimbatore', friday, 17, 0, 300, 120, ['Students', 'Comedy']),
    event(companies.event, 'Chennai Cricket Match', 'Chepauk Stadium Chennai', 'Chennai', sunday, 16, 0, 950, 1000, ['Cricket', 'Sports']),
    event(companies.event, 'Trending Food and Music Carnival', 'Island Grounds Chennai', 'Chennai', nextWeekend, 17, 30, 700, 600, ['Trending', 'Music', 'Food']),
  ];
}

function service(company, name, serviceType, source, destination, day, hour, minute, price, seats, amenities = []) {
  const departureTime = at(day, hour, minute);
  const arrivalTime = addHours(departureTime, serviceType === 'flight' ? 3 : 6);
  return {
    companyId: company._id,
    serviceType,
    name,
    source,
    destination,
    departureTime,
    arrivalTime,
    price,
    totalSeats: seats,
    availableSeats: seats,
    amenities,
    description: `${DEMO_MARKER} ${name}`,
    isActive: true,
  };
}

function movie(company, name, venue, day, hour, minute, price, seats, amenities = []) {
  return {
    companyId: company._id,
    serviceType: 'movie',
    name,
    venue,
    source: cityFromVenue(venue),
    departureTime: at(day, hour, minute),
    price,
    totalSeats: seats,
    availableSeats: seats,
    amenities,
    description: `${DEMO_MARKER} ${name}`,
    isActive: true,
  };
}

function event(company, name, venue, source, day, hour, minute, price, seats, amenities = []) {
  return {
    companyId: company._id,
    serviceType: 'event',
    name,
    venue,
    source,
    departureTime: at(day, hour, minute),
    price,
    totalSeats: seats,
    availableSeats: seats,
    amenities,
    description: `${DEMO_MARKER} ${name}`,
    isActive: true,
  };
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(value, days) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function addHours(value, hours) {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function nextWeekday(targetDay, skipCurrentWeek = false) {
  const date = startOfToday();
  let daysAhead = (targetDay - date.getDay() + 7) % 7;
  if (daysAhead === 0 || skipCurrentWeek) daysAhead += 7;
  return addDays(date, daysAhead);
}

function at(day, hour, minute) {
  const value = new Date(day);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function cityFromVenue(venue) {
  const parts = String(venue).split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : undefined;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

seedChatbotTestData().catch((err) => {
  console.error(err);
  process.exit(1);
});
