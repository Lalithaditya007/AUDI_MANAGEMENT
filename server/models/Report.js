const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reportType: {
        type: String,
        enum: ['abuse', 'inappropriate_content', 'technical_issue', 'policy_violation', 'harassment', 'spam', 'other'],
        required: true,
    },
    subject: {
        type: String,
        required: [true, 'Please provide a subject'],
        trim: true,
        maxlength: 200,
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
        trim: true,
        maxlength: 1000,
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    status: {
        type: String,
        enum: ['pending', 'investigating', 'resolved', 'dismissed', 'escalated'],
        default: 'pending',
    },
    // If reporting another user
    reportedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    // If reporting a booking/event
    relatedBooking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
    },
    // If reporting an auditorium
    relatedAuditorium: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Auditorium',
    },
    evidence: [{
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        mimetype: String,
        description: String,
    }],
    adminNotes: [{
        note: String,
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        addedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    resolution: {
        action: {
            type: String,
            enum: ['no_action', 'warning_issued', 'user_suspended', 'content_removed', 'policy_updated', 'technical_fix', 'other'],
        },
        description: String,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        resolvedAt: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update timestamp on save
ReportSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Report', ReportSchema);
