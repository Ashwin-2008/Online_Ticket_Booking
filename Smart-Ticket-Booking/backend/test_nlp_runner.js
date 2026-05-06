const path = require('path');
const controller = require('./src/controllers/chatController');
const t = controller._test;

const tests = [
  // MOVIE BOOKING TESTS
  'Book 3 tickets for Kalki movie in Chennai tomorrow evening',
  'I want two seats for Leo movie this Saturday night',
  'Show all movies running today in Salem',
  'Book movie tickets for Avengers near Coimbatore for 4 people',
  'Are there any IMAX movie shows available tomorrow?',
  'Find horror movies playing tonight in Chennai',
  'Reserve 5 tickets for Kalki at PVR Phoenix Mall',
  'Which theaters are showing Leo movie this weekend?',
  'Cancel my movie booking for tomorrow night',
  'What movie bookings do I currently have?',
  // BUS BOOKING
  'Book 2 AC sleeper bus tickets from Salem to Chennai tomorrow morning',
  'Find cheap buses from Bangalore to Hyderabad this Friday',
  'I need one window seat from Madurai to Coimbatore tonight',
  'Show overnight buses from Chennai to Trichy',
  'Are sleeper buses available to Bangalore tomorrow?',
  'Book tickets for my family from Salem to Ooty on Sunday',
  'Cancel my bus booking to Chennai',
  'Show buses under 500 rupees from Salem to Chennai',
  'Find buses with WiFi and charging point',
  'What time is the earliest bus to Bangalore tomorrow?',
  // FLIGHT
  'Book 2 flight tickets from Chennai to Dubai next Monday',
  'Show cheapest flights to Delhi this weekend',
  'I need evening flights from Bangalore to Mumbai tomorrow',
  'Find non-stop flights from Chennai to Singapore',
  'Book business class tickets to London for 3 passengers',
  'Are there any flights available after 8 PM tonight?',
  'Cancel my Dubai flight booking',
  'Show return flights from Delhi to Chennai next week',
  'Find flights with baggage included',
  'What flights are available to Goa tomorrow morning?',
  // TRAIN
  'Book 4 train tickets from Chennai to Madurai for tomorrow',
  'Show available sleeper class trains tonight',
  'Find trains reaching Bangalore before 6 AM',
  'I need Tatkal tickets to Hyderabad',
  'Are there any trains with available lower berths?',
  'Book tickets for Chennai Express this Saturday',
  'Cancel my train reservation for Sunday',
  'Find trains under 300 rupees',
  'Show trains departing after 10 PM',
  'What is the fastest train to Coimbatore?',
  // EVENT
  'Book 2 VIP passes for AR Rahman concert in Chennai',
  'Show comedy events happening this weekend',
  'Find music concerts near Bangalore tomorrow',
  'Are there any tech conferences this month?',
  'Reserve seats for stand-up comedy tonight',
  'Book event tickets under 1000 rupees',
  'Show available events for college students',
  'Cancel my concert booking',
  'Find cricket match tickets in Chennai',
  'Which events are trending this week?',
  // Context / Memory quick checks
  'Book Kalki movie tickets',
  'Tomorrow',
  'Chennai',
  'Show buses to Bangalore',
  'Only sleeper buses',
  'Tomorrow night',
  'For 3 passengers',
  // Edge cases
  'Book something for tomorrow',
  'I want tickets but not too expensive',
  'Show me available options',
  'Can you help me travel to Chennai?',
  'I need 10 tickets urgently',
  'Book tickets for next weekend evening',
  'Any available seats left?',
  'I forgot my booking ID',
  'Show my recent bookings',
  'I want to change my booking date',
];

function print(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

(async () => {
  for (const msg of tests) {
    try {
      const out = t.fallbackNLP(msg);
      console.log('\n=== INPUT:', msg);
      print(out);
    } catch (err) {
      console.error('Error processing:', msg, err && err.stack);
    }
  }
})();
