// server/models/Booking.js
const mongoose = require('mongoose');

/**
 * Represents a booking request for an auditorium.
 */
const BookingSchema = new mongoose.Schema({
    /**
     * Name of the event for which the auditorium is booked.
     */
    eventName: {
        type: String,
        required: [true, 'Please provide an event name'],
        trim: true,
        maxlength: [150, 'Event name cannot exceed 150 characters']
    },
    /**
     * Optional detailed description of the event.
     */
    description: {
        type: String,
        required: [true, 'Please provide an event description'], // Add required
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    /**
     * The scheduled start date and time of the booking (stored in UTC).
     */
    startTime: {
        type: Date,
        required: [true, 'Please provide a start time'],
    },
    /**
     * The scheduled end date and time of the booking (stored in UTC).
     */
    endTime: {
        type: Date,
        required: [true, 'Please provide an end time'],
        validate: { // Ensure endTime is strictly after startTime
            validator: function (value) {
                // 'this' refers to the document being validated
                return this.startTime < value;
            },
            message: 'End time must be after start time'
        }
    },
    /**
     * Reference to the User document who created this booking request.
     */
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    /**
     * Reference to the Auditorium document being booked.
     */
    auditorium: {
        type: mongoose.Schema.ObjectId,
        ref: 'Auditorium',
        required: true,
    },
    /**
     * Reference to the Department document associated with this booking request.
     */
    department: {
        type: mongoose.Schema.ObjectId,
        ref: 'Department',
        required: [true, 'Please specify the associated department'], // Make department mandatory for new bookings
    },
    /**
     * The current status of the booking request.
     */
    status: {
        type: String,
        enum: {
            values: ['pending', 'approved', 'rejected'],
            message: 'Status must be one of: pending, approved, rejected'
        },
        default: 'pending',
    },
    /**
     * Reason provided by the admin if the status is 'rejected'.
     */
    rejectionReason: {
        type: String,
        trim: true,
        // Only applicable when status is 'rejected', maybe add custom validation if needed
    },
    /**
     * Array of paths to uploaded event posters or related images, relative to the server's upload directory.
     */
    eventImages: {
        type: [String], // Array of strings (paths/URLs)
        default: [],
    },
    // createdAt and updatedAt are automatically managed by the timestamps option below
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});


// Indexes for optimizing common queries
BookingSchema.index({ auditorium: 1, status: 1, startTime: 1, endTime: 1 }); // Good for conflict checks and schedule views
BookingSchema.index({ user: 1, createdAt: -1 }); // Good for fetching user's booking history
BookingSchema.index({ status: 1, createdAt: -1 }); // Good for admin view filtering by status
BookingSchema.index({ department: 1 }); 

module.exports = mongoose.model('Booking', BookingSchema);