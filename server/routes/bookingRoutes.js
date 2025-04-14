// server/routes/bookingRoutes.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory at:', uploadsDir);
}

// Ensure ALL controller functions used are imported
const {
    createBooking, getMyBookings, getAllBookings, approveBooking, rejectBooking,
    getBookingStats, withdrawBooking, requestReschedule, getAuditoriumSchedule,
    getRecentPendingBookings, getUpcomingBookings, getBookingTrends,
    getAuditoriumAvailability, getPublicEvents // <--- Import included here
} = require('../controllers/bookingController'); // Verify this path is correct
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Multer Config ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const userId = req.user?._id || 'guest';
        const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'); // Sanitize filename
        const filename = `event-${userId}-${uniqueSuffix}-${safeFilename}`;
        cb(null, filename);
    }
});

// File filter for images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false);
    }
};

// Configure multer with error handling
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only allow 1 file per request
    }
});

// --- User Routes ---
router.route('/').post(protect, upload.single('eventPoster'), createBooking);
router.route('/mybookings').get(protect, getMyBookings);
router.route('/:id').delete(protect, withdrawBooking).put(protect, requestReschedule);

// --- Public or Protected Route for Availability ---
// GET /api/bookings/availability/:auditoriumId?year=YYYY&month=M
router.route('/availability/:auditoriumId') // Route is correct
    .get(protect, getAuditoriumAvailability); // Handler registration is correct assuming import works

// Public routes
router.get('/public/events', getPublicEvents);

// --- Admin Routes ---
router.route('/admin/stats').get(protect, admin, getBookingStats);
router.route('/admin/all').get(protect, admin, getAllBookings);
router.route('/admin/recent-pending').get(protect, admin, getRecentPendingBookings);
router.route('/admin/upcoming').get(protect, admin, getUpcomingBookings);
router.route('/admin/trends').get(protect, admin, getBookingTrends);
router.route('/schedule/:auditoriumId').get(protect, admin, getAuditoriumSchedule);
router.route('/:id/approve').put(protect, admin, approveBooking);
router.route('/:id/reject').put(protect, admin, rejectBooking);

module.exports = router;