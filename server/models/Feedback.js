const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    anonymous: {
        type: Boolean,
        default: false,
    },
    type: {
        type: String,
        enum: ['feedback', 'suggestion', 'complaint', 'appreciation'],
        default: 'feedback',
    },
    subject: {
        type: String,
        required: [true, 'Please provide a subject'],
        trim: true,
        maxlength: 200,
    },
    message: {
        type: String,
        required: [true, 'Please provide a message'],
        trim: true,
        maxlength: 1000,
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'resolved', 'closed'],
        default: 'pending',
    },
    adminResponse: {
        message: {
            type: String,
            trim: true,
            default: '',
        },
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        respondedAt: {
            type: Date,
        },
    },
    attachments: [{
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        mimetype: String,
    }],
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
FeedbackSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
