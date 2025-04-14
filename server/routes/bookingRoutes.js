// server/routes/bookingRoutes.js
const express = require('express');
const path = require('path');
const multer = require('multer');
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
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6); const userId = req.user?._id || 'guest'; const filename = `booking-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`; cb(null, filename); } });
const fileFilter = (req, file, cb) => { if (file.mimetype.startsWith('image/')) { cb(null, true); } else { cb(new Error('Upload rejected: Only image files (png, jpg, jpeg, gif) are allowed.'), false); } };
const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });


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