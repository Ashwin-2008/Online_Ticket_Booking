const axios = require('axios');
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
require('../models/Company');

const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000;
const TRAVEL_TYPES = ['bus', 'train', 'flight'];
const SERVICE_TYPES = ['bus', 'train', 'movie', 'event', 'flight'];
const CITIES = [
  'mumbai', 'delhi', 'chennai', 'bangalore', 'bengaluru', 'hyderabad',
  'kolkata', 'pune', 'salem', 'coimbatore', 'madurai', 'trichy', 'ooty',
  'dubai', 'singapore', 'london', 'goa',
];
const MOVIE_INTENTS = ['show_movies', 'book_movie', 'ask_available_dates', 'ask_available_cities'];
const MOVIE_HINTS = ['movie', 'film', 'cinema', 'show', 'screening', 'ticket'];

exports.chat = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const user = await getUserFromRequest(req);
    const baseSessionKey = sessionId || 'default';
    const sessionKey = user ? `user:${user._id}:${baseSessionKey}` : `guest:${baseSessionKey}`;
    const session = getSession(sessionKey);

    let nlp = await getNlpResult(message, sessionKey);
    const localNlp = fallbackNLP(message);
    const text = message.toLowerCase().trim();
    nlp = normalizeNlpResult(nlp, localNlp, text);

    if (isReset(text)) {
      sessions.delete(sessionKey);
      return res.json({
        success: true,
        intent: 'reset',
        confidence: 1,
        entities: {},
        response: 'Done. Tell me what you want to book next.',
        services: [],
      });
    }

    if (nlp.intent === 'booking_status') {
      return res.json(await bookingStatusResponse(user, nlp));
    }

    if (nlp.intent === 'cancel_booking') {
      return res.json(await cancelGuidanceResponse(user, nlp));
    }

    if (nlp.intent === 'select_result' || looksLikeSelection(text)) {
      return res.json(selectResultResponse(session, nlp));
    }

    if (nlp.intent === 'confirm_booking') {
      return res.json(confirmSelectionResponse(session, user, nlp));
    }

    const mergedEntities = mergeEntities(session.entities, nlp.entities || {}, text);
    session.last_service_type = mergedEntities.service_type || session.last_service_type || null;
    session.last_movie_name = mergedEntities.movie_name || session.last_movie_name || null;
    session.last_date = mergedEntities.date || session.last_date || null;
    session.last_city = mergedEntities.city || session.last_city || null;
    session.entities = mergedEntities;
    session.lastIntent = nlp.intent;
    session.updatedAt = Date.now();

    if (isDateAvailabilityQuestion(text)) {
      const availability = await buildAvailableDatesResponse(mergedEntities);
      session.lastServices = availability.services.map(s => s.toObject ? s.toObject() : s);
      session.step = availability.services.length ? 'awaiting_selection' : 'search_complete';
      return res.json({
        success: true,
        ...nlp,
        intent: 'ask_available_dates',
        entities: { ...mergedEntities, missing: [] },
        ...availability,
      });
    }

    if ([...MOVIE_INTENTS, 'book_ticket', 'search_service'].includes(nlp.intent) || hasSearchContext(mergedEntities)) {
      const missing = getMissingSlots(mergedEntities);
      if (missing.length > 0) {
        session.step = `ask_${missing[0]}`;
        return res.json({
          success: true,
          ...nlp,
          entities: { ...mergedEntities, missing },
          response: promptForSlot(missing[0], mergedEntities),
          services: [],
        });
      }

      const services = await searchServices(mergedEntities, session);
      session.lastServices = services.map(s => s.toObject ? s.toObject() : s);
      session.step = services.length ? 'awaiting_selection' : 'search_complete';

      if (!services.length && mergedEntities.service_type === 'movie') {
        const fallback = await buildMovieFallbackResponse(mergedEntities, session);
        session.lastServices = fallback.services.map(s => s.toObject ? s.toObject() : s);
        session.step = fallback.services.length ? 'awaiting_selection' : 'search_complete';
        return res.json(fallback);
      }

      return res.json({
        success: true,
        ...nlp,
        entities: { ...mergedEntities, missing: [] },
        response: buildSearchResponse(services, mergedEntities),
        services,
      });
    }

    res.json({ success: true, ...nlp, services: [] });
  } catch (err) { next(err); }
};

async function getNlpResult(message, sessionKey) {
  try {
    const { data } = await axios.post(`${process.env.CHATBOT_URL}/chat`, {
      message,
      session_id: sessionKey,
    }, { timeout: 10000 });
    return data;
  } catch {
    return fallbackNLP(message);
  }
}

function getSession(sessionKey) {
  cleanupSessions();
  if (!sessions.has(sessionKey)) {
    sessions.set(sessionKey, {
      entities: {},
      lastServices: [],
      selectedService: null,
      step: 'idle',
      updatedAt: Date.now(),
      last_service_type: null,
      last_movie_name: null,
      last_date: null,
      last_city: null,
    });
  }
  return sessions.get(sessionKey);
}

