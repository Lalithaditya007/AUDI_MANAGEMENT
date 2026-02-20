const express = require('express');
const router = express.Router();
const {
    getProfile,
    updateProfile,
    uploadProfilePicture,
    changePassword,
    submitFeedback,
    submitReport,
    getFeedbackHistory,
    getReportHistory,
    deleteProfilePicture
} = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../multerConfig');

// Middleware to set upload type
const setUploadType = (type) => (req, res, next) => {
    req.uploadType = type;
    next();
};

// Profile routes
router.get('/', authMiddleware.protect, getProfile);
router.put('/', authMiddleware.protect, updateProfile);

// Profile picture routes
router.post('/upload-picture', 
    authMiddleware.protect, 
    setUploadType('profiles'), 
    upload.single('profilePicture'), 
    uploadProfilePicture
);
router.delete('/delete-picture', authMiddleware.protect, deleteProfilePicture);

// Password change
router.put('/change-password', authMiddleware.protect, changePassword);

// Feedback routes
router.post('/feedback', 
    authMiddleware.protect, 
    setUploadType('feedback'), 
    upload.array('attachments', 5), 
    submitFeedback
);
router.get('/feedback-history', authMiddleware.protect, getFeedbackHistory);

// Report routes
router.post('/report', 
    authMiddleware.protect, 
    setUploadType('reports'), 
    upload.array('evidence', 5), 
    submitReport
);
router.get('/report-history', authMiddleware.protect, getReportHistory);

module.exports = router;
