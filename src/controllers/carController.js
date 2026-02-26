const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const carService = require('../services/carService');

// Get all cars with filters
const getAllCars = asyncHandler(async (req, res) => {
  const result = await carService.getAllCars(req.query, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Cars retrieved.'));
});

// Get car by ID
const getCarById = asyncHandler(async (req, res) => {
  const car = await carService.getCarById(req.params.id);
  res.status(200).json(new ApiResponse(200, { car }, 'Car retrieved.'));
});

// Create new car
const createCar = asyncHandler(async (req, res) => {
  const car = await carService.createCar(req.body, req.files, req.user.id);
  res.status(201).json(new ApiResponse(201, { car }, 'Car created. Pending approval.'));
});

// Update car
const updateCar = asyncHandler(async (req, res) => {
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
  const car = await carService.updateCar(req.params.id, req.body, req.user.id, isAdmin);
  res.status(200).json(new ApiResponse(200, { car }, 'Car updated.'));
});

// Delete car
const deleteCar = asyncHandler(async (req, res) => {
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
  const result = await carService.deleteCar(req.params.id, req.user.id, isAdmin);
  res.status(200).json(new ApiResponse(200, result, 'Car deleted.'));
});

// Approve car
const approveCar = asyncHandler(async (req, res) => {
  const car = await carService.approveCar(req.params.id);
  res.status(200).json(new ApiResponse(200, { car }, 'Car approved.'));
});

// Get renter's cars
const getMyCarsdHandler = asyncHandler(async (req, res) => {
  const result = await carService.getRenterCars(req.user.id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Your cars retrieved.'));
});

// Get pending approval cars
const getPendingCars = asyncHandler(async (req, res) => {
  const cars = await carService.getPendingCars();
  res.status(200).json(new ApiResponse(200, { cars }, 'Pending cars retrieved.'));
});

// Toggle car availability
const toggleAvailability = asyncHandler(async (req, res) => {
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
  const car = await carService.toggleAvailability(req.params.id, req.user.id, isAdmin);
  res.status(200).json(new ApiResponse(200, { car }, `Car ${car.isAvailable ? 'available' : 'unavailable'}`));
});

module.exports = {
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
  approveCar,
  getMyCars: getMyCarsdHandler,
  getPendingCars,
  toggleAvailability
};