function normalizeNlpResult(remoteNlp, localNlp, text) {
  const remoteEntities = remoteNlp.entities || {};
  const localEntities = localNlp.entities || {};
  const fresh = isFreshSearch(text, localEntities);
  const localType = localEntities.service_type;
  const remoteType = remoteEntities.service_type;
  const useLocalType = fresh && localType && localType !== remoteType;
  const entities = {
    ...remoteEntities,
    filters: {
      ...(remoteEntities.filters || {}),
      ...(localEntities.filters || {}),
    },
  };

  if (useLocalType) {
    entities.service_type = localType;
  }

  for (const key of ['source', 'destination', 'date', 'city']) {
    if (localEntities[key]) entities[key] = localEntities[key];
  }

  if (fresh && localEntities.movie_name !== remoteEntities.movie_name) {
    entities.movie_name = localEntities.movie_name || null;
  } else if (localEntities.movie_name && !remoteEntities.movie_name) {
    entities.movie_name = localEntities.movie_name;
  }

  if (localEntities.seats && mentionsSeats(text)) entities.seats = localEntities.seats;
  if (localEntities.selection) entities.selection = localEntities.selection;

  return {
    ...remoteNlp,
    intent: useLocalType ? localNlp.intent : remoteNlp.intent,
    entities,
  };
}

function cleanupSessions() {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL) sessions.delete(key);
  }
}

async function getUserFromRequest(req) {
  const token = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.split(' ')[1]
    : null;
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id).select('-password');
  } catch {
    return null;
  }
}

function mergeEntities(previous = {}, current = {}, text = '') {
  const detectedType = detectServiceType(text);
  const dateAvailabilityQuestion = isDateAvailabilityQuestion(text);
  const explicitServiceType = detectedType || (dateAvailabilityQuestion ? previous.service_type : current.service_type);
  const startsFreshSearch = isFreshSearch(text, current);
  const shouldCarryContext = dateAvailabilityQuestion || !startsFreshSearch;
  const merged = shouldCarryContext ? { ...previous } : {};
  const currentFilters = current.filters || {};

  for (const key of ['service_type', 'source', 'destination', 'date', 'movie_name', 'city']) {
    if (current[key]) merged[key] = current[key];
  }
  if (explicitServiceType) merged.service_type = explicitServiceType;
  if (dateAvailabilityQuestion && previous.service_type && !detectedType) {
    merged.service_type = previous.service_type;
    if (previous.service_type !== 'movie') delete merged.movie_name;
    delete merged.date;
  }
  if (merged.service_type && merged.service_type !== 'movie') {
    delete merged.movie_name;
  }

  if (current.seats && (!previous.seats || mentionsSeats(text))) merged.seats = current.seats;
  if (!merged.seats) merged.seats = 1;

  if (!merged.service_type && (current.movie_name || (shouldCarryContext && previous.movie_name) || /\b(movie|film|cinema)\b/.test(text))) {
    merged.service_type = 'movie';
  }
  // inherit previous movie only for direct follow-ups (not for generic "show movies" requests)
  const isShowRequest = /\b(show|list|display|find|movies|movie(s)?\s+running)\b/.test(text);
  if (shouldCarryContext && merged.service_type === 'movie' && !merged.movie_name && previous.movie_name && !isShowRequest) {
    merged.movie_name = previous.movie_name;
  }
  if (shouldCarryContext && !merged.city && previous.city) merged.city = previous.city;
  if (shouldCarryContext && !merged.date && previous.date && /^(today|tomorrow|tonight|this weekend|next week|day after tomorrow|day after)$/.test(text)) {
    merged.date = previous.date;
  }

  merged.filters = { ...(shouldCarryContext ? previous.filters || {} : {}), ...currentFilters };
  if (current.selection) merged.selection = current.selection;

  return merged;
}

function isDateAvailabilityQuestion(text = '') {
  return /\b(what|which|show|shows|list|available|all)\b.*\bdates?\b/.test(text)
    || /\bdates?\b.*\b(available|have|you have|show|list|all)\b/.test(text);
}

