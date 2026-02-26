const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const bookingService = require('../services/bookingService');

// Create new booking
const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user.id);
  res.status(201).json(new ApiResponse(201, { booking }, 'Booking created.'));
});

// Get all bookings
const getAllBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getAllBookings(req.query, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Bookings retrieved.'));
});

// Get booking by ID
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.id, req.user.role);
  res.status(200).json(new ApiResponse(200, { booking }, 'Booking retrieved.'));
});

// Get my bookings
const getMyBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getUserBookings(req.user.id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Your bookings retrieved.'));
});

// Get renter bookings
const getRenterBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getRenterBookings(req.user.id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Renter bookings retrieved.'));
});

// Update booking
const updateBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBooking(req.params.id, req.body, req.user.id, req.user.role);
  res.status(200).json(new ApiResponse(200, { booking }, 'Booking updated.'));
});

// Cancel booking
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.user.id, req.user.role, req.body.cancellationReason);
  res.status(200).json(new ApiResponse(200, { booking }, 'Booking cancelled.'));
});

// Confirm booking
const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.confirmBooking(req.params.id, req.user.id, req.user.role);
  res.status(200).json(new ApiResponse(200, { booking }, 'Booking confirmed.'));
});

// Complete booking
const completeBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.completeBooking(req.params.id, req.user.id, req.user.role);
  res.status(200).json(new ApiResponse(200, { booking }, 'Booking completed.'));
});

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  getMyBookings,
  getRenterBookings,
  updateBooking,
  cancelBooking,
  confirmBooking,
  completeBooking
};
