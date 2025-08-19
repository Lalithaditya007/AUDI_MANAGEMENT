// server/routes/bookingRoutes.js
const express = require('express');
const path = require('path'); // Path is still potentially useful, keep it for now
const upload = require('../multerConfig');

// Import controller functions - Ensure all required functions are listed
const {
    createBooking,
    getMyBookings,
    getAllBookings,
    approveBooking,
    rejectBooking,
    getBookingStats,
    withdrawBooking,
    requestReschedule,
    editBookingDetails,
    getAuditoriumSchedule,
    getRecentPendingBookings,
    getUpcomingBookings,
    getBookingTrends,
    getAuditoriumAvailability,
    getPublicEvents,
    checkAvailability,
    checkBookingConflicts, // Assuming you added this controller function based on previous context
    getPendingUpcomingBookings,
    endBookingNow,
    cancelBooking
} = require('../controllers/bookingController'); // Verify this path is correct

// Import middleware
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();


// Middleware to set uploadType for event images
function setEventUploadType(req, res, next) {
    req.uploadType = 'events';
    next();
}


// --- Route Definitions ---

// GET /api/bookings/public/events (Public)
router.get('/public/events', getPublicEvents);

// POST /api/bookings/ (Create Booking - User, uses multer)
router.route('/')
    .post(protect, setEventUploadType, upload.fields([{ name: 'eventPoster', maxCount: 1 }]), createBooking); // Allow eventPoster field specifically

// GET /api/bookings/mybookings (Get User's Bookings - User)
router.route('/mybookings')
    .get(protect, getMyBookings);

// GET /api/bookings/check-availability (Check Slot - User)
router.route('/check-availability')
    .get(protect, checkAvailability);

// POST /api/bookings/conflicts (Check Conflicts via POST - User)
router.post('/conflicts', protect, checkBookingConflicts); // Assuming this controller exists

// GET /api/bookings/availability/:auditoriumId (Get monthly slots - User)
router.route('/availability/:auditoriumId')
    .get(protect, getAuditoriumAvailability);


// --- Admin Routes ---

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

// GET /api/bookings/admin/pending-upcoming (Get Pending Bookings Needing Action - Admin)
router.route('/admin/pending-upcoming')
    .get(protect, admin, getPendingUpcomingBookings);


// --- Specific Booking Actions by ID ---

// DELETE /api/bookings/:id (Withdraw - User)
// PUT /api/bookings/:id/reschedule (Request Reschedule - User) - Changed from PUT /:id based on previous structure
// PUT /api/bookings/:id/edit (Edit booking details - User)
router.route('/:id')
    .delete(protect, withdrawBooking)
    .put(protect, setEventUploadType, upload.fields([{ name: 'eventPoster', maxCount: 1 }]), editBookingDetails);

router.route('/:id/reschedule') // Separate route for reschedule PUT request
    .put(protect, requestReschedule);

// GET /api/bookings/schedule/:auditoriumId (Admin Schedule Viewer)
router.route('/schedule/:auditoriumId')
    .get(protect, admin, getAuditoriumSchedule);


// --- Admin Approve/Reject Actions ---

// PUT /api/bookings/:id/approve (Approve - Admin)
router.route('/:id/approve')
    .put(protect, admin, approveBooking);

// PUT /api/bookings/:id/reject (Reject - Admin)
router.route('/:id/reject')
    .put(protect, admin, rejectBooking);

// PUT /api/bookings/:id/end (End ongoing event - Admin)
router.route('/:id/end')
    .put(protect, admin, endBookingNow);

// PUT /api/bookings/:id/cancel (Cancel approved event with reason - Admin)
router.route('/:id/cancel')
    .put(protect, admin, cancelBooking);


module.exports = router;