function isFreshSearch(text, current = {}) {
  if (current.service_type && /\b(book|reserve|buy|show|find|search|available|need|want)\b/.test(text)) return true;
  if (/\b(book|reserve|buy|show|find|search|available)\b/.test(text) && /\b(bus|buses|train|trains|flight|flights|movie|movies|event|events|concert|comedy|cinema|film)\b/.test(text)) {
    return true;
  }
  if (/\b(i want|i need|i'd like)\b/.test(text) && /\b(ticket|tickets|seat|seats|pass|passes)\b/.test(text)) return true;
  return false;
}

function mentionsSeats(text) {
  return /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(ticket|seat|pass|person|people|passenger)s?\b/.test(text);
}

function hasSearchContext(entities) {
  return SERVICE_TYPES.includes(entities.service_type)
    || entities.source
    || entities.destination
    || entities.date
    || entities.movie_name
    || entities.city;
}

function getMissingSlots(entities) {
  if (!entities.service_type) return ['service_type'];

  const missing = [];
  if (entities.service_type === 'movie') {
    if (!entities.movie_name && !entities.date && !entities.city) {
      missing.push('movie_name');
    }
    return missing;
  }

  if (TRAVEL_TYPES.includes(entities.service_type)) {
    const hasSearchHint = Boolean(entities.date || Object.keys(entities.filters || {}).length);
    if (!hasSearchHint && !entities.source) missing.push('source');
    if (!hasSearchHint && !entities.destination) missing.push('destination');
    if (!hasSearchHint && !entities.date) missing.push('date');
  }
  if (!entities.seats) missing.push('seats');
  return missing;
}

function promptForSlot(slot, entities) {
  const prompts = {
    service_type: 'What type of ticket do you want: bus, train, flight, movie, or event?',
    movie_name: 'Which movie are you looking for?',
    source: `From which city should I search for your ${entities.service_type} ticket?`,
    destination: 'Where do you want to go?',
    date: 'Which date should I search for?',
    seats: 'How many seats do you need?',
  };
  return prompts[slot] || 'Tell me one more detail so I can search properly.';
}

async function searchServices(entities) {
  const seats = Number(entities.seats || 1);
  const query = { isActive: true, availableSeats: { $gte: seats } };
  const filters = entities.filters || {};

  if (entities.service_type) query.serviceType = entities.service_type;
  if (entities.service_type === 'movie') {
    if (entities.movie_name) query.name = new RegExp(escapeRegex(entities.movie_name), 'i');
    const city = entities.city || entities.source || entities.destination;
    if (city) query.venue = new RegExp(escapeRegex(city), 'i');
  } else if (entities.service_type === 'event') {
    const city = entities.city || entities.source || entities.destination;
    if (city) {
      const cityRegex = new RegExp(escapeRegex(city), 'i');
      query.$or = [{ source: cityRegex }, { venue: cityRegex }];
    }
  } else {
    if (entities.source) query.source = new RegExp(escapeRegex(entities.source), 'i');
    if (entities.destination) query.destination = new RegExp(escapeRegex(entities.destination), 'i');
  }
  if (filters.max_price) query.price = { ...(query.price || {}), $lte: Number(filters.max_price) };
  if (filters.min_price) query.price = { ...(query.price || {}), $gte: Number(filters.min_price) };
  if (filters.amenities?.length) query.amenities = { $all: filters.amenities.map(a => new RegExp(escapeRegex(a), 'i')) };

  if (entities.date) {
    const start = new Date(entities.date);
    const end = new Date(entities.date);

    if (filters.time_window) {
      start.setHours(filters.time_window.start, 0, 0, 0);
      end.setHours(filters.time_window.end, 0, 0, 0);
      if (filters.time_window.end === 24) end.setDate(start.getDate() + 1);
    } else {
      end.setDate(end.getDate() + 1);
    }

    query.departureTime = { $gte: start, $lt: end };
  }

  const sort = getSort(filters.sort);
  const services = await Service.find(query)
    .populate('companyId', 'name isApproved logo')
    .sort(sort)
    .limit(8);

  return dedupeServices(services.filter(s => s.companyId?.isApproved));
}

async function buildAvailableDatesResponse(entities) {
  if (!entities.service_type) {
    return {
      response: 'Tell me what type of ticket you want first: bus, train, flight, movie, or event.',
      services: [],
      availableDates: [],
    };
  }

  const query = {
    isActive: true,
    serviceType: entities.service_type,
    availableSeats: { $gte: Number(entities.seats || 1) },
  };
  const filters = entities.filters || {};

  if (entities.service_type === 'movie') {
    if (entities.movie_name) query.name = new RegExp(escapeRegex(entities.movie_name), 'i');
    const city = entities.city || entities.source || entities.destination;
    if (city) query.venue = new RegExp(escapeRegex(city), 'i');
  } else if (entities.service_type === 'event') {
    const city = entities.city || entities.source || entities.destination;
    if (city) {
      const cityRegex = new RegExp(escapeRegex(city), 'i');
      query.$or = [{ source: cityRegex }, { venue: cityRegex }];
    }
  } else {
    if (entities.source) query.source = new RegExp(escapeRegex(entities.source), 'i');
    if (entities.destination) query.destination = new RegExp(escapeRegex(entities.destination), 'i');
  }

  if (filters.max_price) query.price = { ...(query.price || {}), $lte: Number(filters.max_price) };
  if (filters.min_price) query.price = { ...(query.price || {}), $gte: Number(filters.min_price) };
  if (filters.amenities?.length) query.amenities = { $all: filters.amenities.map(a => new RegExp(escapeRegex(a), 'i')) };

  const services = dedupeServices((await Service.find(query)
    .populate('companyId', 'name isApproved logo')
    .sort({ departureTime: 1, price: 1 })
    .limit(12)).filter(s => s.companyId?.isApproved));
  const availableDates = uniqueDates(services);

  if (!availableDates.length) {
    return {
      response: buildNoMatchResponse({ ...entities, date: null }),
      services: [],
      availableDates: [],
    };
  }

  const label = availabilityLabel(entities);
  return {
    response: `${label} available on:\n\n${formatBullets(availableDates.slice(0, 8))}`,
    services,
    availableDates,
  };
}

function availabilityLabel(entities) {
  const type = entities.service_type === 'movie'
    ? entities.movie_name || movieFilterLabel(entities.filters) || 'Movies'
    : `${titleCase(entities.service_type)} options`;
  if (entities.source && entities.destination) return `${type} from ${entities.source} to ${entities.destination}`;
  if (entities.destination) return `${type} to ${entities.destination}`;
  if (entities.city) return `${type} in ${entities.city}`;
  return type;
}

function dedupeServices(services = []) {
  const seen = new Set();
  return services.filter((service) => {
    const key = service.serviceType === 'movie' || service.serviceType === 'event'
      ? [service.serviceType, service.name, service.venue || '', new Date(service.departureTime).getTime(), service.price].join('|')
      : [service.serviceType, service.name, service.source || '', service.destination || '', new Date(service.departureTime).getTime(), service.price].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSort(sort) {
  if (sort === 'cheapest') return { price: 1, departureTime: 1 };
  if (sort === 'latest') return { departureTime: -1, price: 1 };
  return { departureTime: 1, price: 1 };
}

function buildSearchResponse(services, entities) {
  if (!services.length) {
    if (entities.service_type === 'movie') {
      return buildMovieNoMatchResponse(entities, []);
    }
    return buildNoMatchResponse(entities);
  }

  if (entities.service_type === 'movie') {
    return buildMovieSuccessResponse(services, entities);
  }

  const route = entities.source && entities.destination ? ` from ${entities.source} to ${entities.destination}` : '';
  const date = entities.date ? ` on ${entities.date}` : '';
  const filterText = describeFilters(entities.filters);
  return `I found ${services.length} ${entities.service_type} option${services.length > 1 ? 's' : ''}${route}${date}${filterText}. You can click Book Now, or say "book first one", "cheapest one", or "earliest one".`;
}

function describeFilters(filters = {}) {
  const parts = [];
  if (filters.max_price) parts.push(`under Rs. ${filters.max_price}`);
  if (filters.amenities?.length) parts.push(`with ${filters.amenities.join(', ')}`);
  if (filters.time_window?.label) parts.push(`in the ${filters.time_window.label}`);
  return parts.length ? ` ${parts.join(' ')}` : '';
}

function selectResultResponse(session, nlp) {
  const selection = nlp.entities?.selection || session.entities.selection;
  const services = session.lastServices || [];

  if (!services.length) {
    return {
      success: true,
      ...nlp,
      response: 'I do not have recent results to choose from yet. Search for a service first, then say "book first one".',
      services: [],
    };
  }

  const selected = pickService(services, selection);
  if (!selected) {
    return {
      success: true,
      ...nlp,
      response: `I found ${services.length} recent option${services.length > 1 ? 's' : ''}. Choose a number from 1 to ${services.length}.`,
      services,
    };
  }

  session.selectedService = selected;
  session.step = 'awaiting_confirmation';
  return {
    success: true,
    ...nlp,
    action: 'confirm_selection',
    selectedService: selected,
    response: `Confirm ${session.entities.seats || 1} seat${(session.entities.seats || 1) > 1 ? 's' : ''} for ${selected.name} at Rs. ${selected.price} per person? Say "yes" to continue, or choose another option.`,
    services: [selected],
  };
}

async function buildMovieFallbackResponse(entities, session) {
  const alternatives = await findMovieAlternatives(entities, session);
  if (!alternatives.services.length) {
    return {
      success: true,
      intent: 'ask_available_dates',
      confidence: 0.78,
      entities: { ...entities, missing: [] },
      response: buildMovieNoMatchResponse(entities, []),
      services: [],
    };
  }

  return {
    success: true,
    intent: 'ask_available_dates',
    confidence: 0.78,
    entities: { ...entities, missing: [] },
    response: alternatives.response,
    services: alternatives.services,
    availableDates: alternatives.availableDates,
    availableCities: alternatives.availableCities,
  };
}

function buildMovieSuccessResponse(services, entities) {
  const movieName = entities.movie_name || movieFilterLabel(entities.filters) || (services.length > 1 ? 'movies' : services[0]?.name || 'the movie');
  const city = entities.city || entities.source || entities.destination;
  const date = entities.date ? ` on ${entities.date}` : '';

  if (entities.service_type === 'movie' && !entities.date && !city) {
    const dates = uniqueDates(services);
    if (dates.length) {
      return `${movieName} is available on:\n\n${formatBullets(dates.slice(0, 5))}`;
    }
  }

  const lines = services.map((service) => {
    const showDate = formatDate(service.departureTime);
    const venue = service.venue ? ` at ${service.venue}` : '';
    return `${service.name}${venue} - ${showDate}`;
  });

  return `I found ${services.length} show${services.length > 1 ? 's' : ''} for ${movieName}${city ? ` in ${city}` : ''}${date}.\n\n${formatBullets(lines.slice(0, 5))}`;
}

function movieFilterLabel(filters = {}) {
  const movieFilters = (filters.amenities || []).filter((item) => ['IMAX', 'Horror', 'Action'].includes(item));
  return movieFilters.length ? `${movieFilters.join(', ')} movies` : null;
}

function buildMovieNoMatchResponse(entities, services) {
  const movieName = entities.movie_name || 'that movie';
  const dates = uniqueDates(services);
  if (dates.length) {
    return `${movieName} is not available for the requested date. Available dates:\n\n${formatBullets(dates.slice(0, 5))}`;
  }
  const city = entities.city || entities.source || entities.destination;
  const date = entities.date ? ` on ${entities.date}` : '';
  const place = city ? ` in ${city}` : '';
  const filters = describeFriendlyFilters(entities.filters);
  if (!entities.movie_name && filters) {
    return `Sorry, I couldn't find any ${filters} movie shows${place}${date}. Try another date, city, or remove that filter.`;
  }
  return `Sorry, I couldn't find shows for ${movieName}${place}${date}. Try another date, city, or movie title.`;
}

function buildNoMatchResponse(entities) {
  const typeLabel = entities.service_type || 'ticket';
  const route = entities.source && entities.destination
    ? ` from ${entities.source} to ${entities.destination}`
    : entities.destination
      ? ` to ${entities.destination}`
      : entities.source
        ? ` from ${entities.source}`
        : '';
  const date = entities.date ? ` on ${entities.date}` : '';
  const filters = describeFriendlyFilters(entities.filters);
  const filterText = filters ? ` with ${filters}` : '';
  return `Sorry, I couldn't find any ${typeLabel} options${route}${date}${filterText}. Try changing the date, city, or filters.`;
}

function describeFriendlyFilters(filters = {}) {
  const parts = [];
  if (filters.amenities?.length) parts.push(filters.amenities.join(', '));
  if (filters.max_price) parts.push(`under Rs. ${filters.max_price}`);
  if (filters.time_window?.label) parts.push(filters.time_window.label);
  return parts.join(', ');
}

async function findMovieAlternatives(entities, session) {
  const movieName = entities.movie_name || (!hasMovieSearchFilters(entities) ? session.last_movie_name || session.entities.movie_name : null);
  if (!movieName) {
    return { services: [], availableDates: [], availableCities: [], response: buildMovieNoMatchResponse(entities, []) };
  }

  const movieQuery = {
    isActive: true,
    serviceType: 'movie',
    availableSeats: { $gte: Number(entities.seats || 1) },
    name: new RegExp(escapeRegex(movieName), 'i'),
  };

  const allMatches = await Service.find(movieQuery)
    .populate('companyId', 'name isApproved logo')
    .sort({ departureTime: 1, price: 1 });

  const approved = allMatches.filter(s => s.companyId?.isApproved);
  const requestedDate = entities.date ? new Date(entities.date) : null;

  if (requestedDate) {
    const exact = approved.filter((service) => sameDay(service.departureTime, requestedDate));
    if (exact.length) {
      return {
        services: exact,
        availableDates: uniqueDates(approved),
        availableCities: uniqueCities(approved),
        response: buildMovieSuccessResponse(exact, entities),
      };
    }
  }

  const availableDates = uniqueDates(approved);
  const availableCities = uniqueCities(approved);
  const nearest = approved.slice(0, 5);

  if (requestedDate && availableDates.length) {
    return {
      services: nearest,
      availableDates,
      availableCities,
      response: `${movieName} is not available on ${entities.date}. Available dates:\n\n${formatBullets(availableDates.slice(0, 5))}`,
    };
  }

  return {
    services: nearest,
    availableDates,
    availableCities,
    response: `${movieName} is available on:\n\n${formatBullets(availableDates.slice(0, 5))}${availableCities.length ? `\n\nAvailable cities/theaters:\n\n${formatBullets(availableCities.slice(0, 5))}` : ''}`,
  };
}

function hasMovieSearchFilters(entities = {}) {
  return Boolean(entities.date || entities.city || entities.source || entities.destination || Object.keys(entities.filters || {}).length);
}

function uniqueDates(services = []) {
  return [...new Set(services.map(service => formatDate(service.departureTime)).filter(Boolean))];
}

function uniqueCities(services = []) {
  const cities = services
    .map((service) => extractCityFromVenue(service.venue) || service.source || service.destination)
    .filter(Boolean);
  return [...new Set(cities)];
}

function extractCityFromVenue(venue) {
  if (!venue) return null;
  const match = venue.match(/,\s*([A-Za-z ]+)$/);
  return match ? match[1].trim() : null;
}

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toISOString().split('T')[0];
}

function sameDay(value, date) {
  if (!value || !date) return false;
  return formatDate(value) === formatDate(date);
}

function formatBullets(items = []) {
  return items.map(item => `* ${item}`).join('\n');
}

function confirmSelectionResponse(session, user, nlp) {
  if (!session.selectedService) {
    return {
      success: true,
      ...nlp,
      response: 'Please choose an option first, for example "book first one".',
      services: session.lastServices || [],
    };
  }

  if (!user) {
    return {
      success: true,
      ...nlp,
      action: 'login_required',
      response: 'Please log in to complete this booking. I will keep this option ready for you.',
      services: [session.selectedService],
    };
  }

  return {
    success: true,
    ...nlp,
    action: 'navigate_booking',
    bookingUrl: `/book/${session.selectedService._id}`,
    response: 'Great. I am opening the booking page so you can enter passenger details and confirm payment.',
    services: [session.selectedService],
  };
}

function pickService(services, selection) {
  if (selection === 'cheapest') {
    return [...services].sort((a, b) => a.price - b.price)[0];
  }
  if (selection === 'earliest') {
    return [...services].sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime))[0];
  }

  const index = Number(selection || 1) - 1;
  return services[index] || null;
}

async function bookingStatusResponse(user, nlp) {
  if (!user) {
    return { success: true, ...nlp, response: 'Please log in so I can show your bookings.', services: [] };
  }

  const bookings = await Booking.find({ userId: user._id })
    .populate('serviceId', 'name source destination departureTime serviceType price')
    .sort('-createdAt')
    .limit(5);

  if (!bookings.length) {
    return { success: true, ...nlp, response: 'You do not have any bookings yet.', bookings: [], services: [] };
  }

  const lines = bookings.map((booking, index) => {
    const service = booking.serviceId;
    const route = service?.source ? `${service.source} to ${service.destination}` : service?.name;
    return `${index + 1}. ${service?.name || 'Service'} (${route}) - ${booking.status}, Rs. ${booking.totalAmount}`;
  });

  return {
    success: true,
    ...nlp,
    response: `Here are your latest bookings:\n${lines.join('\n')}`,
    bookings,
    services: [],
  };
}

async function cancelGuidanceResponse(user, nlp) {
  if (!user) {
    return { success: true, ...nlp, response: 'Please log in first, then open My Bookings to cancel a ticket safely.', services: [] };
  }

  const latest = await Booking.findOne({ userId: user._id, status: { $ne: 'cancelled' } })
    .populate('serviceId', 'name')
    .sort('-createdAt');

  if (!latest) {
    return { success: true, ...nlp, response: 'I could not find an active booking to cancel.', services: [] };
  }

  return {
    success: true,
    ...nlp,
    action: 'navigate_bookings',
    response: `Your latest active booking is ${latest.serviceId?.name || 'a ticket'}. Open My Bookings to review and cancel it safely.`,
    booking: latest,
    services: [],
  };
}

function fallbackNLP(message) {
  const lower = message.toLowerCase();
  let service_type = detectServiceType(lower);
  // exact matches first
  let found = CITIES.filter(c => lower.includes(c));
  // token-prefix fuzzy match for misspellings (e.g. coimabotre -> coimbatore)
  if (!found.length) {
    const tokens = lower.split(/\W+/).filter(Boolean);
    for (const city of CITIES) {
      const prefix = city.slice(0, 3);
      if (tokens.some(t => t.startsWith(prefix))) found.push(city);
      if (found.length >= 2) break;
    }
  }
  const selection = extractSelection(lower);
  const filters = extractFilters(lower);
  let movie_name = extractMovieName(message);
  const city = extractCity(message) || null;

  let intent = service_type || found.length || movie_name ? 'book_ticket' : 'general';
  if (/\b(my bookings|my tickets|booking status|upcoming trips)\b/.test(lower)) intent = 'booking_status';
  if (/\b(cancel|refund)\b/.test(lower)) intent = 'cancel_booking';
  if (selection || looksLikeSelection(lower)) intent = 'select_result';
  if (/^(yes|confirm|ok|okay|proceed|book it)$/.test(lower)) intent = 'confirm_booking';
  if (/\b(show|list|display)\b.*\bmovies?\b/.test(lower)) intent = 'show_movies';
  if (/\b(which|what)\s+dates?\b.*\b(movie|movies|for)\b/.test(lower)) intent = 'ask_available_dates';
  if (/\b(which|what)\s+cities?\b.*\b(movie|movies|for)\b/.test(lower)) intent = 'ask_available_cities';
  if (/\b(book|reserve|buy|purchase)\b.*\bmovie\b/.test(lower)) intent = 'book_movie';

  if (movie_name && /\b(movie|movies|film|cinema|show)\b/.test(lower)) {
    intent = intent === 'general' ? 'book_movie' : intent;
  }

  const seats = extractSeatCount(lower);

  // parse dates and time windows (supports today, tomorrow, weekdays, this weekend)
  const parsed = parseDateFromText(lower);
  const date = parsed ? parsed.date : null;
  const time_window = parsed ? parsed.time_window : null;

  // decide source/destination defaults based on token order if possible
  let source = null;
  let destination = null;
  if (found.length >= 2) {
    source = found[0];
    destination = found[1];
    const fromMatch = lower.match(/\bfrom\s+(\w+)/);
    const toMatch = lower.match(/\bto\s+(\w+)/);
    if (fromMatch && CITIES.includes(fromMatch[1])) source = fromMatch[1];
    if (toMatch && CITIES.includes(toMatch[1])) destination = toMatch[1];
  } else if (found.length === 1) {
    const toMatch = lower.match(/\bto\s+(\w+)/);
    const fromMatch = lower.match(/\bfrom\s+(\w+)/);
    if (toMatch && CITIES.includes(toMatch[1])) {
      destination = found[0];
      const before = lower.split('to')[0];
      const srcCandidates = CITIES.filter(c => before.includes(c));
      if (srcCandidates.length) source = srcCandidates[srcCandidates.length - 1];
    } else if (fromMatch && CITIES.includes(fromMatch[1])) {
      source = found[0];
    } else {
      destination = found[0];
    }
  }

  if (!service_type && source && destination && /\bseat|ticket|travel|go\b/.test(lower)) {
    service_type = 'bus';
  }
  if (service_type && service_type !== 'movie') movie_name = null;
  if (!service_type && movie_name) service_type = 'movie';

  return {
    intent,
    confidence: 0.7,
    response: service_type
      ? `I found your request for ${service_type} tickets. Let me search available options.`
      : `I can help you book bus, train, movie, event, or flight tickets. What would you like to book?`,
    entities: {
      service_type,
      source: source ? titleCase(source) : null,
      destination: destination ? titleCase(destination) : null,
      movie_name,
      city: city ? titleCase(city) : null,
      date,
      seats,
      filters: { ...(filters || {}), ...(time_window ? { time_window } : {}) },
      selection,
    },
  };
}

function extractMovieName(text) {
  const value = String(text || '');
  const stopWords = new Set([
    'show', 'shows', 'book', 'reserve', 'buy', 'purchase', 'watch', 'available', 'movie', 'movies', 'film',
    'ticket', 'tickets', 'for', 'of', 'about', 'of', 'of', 'today', 'tomorrow', 'tonight', 'which', 'what',
    'when', 'where', 'available', 'dates', 'date', 'cities', 'city', 'theaters', 'theatre', 'cinema', 'please',
    'find', 'horror', 'imax', 'are', 'there', 'any', 'i',
  ]);
  const patterns = [
    /\b(?:for|of|about|watch|book|reserve|buy|show|available(?:\s+dates?)?)\s+([A-Za-z0-9][A-Za-z0-9 &'\-:()]{1,80}?)\s+(?:movie|film|show|tickets?)\b/i,
    /\btickets?\s+for\s+([A-Za-z0-9][A-Za-z0-9 &'\-:()]{1,80}?)\s+(?:at|in|near)\b/i,
    /\b(?:book|reserve|buy)\s+(?:\d+\s+)?tickets?\s+for\s+([A-Za-z0-9][A-Za-z0-9 &'\-:()]{1,80}?)\s+(?:at|in|near)\b/i,
    /\b([A-Z][A-Za-z0-9&'\-]{1,40}(?:\s+[A-Z][A-Za-z0-9&'\-]{1,40}){0,4})\s+(?:movie|film)\b/,
    /\bmovie\s+([A-Z][A-Za-z0-9&'\-]{1,40}(?:\s+[A-Z][A-Za-z0-9&'\-]{1,40}){0,4})\b/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return cleanupMovieName(match[1]);
    }
  }

  const fallback = value.match(/\b([A-Z0-9][A-Za-z0-9&'\-]{0,40}(?:\s+[A-Z0-9][A-Za-z0-9&'\-]{1,40}){0,4})\b/);
  if (!fallback) return null;

  const cleaned = cleanupMovieName(fallback[1]);
  if (!cleaned || stopWords.has(cleaned.toLowerCase())) return null;
  return cleaned;
}

function cleanupMovieName(value) {
  return String(value || '')
    .replace(/\b(are\s+there\s+any|is\s+there\s+any|any)\b/gi, '')
    .replace(/^\s*(?:\d+\s+|\d+th\s+|\d+st\s+|\d+nd\s+|\d+rd\s+)?/i, '')
    .replace(/\b(movie|film|show|ticket|tickets|book|reserve|buy|watch|available|dates?|for|of|about|near|nearby|imax|find|horror)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || null;
}

function detectServiceType(lower) {
  const keywordMap = {
    bus: ['bus', 'buses', 'coach', 'sleeper bus'],
    train: ['train', 'trains', 'railway', 'rail', 'express', 'tatkal'],
    movie: ['movie', 'movies', 'film', 'cinema', 'theatre', 'theater', 'imax'],
    event: ['event', 'events', 'concert', 'comedy', 'stand-up', 'conference', 'cricket', 'match', 'festival', 'passes', 'vip'],
    flight: ['flight', 'flights', 'plane', 'airline', 'airways', 'business class'],
  };

  for (const type of SERVICE_TYPES) {
    if (keywordMap[type].some(keyword => hasKeyword(lower, keyword))) return type;
  }
  return null;
}

function hasKeyword(text, keyword) {
  return new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i').test(text);
}

// Parse relative dates and weekday references. Returns {date: 'YYYY-MM-DD', time_window: {...}} or null
function parseDateFromText(lower) {
  if (!lower) return null;
  const now = new Date();
  const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

  // time of day hints
  let time_window = null;
  if (/\bmorning\b/.test(lower)) time_window = { label: 'morning', start: 5, end: 12 };
  if (/\bafternoon\b/.test(lower)) time_window = { label: 'afternoon', start: 12, end: 17 };
  if (/\bevening\b/.test(lower)) time_window = { label: 'evening', start: 17, end: 21 };
  if (/\bnight\b|\btonight\b/.test(lower)) time_window = { label: 'night', start: 20, end: 24 };
  const afterPm = lower.match(/\bafter\s+(8|9|10|11)\s*(?:pm|p\.m\.)\b/);
  if (afterPm) time_window = { label: 'night', start: Number(afterPm[1]) + 12, end: 24 };

  if (/\btoday\b|\btonight\b|after\s+(8|9|10|11)\s*(?:pm|p\.m\.)/.test(lower)) {
    return { date: now.toISOString().split('T')[0], time_window };
  }
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return { date: d.toISOString().split('T')[0], time_window };
  }
  if (/\bday after\b/.test(lower) || /\bday after tomorrow\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 2);
    return { date: d.toISOString().split('T')[0], time_window };
  }

  // this weekend / weekend -> prefer upcoming Saturday
  if (/\bthis weekend\b|\bweekend\b/.test(lower)) {
    const todayIdx = now.getDay();
    const daysUntilSat = (6 - todayIdx + 7) % 7 || 7; // next saturday
    const d = new Date(now); d.setDate(d.getDate() + daysUntilSat);
    return { date: d.toISOString().split('T')[0], time_window };
  }

  // weekday names e.g., saturday, next friday
  for (const wd of weekdays) {
    if (new RegExp('\\bnext\\s+' + wd + '\\b').test(lower)) {
      // find next occurrence of wd (not this week)
      const target = weekdays.indexOf(wd);
      const d = new Date(now);
      const daysAhead = ((7 - now.getDay()) + target + 7) % 7 || 7;
      d.setDate(d.getDate() + daysAhead);
      return { date: d.toISOString().split('T')[0], time_window };
    }
    if (new RegExp('\\b' + wd + '\\b').test(lower)) {
      const target = weekdays.indexOf(wd);
      const d = new Date(now);
      let daysAhead = (target - d.getDay() + 7) % 7;
      if (daysAhead === 0) daysAhead = 7; // next occurrence if today
      d.setDate(d.getDate() + daysAhead);
      return { date: d.toISOString().split('T')[0], time_window };
    }
  }

  return null;
}

function extractCity(text) {
  const lower = String(text || '').toLowerCase();
  const cityMatch = CITIES.find(city => lower.includes(city));
  if (cityMatch) return cityMatch;

  // try prefix token matching (first 3 letters) to tolerate minor typos
  const tokens = lower.split(/\W+/).filter(Boolean);
  for (const city of CITIES) {
    const prefix = city.slice(0, 3);
    if (tokens.some(t => t.startsWith(prefix))) return city;
  }
  return null;
}

function extractSelection(text) {
  if (/\b(first|1st)\b/.test(text)) return 1;
  if (/\b(second|2nd)\b/.test(text)) return 2;
  if (/\b(third|3rd)\b/.test(text)) return 3;
  if (/\bcheapest\b/.test(text)) return 'cheapest';
  if (/\bearliest|fastest\b/.test(text)) return 'earliest';
  const match = text.match(/\boption\s*(\d+)\b/);
  if (match) return Number(match[1]);
  const exact = text.trim().match(/^(one|two|three|\d+)$/);
  if (!exact) return null;
  return { one: 1, two: 2, three: 3 }[exact[1]] || Number(exact[1]);
}

function extractSeatCount(text) {
  const wordMap = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const seatsMatch = text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:\w+\s+){0,3}(ticket|seat|pass|passes|person|people|passenger)s?\b/);
  if (!seatsMatch) return 1;
  return wordMap[seatsMatch[1]] || parseInt(seatsMatch[1], 10);
}

function extractFilters(text) {
  const filters = {};
  const amenities = [];
  const wantsNonAc = /\bnon[-\s]?ac\b|non air/.test(text);
  if ((/\bac\b|air\s*condition/.test(text)) && !wantsNonAc) amenities.push('AC');
  if (/sleeper/.test(text)) amenities.push('Sleeper');
  if (/wifi|wi-fi/.test(text)) amenities.push('WiFi');
  if (/charging|charger/.test(text)) amenities.push('Charging Point');
  if (/vip/.test(text)) amenities.push('VIP');
  if (/comedy|stand-up/.test(text)) amenities.push('Comedy');
  if (/music|concert/.test(text)) amenities.push('Music');
  if (/tech|conference/.test(text)) amenities.push('Tech');
  if (/cricket/.test(text)) amenities.push('Cricket');
  if (/student|college/.test(text)) amenities.push('Students');
  if (/business class/.test(text)) amenities.push('Business Class');
  if (/baggage|luggage/.test(text)) amenities.push('Baggage Included');
  if (/non[-\s]?stop/.test(text)) amenities.push('Non Stop');
  if (/horror/.test(text)) amenities.push('Horror');
  if (/action/.test(text)) amenities.push('Action');
  if (/imax/.test(text)) amenities.push('IMAX');
  if (/window/.test(text)) amenities.push('Window Seat');
  if (wantsNonAc) amenities.push('Non AC');
  if (amenities.length) filters.amenities = amenities;

  const maxPrice = text.match(/(?:under|below|less than|within|max|upto|up to)\s*(?:rs\.?|₹|inr)?\s*(\d+)/);
  if (maxPrice) filters.max_price = Number(maxPrice[1]);

  if (/morning/.test(text)) filters.time_window = { label: 'morning', start: 5, end: 12 };
  if (/afternoon/.test(text)) filters.time_window = { label: 'afternoon', start: 12, end: 17 };
  if (/evening/.test(text)) filters.time_window = { label: 'evening', start: 17, end: 21 };
  if (/night|tonight/.test(text)) filters.time_window = { label: 'night', start: 20, end: 24 };
  const afterPm = text.match(/\bafter\s+(8|9|10|11)\s*(?:pm|p\.m\.)\b/);
  if (afterPm) filters.time_window = { label: 'night', start: Number(afterPm[1]) + 12, end: 24 };

  if (/cheap|cheapest|lowest price/.test(text)) filters.sort = 'cheapest';
  if (/earliest|first available/.test(text)) filters.sort = 'earliest';
  return filters;
}

function looksLikeSelection(text) {
  return /\b(book|select|choose|pick)\b.*\b(first|second|third|1st|2nd|3rd|cheapest|earliest)\b/.test(text)
    || /\b(select|choose|pick|option)\s*(\d+)\b/.test(text)
    || /^(first|second|third|1st|2nd|3rd|one|two|three|\d+)$/.test(text);
}

function isReset(text) {
  return /^(reset|start over|clear chat|new search)$/.test(text);
}

function titleCase(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Expose internals for local testing
module.exports._test = {
  fallbackNLP,
  extractCity,
  extractMovieName,
  mergeEntities,
};
