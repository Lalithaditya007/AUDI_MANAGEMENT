const Feedback = require('../models/Feedback');
const Report = require('../models/Report');
const User = require('../models/User');

// Get all feedback (Admin only)
exports.getAllFeedback = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const type = req.query.type;
        const priority = req.query.priority;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (priority) filter.priority = priority;

        const feedbacks = await Feedback.find(filter)
            .populate('user', 'username email profile.firstName profile.lastName')
            .populate('adminResponse.respondedBy', 'username profile.firstName profile.lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Feedback.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: feedbacks,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get all feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching feedback'
        });
    }
};

// Get feedback by ID (Admin only)
exports.getFeedbackById = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('user', 'username email profile.firstName profile.lastName')
            .populate('adminResponse.respondedBy', 'username profile.firstName profile.lastName');

        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        res.status(200).json({
            success: true,
            data: feedback
        });
    } catch (error) {
        console.error('Get feedback by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching feedback'
        });
    }
};

// Respond to feedback (Admin only)
exports.respondToFeedback = async (req, res) => {
    try {
        const { message, status } = req.body;
        const feedbackId = req.params.id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Response message is required'
            });
        }

        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        // Update feedback with admin response
        feedback.adminResponse = {
            message,
            respondedBy: req.user.id,
            respondedAt: new Date()
        };

        if (status) {
            feedback.status = status;
        }

        await feedback.save();

        const updatedFeedback = await Feedback.findById(feedbackId)
            .populate('user', 'username email profile.firstName profile.lastName')
            .populate('adminResponse.respondedBy', 'username profile.firstName profile.lastName');

        res.status(200).json({
            success: true,
            message: 'Response sent successfully',
            data: updatedFeedback
        });
    } catch (error) {
        console.error('Respond to feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while responding to feedback'
        });
    }
};

// Update feedback status (Admin only)
exports.updateFeedbackStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const feedbackId = req.params.id;

        const feedback = await Feedback.findByIdAndUpdate(
            feedbackId,
            { status },
            { new: true }
        ).populate('user', 'username email profile.firstName profile.lastName')
         .populate('adminResponse.respondedBy', 'username profile.firstName profile.lastName');

        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Feedback status updated successfully',
            data: feedback
        });
    } catch (error) {
        console.error('Update feedback status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating feedback status'
        });
    }
};

// Get all reports (Admin only)
exports.getAllReports = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const reportType = req.query.reportType;
        const severity = req.query.severity;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (status) filter.status = status;
        if (reportType) filter.reportType = reportType;
        if (severity) filter.severity = severity;

        const reports = await Report.find(filter)
            .populate('reporter', 'username email profile.firstName profile.lastName')
            .populate('reportedUser', 'username profile.firstName profile.lastName')
            .populate('relatedBooking', 'eventName eventDate')
            .populate('relatedAuditorium', 'name')
            .populate('resolution.resolvedBy', 'username profile.firstName profile.lastName')
            .populate('adminNotes.addedBy', 'username profile.firstName profile.lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Report.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: reports,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get all reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reports'
        });
    }
};

// Get report by ID (Admin only)
exports.getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id)
            .populate('reporter', 'username email profile.firstName profile.lastName')
            .populate('reportedUser', 'username profile.firstName profile.lastName')
            .populate('relatedBooking', 'eventName eventDate')
            .populate('relatedAuditorium', 'name')
            .populate('resolution.resolvedBy', 'username profile.firstName profile.lastName')
            .populate('adminNotes.addedBy', 'username profile.firstName profile.lastName');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Get report by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching report'
        });
    }
};

// Add admin note to report (Admin only)
exports.addAdminNote = async (req, res) => {
    try {
        const { note } = req.body;
        const reportId = req.params.id;

        if (!note) {
            return res.status(400).json({
                success: false,
                message: 'Note is required'
            });
        }

        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        report.adminNotes.push({
            note,
            addedBy: req.user.id,
            addedAt: new Date()
        });

        await report.save();

        const updatedReport = await Report.findById(reportId)
            .populate('reporter', 'username email profile.firstName profile.lastName')
            .populate('reportedUser', 'username profile.firstName profile.lastName')
            .populate('relatedBooking', 'eventName eventDate')
            .populate('relatedAuditorium', 'name')
            .populate('resolution.resolvedBy', 'username profile.firstName profile.lastName')
            .populate('adminNotes.addedBy', 'username profile.firstName profile.lastName');

        res.status(200).json({
            success: true,
            message: 'Admin note added successfully',
            data: updatedReport
        });
    } catch (error) {
        console.error('Add admin note error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding admin note'
        });
    }
};

// Update report status (Admin only)
exports.updateReportStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const reportId = req.params.id;

        const report = await Report.findByIdAndUpdate(
            reportId,
            { status },
            { new: true }
        ).populate('reporter', 'username email profile.firstName profile.lastName')
         .populate('reportedUser', 'username profile.firstName profile.lastName')
         .populate('relatedBooking', 'eventName eventDate')
         .populate('relatedAuditorium', 'name')
         .populate('resolution.resolvedBy', 'username profile.firstName profile.lastName')
         .populate('adminNotes.addedBy', 'username profile.firstName profile.lastName');

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Report status updated successfully',
            data: report
        });
    } catch (error) {
        console.error('Update report status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating report status'
        });
    }
};

// Resolve report (Admin only)
exports.resolveReport = async (req, res) => {
    try {
        const { action, description } = req.body;
        const reportId = req.params.id;

        if (!action || !description) {
            return res.status(400).json({
                success: false,
                message: 'Action and description are required'
            });
        }

        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        report.resolution = {
            action,
            description,
            resolvedBy: req.user.id,
            resolvedAt: new Date()
        };
        report.status = 'resolved';

        await report.save();

        const updatedReport = await Report.findById(reportId)
            .populate('reporter', 'username email profile.firstName profile.lastName')
            .populate('reportedUser', 'username profile.firstName profile.lastName')
            .populate('relatedBooking', 'eventName eventDate')
            .populate('relatedAuditorium', 'name')
            .populate('resolution.resolvedBy', 'username profile.firstName profile.lastName')
            .populate('adminNotes.addedBy', 'username profile.firstName profile.lastName');

        res.status(200).json({
            success: true,
            message: 'Report resolved successfully',
            data: updatedReport
        });
    } catch (error) {
        console.error('Resolve report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while resolving report'
        });
    }
};

// Get dashboard statistics (Admin only)
exports.getDashboardStats = async (req, res) => {
    try {
        // Feedback statistics
        const feedbackStats = await Feedback.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const feedbackByType = await Feedback.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Report statistics
        const reportStats = await Report.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const reportBySeverity = await Report.aggregate([
            {
                $group: {
                    _id: '$severity',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Total counts
        const totalFeedback = await Feedback.countDocuments();
        const totalReports = await Report.countDocuments();
        const pendingFeedback = await Feedback.countDocuments({ status: 'pending' });
        const pendingReports = await Report.countDocuments({ status: 'pending' });

        res.status(200).json({
            success: true,
            data: {
                totals: {
                    feedback: totalFeedback,
                    reports: totalReports,
                    pendingFeedback,
                    pendingReports
                },
                feedbackStats,
                feedbackByType,
                reportStats,
                reportBySeverity
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching dashboard statistics'
        });
    }
};
