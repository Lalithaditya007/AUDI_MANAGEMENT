// server/routes/auth.js
const express = require('express');
// We'll need the new controller function
const { registerUser, loginUserSpecific, loginAdminSpecific, adminCreateUser } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);         // Keep registration as is
router.post('/user-login', loginUserSpecific); // New route for regular users
router.post('/admin-login', loginAdminSpecific);// New route specifically for admins

// Admin-only route to create users
router.post('/admin/create-user', protect, admin, adminCreateUser);

module.exports = router;