const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { createBooking, getMyBookings, cancelBooking, getBookingById } = require('../controllers/bookingController');

router.use(protect);
router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBookingById);
router.put('/:id/cancel', cancelBooking);

module.exports = router;
