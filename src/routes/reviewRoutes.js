const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { reviewValidators, queryValidators } = require('../validators');
const { protect } = require('../middlewares/auth');

// Public
router.get('/car/:carId', queryValidators.pagination, reviewController.getCarReviews);

// Protected
router.use(protect);
router.post('/', reviewValidators.createReview, reviewController.createReview);
router.get('/my-reviews', queryValidators.pagination, reviewController.getMyReviews);
router.delete('/:id', reviewController.deleteReview);

module.exports = router;
