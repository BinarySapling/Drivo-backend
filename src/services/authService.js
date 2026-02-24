const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const tokenService = require('./tokenService');
const otpService = require('./otpService');
const lockoutService = require('./lockoutService');
const { getRedisClient } = require('../config/redis');
const crypto = require('crypto');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const fs = require('fs').promises;

// ─── OTP Resend Throttle ───────────────────────────────────────────────────
const OTP_RESEND_KEY = (email) => `otp_resend:${email.toLowerCase()}`;
const OTP_RESEND_LIMIT = 3;
const OTP_RESEND_WINDOW_SECONDS = 60 * 60; // 1 hour

// Rate limit OTP resend requests
const checkOtpResendThrottle = async (email) => {
  const redis = getRedisClient();
  const key = OTP_RESEND_KEY(email);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, OTP_RESEND_WINDOW_SECONDS);
  if (count > OTP_RESEND_LIMIT) {
    throw new ApiError(429, `Too many OTP requests. Max ${OTP_RESEND_LIMIT}/hour.`);
  }
};



// ─── Strip sensitive fields from user object ───────────────────────────────
const sanitizeUser = (user) => {
  const obj = user.toObject();
  delete obj.passwordHash;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

// ══════════════════════════════════════════════════════════════════════════════

// Register new user and initiate OTP
const register = async (userData) => {
  const { name, email, password, phoneNumber } = userData;

  // Block self-assignment of ADMIN role
  const safeRole = ['ADMIN', 'SUPERADMIN'].includes(userData.role) ? 'USER' : (userData.role || 'USER');

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (existingUser.isEmailVerified) {
      // Intentionally vague — don't reveal email existence to attackers
      throw new ApiError(400, 'Unable to complete registration. Please try logging in.');
    }

    // Throttle OTP resend for unverified users
    await checkOtpResendThrottle(email);

    const otp = otpService.generateOtp();
    await otpService.storeOtp(email, otp);
    await otpService.enqueueOtpEmail(email, otp, existingUser.name);
    return {
      message: 'Registration pending. A new verification code has been sent to your email.',
      email
    };
  }

  // Create user (not verified yet)
  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role: safeRole,
    phoneNumber,
    isEmailVerified: false
  });

  // Generate OTP, store in Redis, deliver via RabbitMQ worker
  const otp = otpService.generateOtp();
  await otpService.storeOtp(email, otp);
  await otpService.enqueueOtpEmail(email, otp, name);

  return {
    message: 'Registration successful. Please check your email for a verification code.',
    email
  };
};

// ──────────────────────────────────────────────────────────────────────────────

// Verify OTP and activate account
const verifyOtp = async (email, otp, req, res) => {
  await otpService.verifyOtp(email, otp);

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');

  user.isEmailVerified = true;
  if (user.role !== 'RENTER') user.isVerified = true;
  await user.save();

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  await tokenService.storeRefreshToken(user._id.toString(), refreshToken);


  tokenService.setTokenCookies(res, accessToken, refreshToken);

  return { user: sanitizeUser(user) };
};

// ──────────────────────────────────────────────────────────────────────────────

// Login user with lockout protection
const login = async (email, password, req, res) => {
  // ── Lockout check before any DB operation ─────────────────────────────────
  const { locked, ttlSeconds } = await lockoutService.getLockoutInfo(email);
  if (locked) {
    const minutes = Math.ceil(ttlSeconds / 60);
    throw new ApiError(
      423, // 423 Locked
      `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`
    );
  }

  // ── Load user with password ───────────────────────────────────────────────
  const user = await User.findOne({ email }).select('+passwordHash');

  // Always run bcrypt compare (constant-time, prevents email enumeration via timing)
  const dummyHash = '$2a$10$abcdefghijklmnopqrstuvuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu';
  const isPasswordMatch = user
    ? await user.comparePassword(password)
    : await require('bcryptjs').compare(password, dummyHash); // dummy compare — always false

  if (!user || !isPasswordMatch) {
    // Record failure (if user exists — no point tracking non-existent emails)
    if (user) {
      const attempts = await lockoutService.recordFailedLogin(email);
      // Mirror in DB for admin visibility
      await User.updateOne({ email }, {
        $inc: { loginAttempts: 1 },
        ...(attempts >= lockoutService.MAX_ATTEMPTS && {
          lockUntil: new Date(Date.now() + lockoutService.LOCKOUT_DURATION_SECONDS * 1000)
        })
      });
    }
    throw new ApiError(401, 'Invalid email or password');
  }

  // ── Additional guards ─────────────────────────────────────────────────────
  if (user.status === 'SUSPENDED') {
    throw new ApiError(403, 'Your account has been suspended. Contact support.');
  }

  if (!user.isEmailVerified) {
    await checkOtpResendThrottle(email);
    await otpService.resendOtp(email, user.name);
    throw new ApiError(403, 'Email not verified. A new code has been sent to your email.');
  }

  // ── Successful login ──────────────────────────────────────────────────────
  // Reset lockout counter
  await lockoutService.resetLockout(email);

  // Update audit fields in DB
  const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0].trim();
  await User.updateOne({ email }, {
    loginAttempts: 0,
    lockUntil: null,
    lastLoginAt: new Date(),
    lastLoginIp: clientIp
  });

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  await tokenService.storeRefreshToken(user._id.toString(), refreshToken);


  tokenService.setTokenCookies(res, accessToken, refreshToken);

  return { user: sanitizeUser(user) };
};

