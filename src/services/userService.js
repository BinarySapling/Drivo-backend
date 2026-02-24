const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notificationService');

/**
 * Get all users with filters and pagination
 */
const getAllUsers = async (filters = {}, options = {}) => {
  const { page = 1, limit = 10, role, status, isVerified } = { ...filters, ...options };

  const query = {};

  // Apply filters
  if (role) query.role = role;
  if (status) query.status = status;
  if (isVerified !== undefined) query.isVerified = isVerified;

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .select('-passwordHash')
    .limit(limit)
    .skip(skip)
    .sort('-createdAt');

  const total = await User.countDocuments(query);

  return {
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

/**
 * Update user status (ADMIN only)
 */
const updateUserStatus = async (userId, status) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { status },
    { new: true, runValidators: true }
  ).select('-passwordHash');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

/**
 * Verify renter (ADMIN only)
 */
const verifyRenter = async (renterId) => {
  const user = await User.findById(renterId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role !== 'RENTER') {
    throw new ApiError(400, 'User is not a renter');
  }

  if (user.isVerified) {
    throw new ApiError(400, 'Renter is already verified');
  }

  user.isVerified = true;
  await user.save();

  // Notify renter of verification
  notificationService.notifyRenterVerified(user).catch(err =>
    console.error('⚠️  notifyRenterVerified failed:', err.message)
  );

  const userObject = user.toObject();
  delete userObject.passwordHash;

  return userObject;
};

/**
 * Get pending renters (ADMIN only)
 */
const getPendingRenters = async () => {
  const renters = await User.find({
    role: 'RENTER',
    isVerified: false,
    status: 'ACTIVE'
  }).select('-passwordHash').sort('-createdAt');

  return renters;
};

/**
 * Assign a role to a user (SUPERADMIN only)
 * - Cannot change another SUPERADMIN's role
 * - Cannot change own role
 * - Target cannot be assigned SUPERADMIN via this endpoint
 */
const assignRole = async (targetUserId, newRole, requestingUserId) => {
  const ALLOWED_ROLES = ['USER', 'RENTER', 'ADMIN'];
  if (!ALLOWED_ROLES.includes(newRole)) {
    throw new ApiError(400, `Role must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }

  if (targetUserId.toString() === requestingUserId.toString()) {
    throw new ApiError(400, 'You cannot change your own role');
  }

  const target = await User.findById(targetUserId).select('-passwordHash');
  if (!target) throw new ApiError(404, 'User not found');

  if (target.role === 'SUPERADMIN') {
    throw new ApiError(403, 'Cannot change the role of another SUPERADMIN');
  }

  target.role = newRole;
  // If promoting to ADMIN, ensure account is verified
  if (newRole === 'ADMIN') {
    target.isVerified = true;
    target.isEmailVerified = true;
  }
  await target.save();

  return target;
};

/**
 * Delete user (ADMIN/SUPERADMIN only)
 */
const deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return { message: 'User deleted successfully' };
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  verifyRenter,
  getPendingRenters,
  deleteUser,
  assignRole
};

