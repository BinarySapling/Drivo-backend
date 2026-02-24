const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const tokenService = require('../services/tokenService');

// Helper to load user and enforce active status
const loadUser = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) throw new ApiError(401, 'User no longer exists.');
  if (user.status === 'SUSPENDED') throw new ApiError(403, 'Account suspended.');
  return user;
};

// Authentication middleware with refresh rotation
const protect = asyncHandler(async (req, res, next) => {
  const accessToken = req.cookies?.accessToken;

  // Validate access token
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      req.user = await loadUser(decoded.id);
      return next();
    } catch (err) {
      if (err.name !== 'TokenExpiredError') {
        throw new ApiError(401, 'Invalid access token.');
      }
    }
  }

  // Handle refresh token rotation
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) throw new ApiError(401, 'Not authenticated.');

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    tokenService.clearTokenCookies(res);
    throw new ApiError(401, 'Session expired.');
  }

  // Validate session against Redis
  try {
    await tokenService.validateRefreshToken(decoded.id, refreshToken);
  } catch (err) {
    await tokenService.deleteRefreshToken(decoded.id);
    tokenService.clearTokenCookies(res);
    throw new ApiError(401, err.message || 'Session invalidated.');
  }

  req.user = await loadUser(decoded.id);

  // Issue new token pair
  const newAccessToken = req.user.generateAccessToken();
  const newRefreshToken = req.user.generateRefreshToken();

  // Implement grace period for the old refreshToken before deleting from primary
  await tokenService.storeGraceToken(req.user._id.toString(), refreshToken);
  await tokenService.deleteRefreshToken(req.user._id.toString());
  await tokenService.storeRefreshToken(req.user._id.toString(), newRefreshToken);

  tokenService.setTokenCookies(res, newAccessToken, newRefreshToken);

  next();
});

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) throw new ApiError(401, 'Not authenticated.');
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied for role: ${req.user.role}`);
    }
    next();
  };
};

// Ensure renter is verified
const checkVerified = asyncHandler(async (req, res, next) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated.');
  if (req.user.role === 'RENTER' && !req.user.isVerified) {
    throw new ApiError(403, 'Renter pending verification.');
  }
  next();
});

// Optional authentication
const optionalAuth = asyncHandler(async (req, res, next) => {
  const accessToken = req.cookies?.accessToken;
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      req.user = await User.findById(decoded.id).select('-passwordHash');
    } catch {
      req.user = null;
    }
  }
  next();
});

module.exports = {
  protect,
  authorize,
  checkVerified,
  optionalAuth
};
