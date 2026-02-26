const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const { carValidators, queryValidators } = require('../validators');
const { protect, authorize, checkVerified } = require('../middlewares/auth');
const { uploadMultiple, handleMulterError } = require('../middlewares/upload');

// Public routes
router.get('/', queryValidators.pagination, queryValidators.carFilters, carController.getAllCars);
router.get('/:id', carController.getCarById);

// Protected routes - Renter
router.post(
  '/',
  protect,
  authorize('RENTER'),
  checkVerified,
  uploadMultiple,
  handleMulterError,
  carValidators.createCar,
  carController.createCar
);

router.get('/renter/my-cars', protect, authorize('RENTER'), carController.getMyCars);

router.put(
  '/:id',
  protect,
  authorize('RENTER', 'ADMIN', 'SUPERADMIN'),
  carValidators.updateCar,
  carController.updateCar
);

router.delete(
  '/:id',
  protect,
  authorize('RENTER', 'ADMIN', 'SUPERADMIN'),
  carValidators.deleteCar,
  carController.deleteCar
);

router.put(
  '/:id/toggle-availability',
  protect,
  authorize('RENTER', 'ADMIN', 'SUPERADMIN'),
  carController.toggleAvailability
);

// Admin routes
router.get('/admin/pending', protect, authorize('ADMIN', 'SUPERADMIN'), carController.getPendingCars);
router.put('/:id/approve', protect, authorize('ADMIN', 'SUPERADMIN'), carValidators.approveCar, carController.approveCar);

module.exports = router;
