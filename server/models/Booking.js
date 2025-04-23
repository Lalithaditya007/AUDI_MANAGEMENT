// server/models/Booking.js
const mongoose = require('mongoose');

/**
 * Represents a booking request for an auditorium.
 */
const BookingSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: [true, 'Please provide an event name'],
        trim: true,
        maxlength: [150, 'Event name cannot exceed 150 characters']
    },
    description: {
        type: String,
        required: [true, 'Please provide an event description'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    startTime: {
        type: Date,
        required: [true, 'Please provide a start time'],
    },
    endTime: {
        type: Date,
        required: [true, 'Please provide an end time'],
        validate: {
            validator: function (value) { return this.startTime < value; },
            message: 'End time must be after start time'
        }
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    auditorium: {
        type: mongoose.Schema.ObjectId,
        ref: 'Auditorium',
        required: true,
    },
    department: {
        type: mongoose.Schema.ObjectId,
        ref: 'Department',
        required: [true, 'Please specify the associated department'],
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'approved', 'rejected'],
            message: 'Status must be one of: pending, approved, rejected'
        },
        default: 'pending',
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    eventImages: {
        type: [String], // Array of Azure Blob Storage URLs
        default: [],
    },
    // --- NEW FIELD ---
    /**
     * Flag to indicate if a pending reminder email has been sent to the admin.
     */
    reminderSent: {
        type: Boolean,
        default: false,
    },
    // --- END NEW FIELD ---
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});


// Indexes for optimizing common queries
BookingSchema.index({ auditorium: 1, status: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ department: 1 });
// --- NEW INDEX ---
BookingSchema.index({ status: 1, reminderSent: 1, startTime: 1 }); // For pending reminder query
// --- END NEW INDEX ---

module.exports = mongoose.model('Booking', BookingSchema);