// server/routes/auth.js
const express = require('express');
// We'll need two new controller functions
const { registerUser, loginUserSpecific, loginAdminSpecific } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);         // Keep registration as is
router.post('/user-login', loginUserSpecific); // New route for regular users
router.post('/admin-login', loginAdminSpecific);// New route specifically for admins

module.exports = router;