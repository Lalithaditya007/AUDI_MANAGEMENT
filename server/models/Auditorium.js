const mongoose = require('mongoose');

const AuditoriumSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide an auditorium name'],
        unique: true, // Ensure auditorium names are unique
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
});

module.exports = mongoose.model('Auditorium', AuditoriumSchema);
