const express = require('express');
const router = express.Router();
const {
    getAllFeedback,
    getFeedbackById,
    respondToFeedback,
    updateFeedbackStatus,
    getAllReports,
    getReportById,
    addAdminNote,
    updateReportStatus,
    resolveReport,
    getDashboardStats,
    getAdminDashboardStats
} = require('../controllers/adminProfileController');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin rights required.'
        });
    }
    next();
};

// Dashboard statistics
router.get('/dashboard-stats', authMiddleware.protect, adminOnly, getDashboardStats);
router.get('/admin-dashboard-stats', authMiddleware.protect, adminOnly, getAdminDashboardStats);

// Feedback management routes
router.get('/feedback', authMiddleware.protect, adminOnly, getAllFeedback);
router.get('/feedback/:id', authMiddleware.protect, adminOnly, getFeedbackById);
router.post('/feedback/:id/respond', authMiddleware.protect, adminOnly, respondToFeedback);
router.put('/feedback/:id/status', authMiddleware.protect, adminOnly, updateFeedbackStatus);

// Report management routes
router.get('/reports', authMiddleware.protect, adminOnly, getAllReports);
router.get('/reports/:id', authMiddleware.protect, adminOnly, getReportById);
router.post('/reports/:id/note', authMiddleware.protect, adminOnly, addAdminNote);
router.put('/reports/:id/status', authMiddleware.protect, adminOnly, updateReportStatus);
router.post('/reports/:id/resolve', authMiddleware.protect, adminOnly, resolveReport);

module.exports = router;
