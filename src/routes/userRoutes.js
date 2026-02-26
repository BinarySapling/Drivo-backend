const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { userValidators, queryValidators } = require('../validators');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);
// ADMIN and SUPERADMIN can access user management routes
router.use(authorize('ADMIN', 'SUPERADMIN'));

// Get pending renters (must be before /:id routes)
router.get('/renters/pending', userController.getPendingRenters);

// User management routes
router.get('/', queryValidators.pagination, userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id/status', userValidators.updateStatus, userController.updateUserStatus);
router.put('/:id/verify', userValidators.verifyRenter, userController.verifyRenter);
router.delete('/:id', userController.deleteUser);

// SUPERADMIN only — assign/revoke roles
router.put('/:id/role', authorize('SUPERADMIN'), userValidators.assignRole, userController.assignRole);

module.exports = router;
