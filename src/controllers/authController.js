const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/authService');

// Register new user
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(new ApiResponse(201, result, result.message));
});

// Verify OTP
const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body.email, req.body.otp, req, res);
  res.status(200).json(new ApiResponse(200, result, 'Email verified successfully.'));
});

// Login user
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password, req, res);
  res.status(200).json(new ApiResponse(200, result, 'Login successful'));
});

// Refresh tokens
const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req, res);
  res.status(200).json(new ApiResponse(200, result, 'Token refreshed.'));
});

// Get current profile
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  res.status(200).json(new ApiResponse(200, { user }, 'Profile retrieved.'));
});

// Update profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  res.status(200).json(new ApiResponse(200, { user }, 'Profile updated.'));
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
  res.status(200).json(new ApiResponse(200, result, 'Password changed.'));
});

// Logout user
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req, res);
  res.status(200).json(new ApiResponse(200, null, 'Logged out.'));
});

// Forgot password
const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

// Reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

// Update avatar
const updateAvatar = asyncHandler(async (req, res) => {
  const result = await authService.updateAvatar(req.user._id, req.file);
  res.status(200).json(new ApiResponse(200, result, 'Avatar updated.'));
});

module.exports = {
  register,
  verifyOtp,
  login,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  logout,
  forgotPassword,
  resetPassword,
  updateAvatar
};
