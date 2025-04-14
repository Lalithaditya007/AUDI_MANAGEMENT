const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                 console.warn(`Authentication Warning: User not found for token ID: ${decoded.id}`);
                 return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
            }

            next();

        } catch (error) {
            console.error('Token verification failed:', error.message); 
            if (error.name === 'TokenExpiredError') {
                 return res.status(401).json({ success: false, message: 'Not authorized, token expired' });
            }
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};


const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.warn(`Authorization Failed: User ${req.user?._id} (Role: ${req.user?.role}) attempted admin-only access.`);
        res.status(403).json({ success: false, message: 'Forbidden: User is not authorized for this action' }); 
    }
};

module.exports = { protect, admin }; 