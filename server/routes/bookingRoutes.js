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

// Import controller functions - ADD checkAvailability here
const {
    createBooking,
    getMyBookings,
    getAllBookings,
    approveBooking,
    rejectBooking,
    getBookingStats,
    withdrawBooking, // Renamed from withdrawBooking as per controller - CHECK YOUR HISTORY FILE FOR THIS
    requestReschedule, // Renamed from requestReschedule - CHECK YOUR HISTORY FILE FOR THIS
    getAuditoriumSchedule,
    getRecentPendingBookings,
    getUpcomingBookings,
    getBookingTrends,
    getAuditoriumAvailability,
    getPublicEvents,
    checkAvailability // <-- IMPORT THE NEW FUNCTION
} = require('../controllers/bookingController'); // Verify this path is correct

// Import middleware
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Multer Config ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const userId = req.user?._id || 'guest'; // Add safety check for user ID
        const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const filename = `event-${userId}-${uniqueSuffix}-${safeFilename}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and GIF allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    }
});


// --- Route Definitions ---

// GET /api/bookings/public/events (Public)
router.get('/public/events', getPublicEvents);

// POST /api/bookings/ (Create Booking - User)
router.route('/')
    .post(protect, upload.single('eventPoster'), createBooking);

// GET /api/bookings/mybookings (Get User's Bookings - User)
router.route('/mybookings')
    .get(protect, getMyBookings);

// --- NEW ROUTE FOR AVAILABILITY CHECK ---
// GET /api/bookings/check-availability?auditoriumId=...&startTime=...&endTime=... (Check Slot - User)
router.route('/check-availability')
    .get(protect, checkAvailability); // <--- ADDED ROUTE MAPPING

// GET /api/bookings/availability/:auditoriumId?year=...&month=... (Get monthly slots - User)
router.route('/availability/:auditoriumId')
    .get(protect, getAuditoriumAvailability);


// Admin Routes - Prefixed logically for clarity

// GET /api/bookings/admin/all (Get All Bookings - Admin)
router.route('/admin/all')
    .get(protect, admin, getAllBookings);

// GET /api/bookings/admin/stats (Get Booking Stats - Admin)
router.route('/admin/stats')
    .get(protect, admin, getBookingStats);

// GET /api/bookings/admin/recent-pending (Get Recent Pending - Admin)
router.route('/admin/recent-pending')
    .get(protect, admin, getRecentPendingBookings);

// GET /api/bookings/admin/upcoming (Get Upcoming Bookings - Admin)
router.route('/admin/upcoming')
    .get(protect, admin, getUpcomingBookings);

// GET /api/bookings/admin/trends (Get Booking Trends - Admin)
router.route('/admin/trends')
    .get(protect, admin, getBookingTrends);


// Specific booking actions by ID (User and Admin have different permissions)

// DELETE /api/bookings/:id (Withdraw - User, based on logic in controller)
// PUT /api/bookings/:id (Request Reschedule - User, based on logic in controller)
router.route('/:id')
    .delete(protect, withdrawBooking)   // User withdraws their own booking
    .put(protect, requestReschedule);   // User requests reschedule for their own booking


// GET /api/bookings/schedule/:auditoriumId (Admin Schedule Viewer for specific auditorium)
router.route('/schedule/:auditoriumId') // Separate from the user availability endpoint
    .get(protect, admin, getAuditoriumSchedule);


// PATCH (or PUT) for Admin Approve/Reject actions on specific bookings by ID
// Using PUT based on your original controller naming convention, though PATCH is arguably more semantically correct for updates.
// PATCH /api/bookings/:id/approve (Approve - Admin) - Using PUT to match controller file for now
router.route('/:id/approve')
    .put(protect, admin, approveBooking);

// PATCH /api/bookings/:id/reject (Reject - Admin) - Using PUT to match controller file for now
router.route('/:id/reject')
    .put(protect, admin, rejectBooking);


module.exports = router;