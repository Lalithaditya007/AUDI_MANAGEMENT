// server/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Department = require('../models/Department'); // Fetch Departments on registration - adjust if needed
const Auditorium = require('../models/Auditorium'); // Fetch Auditoriums on registration - adjust if needed

// --- Helper: Generate JWT Token ---
const generateToken = (id) => {
    // Use environment variables for secret and expiration
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d', // Use env var or default
    });
};

// --- Helper: Find User and Verify Password ---
// This checks credentials but doesn't enforce role here. Role check happens in specific login controllers.
const findAndVerifyUser = async (identifier, password) => {
    if (!identifier || !password) {
        return { error: 'Identifier and password required', user: null };
    }

    let user;
    // Case-insensitive search for email or username
    if (identifier.includes('@')) {
        user = await User.findOne({ email: identifier.toLowerCase() }).select('+password');
    } else {
        // Allow finding by username too, maybe make case-insensitive if desired
        user = await User.findOne({ username: identifier }).select('+password');
        // Alternative case-insensitive username search:
        // user = await User.findOne({ username: { $regex: `^${identifier}$`, $options: 'i' } }).select('+password');
    }

    // User not found
    if (!user) {
        console.log(`Login check: User not found with identifier "${identifier}"`);
        return { error: 'Invalid credentials', user: null }; // Consistent error message
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        console.log(`Login check: Password mismatch for identifier "${identifier}" (User ID: ${user._id})`);
        return { error: 'Invalid credentials', user: null }; // Consistent error message
    }

    // Credentials are valid
    console.log(`Login check: Credentials VALID for identifier "${identifier}" (User ID: ${user._id})`);
    return { error: null, user }; // Return the user object (with password still selected)
};


// --- Register User ---
exports.registerUser = async (req, res, next) => {
    const { username, email, password, role } = req.body; // Role is optional from body, defaults to 'user' below

    // Basic input validation
    if (!username || !email || !password) {
         return res.status(400).json({ success: false, message: 'Please provide username, email, and password' });
     }

    try {
        // Check if user already exists (case-insensitive email)
        let existingUser = await User.findOne({
           $or: [ { email: email.toLowerCase() }, { username: username } ]
         });

        if (existingUser) {
             let message = 'User already exists with this ';
            if (existingUser.email === email.toLowerCase() && existingUser.username === username) message += 'email and username.';
             else if (existingUser.email === email.toLowerCase()) message += 'email.';
             else message += 'username.';
            return res.status(400).json({ success: false, message: message });
        }

         // Create new user - Explicitly set role to 'user' unless admin intends otherwise
        // Allowing role from body is risky unless registration is admin-controlled. Defaulting to 'user' is safer.
        const newUser = await User.create({
            username,
            email, // Schema handles lowercase
            password, // Schema pre-save hook handles hashing
            role: 'user' // Hardcode role to 'user' for public registration for security
             // If admins need to create other admins, use a separate admin endpoint/tool
        });

        // Don't send password back, even hashed
        const userResponse = {
           _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role
        };

        // Generate token for immediate login after registration
        const token = generateToken(newUser._id);

        // Respond with success, token, and user info
        res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            token,
            user: userResponse,
            // Optionally include initial dropdown data if useful after registration
            // initialData: { auditoriums: /* fetch data */, departments: /* fetch data */ }
        });

    } catch (error) {
        console.error("[Error] Registration failed:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ success: false, message: `Validation Error: ${messages.join(', ')}` });
        }
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).json({ success: false, message: 'Email or username is already taken.' });
        }
        // Generic server error
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};


// --- Login User (User Role Enforced) ---
exports.loginUserSpecific = async (req, res, next) => {
    const { identifier, password } = req.body;
    console.log("Attempting USER login for identifier:", identifier);

    if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Please provide identifier (username or email) and password' });
    }

    try {
        const { error, user } = await findAndVerifyUser(identifier, password);

        if (error || !user) {
             console.log(`Login failed for "${identifier}": ${error || 'User not found'}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // --- *** ROLE CHECK *** ---
        // Ensure the user has the 'user' role for this endpoint
        if (user.role !== 'user') {
            console.log(`User login DENIED: User ${user._id} (${user.username}) attempted login via /user-login endpoint but has role '${user.role}'.`);
            return res.status(403).json({ success: false, message: 'Access Denied: This login endpoint is for users only.' });
        }
        // --- *** END ROLE CHECK *** ---

        // Credentials are valid AND user has the 'user' role
        console.log(`User login successful for ID: ${user._id}, Role: ${user.role}`);
        const token = generateToken(user._id);

        // Exclude password from user object sent back
        const userResponse = { _id: user._id, username: user.username, email: user.email, role: user.role };

        res.status(200).json({
            success: true,
            token,
            user: userResponse
        });
        console.log("User login response sent for:", user._id);

    } catch (error) {
        console.error("--- ERROR during USER login process ---", error);
         if (!res.headersSent) {
             res.status(500).json({ success: false, message: 'Server error during login' });
         }
    }
};


// --- Login Admin (Admin Role Enforced) ---
exports.loginAdminSpecific = async (req, res, next) => {
    const { identifier, password } = req.body;
    console.log("Attempting ADMIN login for identifier:", identifier);

    if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Please provide identifier (username or email) and password' });
    }

    try {
        const { error, user } = await findAndVerifyUser(identifier, password);

         if (error || !user) {
             console.log(`Login failed for "${identifier}": ${error || 'User not found'}`);
             return res.status(401).json({ success: false, message: 'Invalid credentials' });
         }

        // *** ROLE CHECK ***
        // Ensure the user has the 'admin' role for this endpoint
        if (user.role !== 'admin') {
            console.log(`Admin login DENIED: User ${user._id} (${user.username}) attempted login via /admin-login endpoint but is not an admin (Role: ${user.role}).`);
            return res.status(403).json({ success: false, message: 'Access Denied: User is not an administrator.' });
        }
        // *** End Admin check ***

       // Credentials are valid AND user has the 'admin' role
        console.log(`Admin login successful for ID: ${user._id}, Role: ${user.role}`);
       const token = generateToken(user._id);

       // Exclude password from user object sent back
        const userResponse = { _id: user._id, username: user.username, email: user.email, role: user.role };

        res.status(200).json({
            success: true,
            token,
            user: userResponse
        });
        console.log("Admin login response sent for:", user._id);

    } catch (error) {
        console.error("--- ERROR during ADMIN login process ---", error);
         if (!res.headersSent) {
             res.status(500).json({ success: false, message: 'Server error during login' });
        }
    }
};