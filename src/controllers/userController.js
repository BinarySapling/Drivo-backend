const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const userService = require('../services/userService');


/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, role, status, isVerified } = req.query;

  const result = await userService.getAllUsers({ role, status, isVerified }, { page, limit });

  res.status(200).json(
    new ApiResponse(200, result, 'Users retrieved successfully')
  );
});

/**
 * @desc    Get user by ID
 * @route   GET /api/v1/users/:id
 * @access  Private/Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  res.status(200).json(
    new ApiResponse(200, { user }, 'User retrieved successfully')
  );
});

/**
 * @desc    Update user status
 * @route   PUT /api/v1/users/:id/status
 * @access  Private/Admin
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const user = await userService.updateUserStatus(req.params.id, status);

  res.status(200).json(
    new ApiResponse(200, { user }, 'User status updated successfully')
  );
});

/**
 * @desc    Verify renter
 * @route   PUT /api/v1/users/:id/verify
 * @access  Private/Admin
 */
const verifyRenter = asyncHandler(async (req, res) => {
  const user = await userService.verifyRenter(req.params.id);

  res.status(200).json(
    new ApiResponse(200, { user }, 'Renter verified successfully')
  );
});

/**
 * @desc    Get pending renters
 * @route   GET /api/v1/users/renters/pending
 * @access  Private/Admin
 */
const getPendingRenters = asyncHandler(async (req, res) => {
  const renters = await userService.getPendingRenters();

  res.status(200).json(
    new ApiResponse(200, { renters }, 'Pending renters retrieved successfully')
  );
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.params.id);

  res.status(200).json(
    new ApiResponse(200, result, 'User deleted successfully')
  );
});

/**
 * @desc    Assign role to a user
 * @route   PUT /api/v1/users/:id/role
 * @access  Private/SuperAdmin
 */
const assignRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  const user = await userService.assignRole(req.params.id, role, req.user._id);

  res.status(200).json(
    new ApiResponse(200, { user }, 'User role updated successfully')
  );
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  verifyRenter,
  getPendingRenters,
  deleteUser,
  assignRole
};
