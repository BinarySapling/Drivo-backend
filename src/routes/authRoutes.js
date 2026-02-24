const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authValidators, userValidators } = require('../validators');
const { protect } = require('../middlewares/auth');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimiter');
const { uploadSingle, handleMulterError } = require('../middlewares/upload');

const { doubleCsrfProtection } = require('../middlewares/csrf');

// Public Routes
router.get('/csrf-token', doubleCsrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Public Routes (Rate Limited)
router.post('/register', authLimiter, otpLimiter, authValidators.register, authController.register);
router.post('/verify-otp', authLimiter, otpLimiter, authValidators.verifyOtp, authController.verifyOtp);
router.post('/login', authLimiter, authValidators.login, authController.login);

// Forgot / Reset password
router.post('/forgot-password', authLimiter, authValidators.forgotPassword, authController.forgotPassword);
router.post('/reset-password', authLimiter, authValidators.resetPassword, authController.resetPassword);

// Refresh token (no rate limit — happens silently/automatically)
router.post('/refresh-token', authController.refreshToken);

// Protected Routes
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, userValidators.updateProfile, authController.updateProfile);
router.put('/change-password', protect, userValidators.changePassword, authController.changePassword);
router.put('/avatar', protect, uploadSingle, handleMulterError, authController.updateAvatar);
router.post('/logout', protect, authController.logout);

module.exports = router;