// ──────────────────────────────────────────────────────────────────────────────

// Refresh and rotate access tokens
const refreshToken = async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, 'No refresh token provided. Please log in again.');
  }

  const jwt = require('jsonwebtoken');
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token. Please log in again.');
  }

  try {
    await tokenService.validateRefreshToken(decoded.id, incomingRefreshToken);
  } catch (err) {
    await tokenService.deleteRefreshToken(decoded.id);
    throw new ApiError(401, err.message);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'User not found. Please log in again.');

  const newAccessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  await tokenService.deleteRefreshToken(user._id.toString());
  await tokenService.storeRefreshToken(user._id.toString(), newRefreshToken);



  tokenService.setTokenCookies(res, newAccessToken, newRefreshToken);
  return { message: 'Token refreshed successfully' };
};

// ──────────────────────────────────────────────────────────────────────────────

// Logout user and clear tokens
const logout = async (req, res) => {
  const userId = req.user?._id?.toString();
  if (userId) await tokenService.deleteRefreshToken(userId);

  tokenService.clearTokenCookies(res);
  return { message: 'Logged out successfully' };
};

// ──────────────────────────────────────────────────────────────────────────────

const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const updateProfile = async (userId, updateData) => {
  const allowedUpdates = ['name', 'phoneNumber'];
  const updates = {};
  Object.keys(updateData).forEach((key) => {
    if (allowedUpdates.includes(key)) updates[key] = updateData[key];
  });

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true
  });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  user.passwordHash = newPassword;
  await user.save();
  return { message: 'Password changed successfully' };
};

// ──────────────────────────────────────────────────────────────────────────────

// Initiate password reset flow
const forgotPassword = async (email) => {
  const redis = getRedisClient();
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always respond identically (don't reveal whether email exists)
  if (!user || !user.isEmailVerified) {
    return { message: 'If that email is registered, you will receive a reset link shortly.' };
  }

  // Generate cryptographically secure token
  const token = crypto.randomBytes(32).toString('hex');
  const resetKey = `reset:${token}`;

  // Store token → userId in Redis (15 minutes TTL)
  await redis.setex(resetKey, 15 * 60, user._id.toString());

  // Build reset URL (frontend handles the UI)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  // Enqueue reset email via RabbitMQ (non-blocking)
  await otpService.enqueuePasswordResetEmail(user.email, user.name, resetUrl);

  return { message: 'If that email is registered, you will receive a reset link shortly.' };
};

// ──────────────────────────────────────────────────────────────────────────────

// Reset password with token
const resetPassword = async (token, newPassword) => {
  const redis = getRedisClient();
  const resetKey = `reset:${token}`;

  const userId = await redis.get(resetKey);
  if (!userId) {
    throw new ApiError(400, 'Password reset link is invalid or has expired. Please request a new one.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Update password
  user.passwordHash = newPassword;
  await user.save();

  // Invalidate reset token (one-time use)
  await redis.del(resetKey);

  // Invalidate refresh token to force re-login
  await tokenService.deleteRefreshToken(userId);

  return { message: 'Password reset successfully. Please log in with your new password.' };
};

// ──────────────────────────────────────────────────────────────────────────────

// Update user avatar image
const updateAvatar = async (userId, file) => {
  if (!file) throw new ApiError(400, 'Please upload an image file');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  try {
    // Upload new avatar
    const uploaded = await uploadImage(file.path, 'drivo/avatars');

    // Delete old avatar from Cloudinary
    if (user.avatar?.publicId) {
      await deleteImage(user.avatar.publicId).catch(() => { });
    }

    user.avatar = { url: uploaded.url, publicId: uploaded.publicId };
    await user.save();

    // Clean up temp file
    await fs.unlink(file.path).catch(() => { });

    return { avatar: user.avatar };
  } catch (error) {
    await fs.unlink(file.path).catch(() => { });
    throw error;
  }
};

module.exports = {
  register,
  verifyOtp,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  updateAvatar
};
