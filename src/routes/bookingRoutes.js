const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { bookingValidators, queryValidators } = require('../validators');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// User routes
router.post('/', bookingValidators.createBooking, bookingController.createBooking);
router.get('/my-bookings', queryValidators.pagination, bookingController.getMyBookings);

// Renter routes
router.get(
  '/renter/bookings',
  authorize('RENTER', 'ADMIN', 'SUPERADMIN'),
  queryValidators.pagination,
  bookingController.getRenterBookings
);

// Common routes
router.get('/:id', bookingController.getBookingById);
router.put('/:id', bookingValidators.updateBooking, bookingController.updateBooking);
router.put('/:id/cancel', bookingValidators.cancelBooking, bookingController.cancelBooking);

// Renter/Admin routes
router.put(
  '/:id/confirm',
  authorize('RENTER', 'ADMIN', 'SUPERADMIN'),
  bookingController.confirmBooking
);
router.put(
  '/:id/complete',
  authorize('RENTER', 'ADMIN', 'SUPERADMIN'),
  bookingController.completeBooking
);

// Admin routes
router.get('/', authorize('ADMIN', 'SUPERADMIN'), queryValidators.pagination, bookingController.getAllBookings);

module.exports = router;
