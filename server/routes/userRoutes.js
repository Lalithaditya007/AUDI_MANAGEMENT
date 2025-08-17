const express = require('express');
const router = express.Router();
const { getAllUsers, deleteUser } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all users (admin only)
router.get('/', protect, admin, getAllUsers);
// Delete user by id (admin only)
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;
