const mongoose = require('mongoose');

const AuditoriumSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide an auditorium name'],
        unique: true,
        trim: true,
    },
    capacity: {
        type: Number,
        required: [true, 'Please provide the capacity'],
        min: [1, 'Capacity must be at least 1'],
    },
    location: {
        type: String,
        required: [true, 'Please provide the location'],
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    amenities: [{
        type: String,
        trim: true,
    }],
    images: [{
        type: String,
        trim: true,
    }],
    available: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    contactInfo: {
        type: String,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    size: {
        type: String,
        enum: ['small', 'medium', 'large', 'so large'],
        required: true,
    },
    customFields: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
});

module.exports = mongoose.model('Auditorium', AuditoriumSchema);
