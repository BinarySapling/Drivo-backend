const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const reviewService = require('../services/reviewService');

/**
 * @desc    Create a review
 * @route   POST /api/v1/reviews
 * @access  Private (USER)
 */
const createReview = asyncHandler(async (req, res) => {
    const review = await reviewService.createReview(req.user._id, req.body);
    res.status(201).json(new ApiResponse(201, { review }, 'Review submitted successfully'));
});

/**
 * @desc    Get all reviews for a car
 * @route   GET /api/v1/reviews/car/:carId
 * @access  Public
 */
const getCarReviews = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await reviewService.getCarReviews(req.params.carId, { page, limit });
    res.status(200).json(new ApiResponse(200, result, 'Reviews retrieved successfully'));
});

/**
 * @desc    Get current user's reviews
 * @route   GET /api/v1/reviews/my-reviews
 * @access  Private
 */
const getMyReviews = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await reviewService.getMyReviews(req.user._id, { page, limit });
    res.status(200).json(new ApiResponse(200, result, 'Your reviews retrieved successfully'));
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/v1/reviews/:id
 * @access  Private (owner or ADMIN/SUPERADMIN)
 */
const deleteReview = asyncHandler(async (req, res) => {
    const result = await reviewService.deleteReview(req.params.id, req.user._id, req.user.role);
    res.status(200).json(new ApiResponse(200, result, 'Review deleted successfully'));
});

module.exports = { createReview, getCarReviews, getMyReviews, deleteReview };
