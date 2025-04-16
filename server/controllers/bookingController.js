// server/controllers/bookingController.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon'); // <-- Make sure Luxon is imported

const Booking = require('../models/Booking');
const Auditorium = require('../models/Auditorium');
const User = require('../models/User');
const Department = require('../models/Department');
const {
  sendBookingRequestEmail,
  sendBookingApprovalEmail,
  sendBookingRejectionEmail,
} = require('../utils/emailService'); // Assuming this path is correct

// --- Constants ---
const istTimezone = 'Asia/Kolkata';
const openingHourIST = 9; // Bookings cannot start before 9 AM IST
const bookingLeadTimeHours = 2; // Bookings must be made at least 2 hours in advance

// --- Helper: File Cleanup ---

/**
 * Attempts to delete an uploaded file, typically used on error.
 * @param {object | string | undefined} file - The file object (from multer) or a file path string.
 */
const cleanupUploadedFileOnError = (file) => {
  if (!file) {
    return;
  }
  const filePath = typeof file === 'string' && file.startsWith('/uploads/')
    ? path.join(__dirname, '..', file)
    : file.path;

  if (filePath) {
    const fullPath = path.resolve(filePath);
    console.log(`[CLEANUP] Attempting delete: ${fullPath}`);
    fs.unlink(fullPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error(`[CLEANUP] FAILED delete ${fullPath}:`, err);
      } else if (!err) {
        console.log(`[CLEANUP] Success delete: ${fullPath}`);
      }
    });
  } else {
    console.warn('[CLEANUP] Could not determine file path for cleanup.');
  }
};

// ==================================================
//             BOOKING CONTROLLER FUNCTIONS
// ==================================================

/**
 * @desc    Create a new booking request
 * @route   POST /api/bookings
 * @access  Private (User - needs login)
 */
exports.createBooking = async (req, res) => {
    try {
        const eventImage = req.file ? `/uploads/${req.file.filename}` : null;

        const booking = await Booking.create({
            eventName: req.body.eventName,
            description: req.body.description,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            auditorium: req.body.auditorium,
            department: req.body.department,
            user: req.user._id,
            eventImages: eventImage ? [eventImage] : [],
            status: 'pending'
        });

        const populatedBooking = await Booking.findById(booking._id)
            .populate('user', 'email username')
            .populate('auditorium', 'name location')
            .populate('department', 'name');

        try {
            await sendBookingRequestEmail(
                populatedBooking.user.email,
                populatedBooking,
                populatedBooking.auditorium,
                populatedBooking.department
            );
            console.log(`[Email Sent] Booking request confirmation sent for ${booking._id} to ${populatedBooking.user.email}`);
        } catch (emailError) {
            console.error(`[Non-critical Error] Failed sending booking request email for ${booking._id}:`, emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: booking
        });

    } catch (error) {
        if (req.file) {
             // Ensure fs is required if not globally required
             // const fs = require('fs'); // Uncomment if fs not globally required
             cleanupUploadedFileOnError(req.file); // Use the helper
         }
        console.error("[Error] Create Booking Failed:", error); // Add more specific log
        res.status(500).json({
            success: false,
            // Provide a more user-friendly message, check error type if needed
            message: error.message || 'Server error creating booking.'
        });
    }
};

/**
 * @desc    Get bookings made by the currently logged-in user
 * @route   GET /api/bookings/mybookings
 * @access  Private (User - needs login)
 */
exports.getMyBookings = async (req, res, next) => {
  const userId = req.user._id;
  try {
    const userBookings = await Booking.find({ user: userId })
      .populate('auditorium', 'name location capacity')
      .populate('department', 'name code')
      .sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      count: userBookings.length,
      data: userBookings,
    });
  } catch (error) {
    console.error(`[Error] Fetch user ${userId} bookings failed:`, error);
    res.status(500).json({ success: false, message: 'Server error retrieving your bookings.' });
  }
};

/**
 * @desc    Get all bookings, with optional filters (Admin view)
 * @route   GET /api/bookings/admin/all
 * @access  Private (Admin)
 */
exports.getAllBookings = async (req, res, next) => {
  try {
    const query = {};
    const filtersApplied = {};
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
      query.status = req.query.status;
      filtersApplied.status = req.query.status;
    }
    if (req.query.auditoriumId && mongoose.Types.ObjectId.isValid(req.query.auditoriumId)) {
      query.auditorium = req.query.auditoriumId;
      filtersApplied.auditoriumId = req.query.auditoriumId;
    }
    if (req.query.departmentId && mongoose.Types.ObjectId.isValid(req.query.departmentId)) {
      query.department = req.query.departmentId;
      filtersApplied.departmentId = req.query.departmentId;
    }
    if (req.query.eventName) {
      query.eventName = { $regex: req.query.eventName, $options: 'i' };
      filtersApplied.eventName = req.query.eventName;
    }
    if (req.query.userEmail) {
      const users = await User.find({ email: { $regex: req.query.userEmail, $options: 'i' } }).select('_id');
      const userIds = users.map(user => user._id);
      if (userIds.length === 0) {
        return res.status(200).json({ success: true, count: 0, filtersApplied, data: [] });
      }
      query.user = { $in: userIds };
      filtersApplied.userEmail = req.query.userEmail;
    }
    if (req.query.date) {
      const targetDateLuxon = DateTime.fromISO(req.query.date, { zone: istTimezone });
      if (!targetDateLuxon.isValid) {
        return res.status(400).json({ success: false, message: `Invalid date format for filtering: ${req.query.date}. Use YYYY-MM-DD.` });
      }
      const startOfDayUTC = targetDateLuxon.startOf('day').toUTC().toJSDate();
      const endOfDayUTC = targetDateLuxon.endOf('day').toUTC().toJSDate();
      query.startTime = { $lt: endOfDayUTC };
      query.endTime = { $gt: startOfDayUTC };
      filtersApplied.date = req.query.date;
    }

    const bookings = await Booking.find(query)
      .populate('user', 'username email')
      .populate('auditorium', 'name location capacity')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      filtersApplied,
      data: bookings,
    });
  } catch (error) {
    console.error("[Error] Fetch all bookings (admin) failed:", error);
    res.status(500).json({ success: false, message: 'Server error retrieving all bookings.' });
  }
};

/**
 * @desc    Approve a pending booking
 * @route   PATCH /api/bookings/admin/approve/:id  <- NOTE: Route path often includes '/admin'
 *                                                  Your bookingRoutes.js used /:id/approve. Be consistent!
 * @access  Private (Admin)
 */
exports.approveBooking = async (req, res, next) => {
  const bookingId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid Booking ID format." });
  }
  try {
    const booking = await Booking.findById(bookingId)
      .populate('user', 'email username')
      .populate('auditorium')
      .populate('department', 'name');

    if (!booking) {
      return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking status is already '${booking.status}'. Cannot approve.` });
    }

    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      auditorium: booking.auditorium._id,
      status: 'approved',
      startTime: { $lt: booking.endTime },
      endTime: { $gt: booking.startTime },
    });

    if (conflict) {
      console.warn(`[Approval Conflict] Booking ${bookingId} conflicts with approved booking ${conflict._id} upon approval attempt.`);
      return res.status(409).json({
        success: false,
        message: `Approval failed: Time slot now conflicts with another approved booking (ID: ${conflict._id}). Please review the schedule.`,
      });
    }

    booking.status = 'approved';
    booking.rejectionReason = undefined;
    const updatedBooking = await booking.save();
    console.log(`[Success] Booking ${updatedBooking._id} approved.`);

    try {
      if (booking.user?.email && booking.auditorium && booking.department) {
        await sendBookingApprovalEmail(booking.user.email, updatedBooking, booking.auditorium, booking.department);
        console.log(`[Email Sent] Approval email sent for ${updatedBooking._id} to ${booking.user.email}`);
      } else {
        console.warn(`[Email Skipped] Missing data for approved booking ${updatedBooking._id}. Cannot send email.`);
      }
    } catch (emailError) {
      console.error(`[Non-critical Error] Failed sending approval email for ${updatedBooking._id}:`, emailError.message || emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Booking approved successfully.',
      data: updatedBooking,
    });
  } catch (error) {
    console.error(`[Error] Approve booking ${bookingId} failed:`, error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error approving booking.' });
    }
  }
};

/**
 * @desc    Reject a pending booking
 * @route   PATCH /api/bookings/admin/reject/:id  <- NOTE: Route path consistency
 *                                                  Your bookingRoutes.js used /:id/reject. Be consistent!
 * @access  Private (Admin)
 */
exports.rejectBooking = async (req, res, next) => {
  const bookingId = req.params.id;
  const { rejectionReason } = req.body;

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
  }
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid Booking ID format." });
  }

  try {
    const booking = await Booking.findById(bookingId)
      .populate('user', 'email username')
      .populate('auditorium')
      .populate('department', 'name');

    if (!booking) {
      return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking status is already '${booking.status}'. Cannot reject.` });
    }

    booking.status = 'rejected';
    booking.rejectionReason = rejectionReason.trim();
    const updatedBooking = await booking.save();
    console.log(`[Success] Booking ${updatedBooking._id} rejected. Reason: ${updatedBooking.rejectionReason}`);

    try {
      if (booking.user?.email && booking.auditorium && booking.department) {
        await sendBookingRejectionEmail(
          booking.user.email,
          updatedBooking,
          booking.auditorium,
          booking.department,
          updatedBooking.rejectionReason
        );
        console.log(`[Email Sent] Rejection email sent for ${updatedBooking._id} to ${booking.user.email}`);
      } else {
        console.warn(`[Email Skipped] Missing data for rejected booking ${updatedBooking._id}. Cannot send email.`);
      }
    } catch (emailError) {
      console.error(`[Non-critical Error] Failed sending rejection email for ${updatedBooking._id}:`, emailError.message || emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Booking rejected successfully.',
      data: updatedBooking,
    });
  } catch (error) {
    console.error(`[Error] Reject booking ${bookingId} failed:`, error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error rejecting booking.' });
    }
  }
};


/**
 * @desc    Get booking statistics (overall or grouped by auditorium/department)
 * @route   GET /api/bookings/admin/stats?groupBy=[auditorium|department]
 * @access  Private (Admin)
 */
exports.getBookingStats = async (req, res, next) => {
    // Implementation from your provided code...
    const groupByField = req.query.groupBy;
    console.log(`[API Call] GET /api/bookings/admin/stats | GroupBy: ${groupByField || 'overall'}`);
    try {
        let aggregationPipeline = [];
        if (groupByField === 'auditorium' || groupByField === 'department') {
            aggregationPipeline = [ /* Your Grouped Pipeline */
                { $group: { _id: { group: `$${groupByField}`, status: '$status' }, count: { $sum: 1 }, }, },
                { $group: { _id: '$_id.group', stats: { $push: { k: "$_id.status", v: "$count" }, }, total: { $sum: '$count' }, }, },
                { $lookup: { from: groupByField === 'auditorium' ? 'auditoria' : 'departments', localField: '_id', foreignField: '_id', as: 'groupInfo', }, },
                { $project: { _id: 1, name: { $ifNull: [{ $arrayElemAt: ['$groupInfo.name', 0] }, 'Unknown/Deleted'] }, statsAsObject: { $arrayToObject: '$stats' }, total: 1, }, },
                { $replaceRoot: { newRoot: { $mergeObjects: [ { _id: '$_id', name: '$name', total: '$total', pending: 0, approved: 0, rejected: 0 }, '$statsAsObject', ], }, }, },
                { $sort: { name: 1 } },
             ];
        } else {
             aggregationPipeline = [ /* Your Overall Pipeline */
                 { $group: { _id: '$status', count: { $sum: 1 } } },
                 { $group: { _id: null, stats: { $push: { k: "$_id", v: "$count" } }, total: { $sum: "$count" } } },
                 { $replaceRoot: { newRoot: { $mergeObjects: [ { total: 0, pending: 0, approved: 0, rejected: 0 }, { $arrayToObject: "$stats" }, { total: { $ifNull: ["$total", 0] } } ] } } }
             ];
        }
        const statsResult = await Booking.aggregate(aggregationPipeline);
        const responseData = (groupByField === 'auditorium' || groupByField === 'department') ? statsResult : (statsResult[0] || { total: 0, pending: 0, approved: 0, rejected: 0 });
        res.status(200).json({ success: true, groupedBy: groupByField || 'overall', data: responseData });
    } catch (error) {
        console.error(`[Error] Get booking stats (GroupBy: ${groupByField || 'overall'}) failed:`, error);
        res.status(500).json({ success: false, message: 'Server error retrieving booking statistics.' });
    }
};


/**
 * @desc    Withdraw/Cancel a booking (by the user who made it)
 * @route   DELETE /api/bookings/:id <-- Mismatch? History routes file uses /:id
 *                                      User routes file uses /:id. Be consistent.
 * @access  Private (User - needs login)
 */
exports.withdrawBooking = async (req, res, next) => {
    const bookingId = req.params.id;
    const userId = req.user._id;
    console.log(`[API Call] DELETE /api/bookings/${bookingId} | User: ${userId}`); // Updated path to match routes file

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid Booking ID format.' });
    }
    try {
        const booking = await Booking.findOne({ _id: bookingId, user: userId });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found or you do not have permission to modify it.' });
        }
        if (!['pending', 'approved'].includes(booking.status)) {
             return res.status(400).json({ success: false, message: `Cannot withdraw booking: Current status is '${booking.status}'.` });
         }

         // NEW: Lead Time Check for 'approved' bookings
        if (booking.status === 'approved') {
            const now = DateTime.now();
            const startTime = DateTime.fromJSDate(booking.startTime);
            const allowedWithdrawalTime = startTime.minus({ hours: bookingLeadTimeHours });
            if (now > allowedWithdrawalTime) {
                 return res.status(400).json({
                      success: false,
                      message: `Cannot withdraw booking: Approved bookings can only be withdrawn up to ${bookingLeadTimeHours} hours before the event starts.`
                 });
            }
        }


        if (booking.eventImages && booking.eventImages.length > 0) {
            booking.eventImages.forEach(imagePath => {
                 if (imagePath) {
                      console.log(`[Withdrawal] Cleaning up image: ${imagePath}`);
                     cleanupUploadedFileOnError(imagePath);
                }
            });
        }
        await Booking.deleteOne({ _id: bookingId });
        console.log(`[Success] Booking ${bookingId} withdrawn successfully by user ${userId}.`);
        res.status(200).json({ success: true, message: 'Booking withdrawn successfully.' });
    } catch (error) {
        console.error(`[Error] Withdraw booking ${bookingId} failed for user ${userId}:`, error);
        if (!res.headersSent) {
             res.status(500).json({ success: false, message: 'Server error withdrawing booking.' });
        }
    }
};


/**
 * @desc    Request to reschedule an *approved* booking (by the user)
 * @route   PUT /api/bookings/:id  <-- Mismatch? History routes file uses /:id
 *                                  User routes file uses /:id. Be consistent.
 * @access  Private (User - needs login)
 */
exports.requestReschedule = async (req, res, next) => {
    const bookingId = req.params.id;
    const userId = req.user._id;
    // NOTE: You send { newStartTime, newEndTime } in the PUT body in the history file,
    // Let's align with that here.
    const { newStartTime, newEndTime } = req.body;
    console.log(`[API Call] PUT /api/bookings/${bookingId} (Reschedule) | User: ${userId}`); // Updated path

    if (!newStartTime || !newEndTime) {
        return res.status(400).json({ success: false, message: 'New start time and new end time are required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid Booking ID format.' });
    }

    try {
        const booking = await Booking.findOne({ _id: bookingId, user: userId })
            .populate('auditorium')
            .populate('department', 'name');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found or you do not have permission.' });
        }
        if (booking.status !== 'approved') {
            return res.status(400).json({ success: false, message: `Only approved bookings can be rescheduled. Status is '${booking.status}'.` });
        }

        const startLuxonNew = DateTime.fromISO(newStartTime);
        const endLuxonNew = DateTime.fromISO(newEndTime);
        if (!startLuxonNew.isValid || !endLuxonNew.isValid) {
            return res.status(400).json({ success: false, message: 'Invalid new date/time format. Use ISO 8601.' });
        }
        const startDateNew = startLuxonNew.toJSDate();
        const endDateNew = endLuxonNew.toJSDate();

        if (startDateNew >= endDateNew) {
            return res.status(400).json({ success: false, message: 'New end time must be strictly after new start time.' });
        }
        const startLuxonNewIST = startLuxonNew.setZone(istTimezone);
        if (startLuxonNewIST.hour < openingHourIST) {
             return res.status(400).json({ success: false, message: `New start time cannot be before ${openingHourIST}:00 AM ${istTimezone}.` });
        }
        const now = DateTime.now();
        if (startLuxonNew < now.plus({ hours: bookingLeadTimeHours })) {
             return res.status(400).json({ success: false, message: `New start time must be at least ${bookingLeadTimeHours} hours in advance.` });
        }
        if (booking.startTime.getTime() === startDateNew.getTime() && booking.endTime.getTime() === endDateNew.getTime()) {
             return res.status(400).json({ success: false, message: `Requested times are the same as current booking.` });
        }

        const conflictNew = await Booking.findOne({
             _id: { $ne: booking._id }, auditorium: booking.auditorium._id, status: 'approved',
             startTime: { $lt: endDateNew }, endTime: { $gt: startDateNew },
        });
        if (conflictNew) {
             console.warn(`[Reschedule Conflict] Booking ${bookingId} conflicts with ${conflictNew._id}.`);
             return res.status(409).json({ success: false, message: `New time slot conflicts with another approved booking.` });
        }

        booking.startTime = startDateNew;
        booking.endTime = endDateNew;
        booking.status = 'pending'; // Must be re-approved
        booking.rejectionReason = undefined;
        const updatedBookingBasic = await booking.save();
        console.log(`[Success] Booking ${bookingId} reschedule request by user ${userId}. Status 'pending'.`);

        const updatedBookingPopulated = await Booking.findById(updatedBookingBasic._id)
            .populate('user', 'email username').populate('auditorium').populate('department', 'name');

        res.status(200).json({
            success: true,
            message: 'Reschedule request submitted, awaiting re-approval.',
            data: updatedBookingPopulated,
        });
    } catch (error) {
        console.error(`[Error] Request reschedule for booking ${bookingId} failed:`, error);
        if (!res.headersSent) {
            if (error.name === 'ValidationError' || error.name === 'CastError') {
                 return res.status(400).json({ success: false, message: error.message });
            }
             res.status(500).json({ success: false, message: 'Server error processing reschedule.' });
        }
    }
};

/**
 * @desc    Get the schedule (approved bookings) for a specific auditorium for a given month/year
 * @route   GET /api/bookings/schedule/:auditoriumId?year=YYYY&month=M
 * @access  Private (User - needs login)
 */
exports.getAuditoriumSchedule = async (req, res, next) => {
    // Implementation from your provided code...
    const { auditoriumId } = req.params;
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    console.log(`[API Call] GET /api/bookings/schedule/${auditoriumId} | Year: ${year}, Month: ${month}`);

    if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid Auditorium ID.' }); }
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) { return res.status(400).json({ success: false, message: 'Valid year/month needed.' }); }

    try {
        const startOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month');
        const endOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).endOf('month');
        const startOfMonthUTC = startOfMonthLocal.toUTC().toJSDate();
        const endOfMonthUTC = endOfMonthLocal.toUTC().toJSDate();
        console.log(`[DEBUG] Schedule Query UTC Range: ${startOfMonthUTC.toISOString()} - ${endOfMonthUTC.toISOString()}`);

        const scheduleBookings = await Booking.find({
             auditorium: auditoriumId, status: 'approved',
             startTime: { $lt: endOfMonthUTC }, endTime: { $gt: startOfMonthUTC },
        }).populate('user', 'username email').select('eventName startTime endTime user description').sort({ startTime: 1 });

        res.status(200).json({
            success: true,
            message: `Schedule fetched for ${startOfMonthLocal.toFormat('MMMM yyyy')}`,
            count: scheduleBookings.length, data: scheduleBookings,
        });
    } catch (error) {
        console.error(`[Error] Fetching schedule for Audi ${auditoriumId}, ${month}/${year}:`, error);
        res.status(500).json({ success: false, message: 'Server error retrieving schedule.' });
    }
};

/**
 * @desc    Get recently created pending booking requests (Admin dashboard widget)
 * @route   GET /api/bookings/admin/recent-pending?limit=N
 * @access  Private (Admin)
 */
exports.getRecentPendingBookings = async (req, res, next) => {
    // Implementation from your provided code...
    const limit = parseInt(req.query.limit, 10);
    const effectiveLimit = (!isNaN(limit) && limit > 0) ? Math.min(limit, 20) : 5;
    console.log(`[API Call] GET /api/bookings/admin/recent-pending | Limit: ${effectiveLimit}`);
    try {
        const recentPending = await Booking.find({ status: 'pending' })
            .sort({ createdAt: -1 }).limit(effectiveLimit)
            .populate('user', 'username email').populate('auditorium', 'name').populate('department', 'name code');
        res.status(200).json({ success: true, count: recentPending.length, limit: effectiveLimit, data: recentPending });
    } catch (error) {
        console.error("[Error] Fetch recent pending bookings failed:", error);
        res.status(500).json({ success: false, message: 'Server error retrieving recent pending requests.' });
    }
};

/**
 * @desc    Get upcoming approved bookings within the next N days (Admin dashboard widget)
 * @route   GET /api/bookings/admin/upcoming?days=N
 * @access  Private (Admin)
 */
exports.getUpcomingBookings = async (req, res, next) => {
    // Implementation from your provided code...
    const days = parseInt(req.query.days, 10);
    const effectiveDays = (!isNaN(days) && days > 0) ? Math.min(days, 30) : 7;
    console.log(`[API Call] GET /api/bookings/admin/upcoming | Days: ${effectiveDays}`);
    try {
        const now = DateTime.now().toJSDate();
        const futureDate = DateTime.now().plus({ days: effectiveDays }).endOf('day').toJSDate();
        console.log(`[DEBUG] Upcoming query range: ${now.toISOString()} - ${futureDate.toISOString()}`);
        const upcomingBookings = await Booking.find({
            status: 'approved', startTime: { $gte: now, $lt: futureDate },
        }).sort({ startTime: 1 }).populate('user', 'username email').populate('auditorium', 'name').populate('department', 'name code');
        res.status(200).json({ success: true, count: upcomingBookings.length, days: effectiveDays, data: upcomingBookings });
    } catch (error) {
        console.error("[Error] Fetch upcoming bookings failed:", error);
        res.status(500).json({ success: false, message: 'Server error retrieving upcoming bookings.' });
    }
};

/**
 * @desc    Get booking trends (count per day) over the last N days, optionally filtered
 * @route   GET /api/bookings/admin/trends?days=N&auditoriumId=ID&departmentId=ID
 * @access  Private (Admin)
 */
exports.getBookingTrends = async (req, res, next) => {
    // Implementation from your provided code...
    const days = parseInt(req.query.days, 10);
    const auditoriumId = req.query.auditoriumId;
    const departmentId = req.query.departmentId;
    const effectiveDays = (!isNaN(days) && days > 0) ? Math.min(days, 90) : 30;
    console.log(`[API Call] GET /api/bookings/admin/trends | Days: ${effectiveDays}, AudiID: ${auditoriumId || 'N/A'}, DeptID: ${departmentId || 'N/A'}`);
    try {
        const startDate = DateTime.now().minus({ days: effectiveDays }).startOf('day').toJSDate();
        console.log(`[DEBUG] Trends query start date (UTC): ${startDate.toISOString()}`);
        const matchStage = { createdAt: { $gte: startDate } };
        if (auditoriumId && mongoose.Types.ObjectId.isValid(auditoriumId)) { matchStage.auditorium = new mongoose.Types.ObjectId(auditoriumId); console.log(`[DEBUG] Filtering trends by Auditorium: ${auditoriumId}`); } else if (auditoriumId) { console.warn(`[WARN] Invalid auditoriumId passed to trends: ${auditoriumId}`); }
        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) { matchStage.department = new mongoose.Types.ObjectId(departmentId); console.log(`[DEBUG] Filtering trends by Department: ${departmentId}`); } else if (departmentId) { console.warn(`[WARN] Invalid departmentId passed to trends: ${departmentId}`); }

        const aggregationPipeline = [
            { $match: matchStage },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: istTimezone } }, count: { $sum: 1 }, }, },
            { $project: { _id: 0, date: "$_id", count: 1, }, },
            { $sort: { date: 1 } },
        ];
        const trendsData = await Booking.aggregate(aggregationPipeline);

        const filledTrends = [];
        let currentDate = DateTime.fromJSDate(startDate).setZone(istTimezone);
        const endDate = DateTime.now().setZone(istTimezone).startOf('day');
        const trendsMap = new Map(trendsData.map(item => [item.date, item.count]));
        while (currentDate <= endDate) {
            const dateString = currentDate.toFormat('yyyy-MM-dd');
            filledTrends.push({ date: dateString, count: trendsMap.get(dateString) || 0, });
            currentDate = currentDate.plus({ days: 1 });
        }
        res.status(200).json({ success: true, days: effectiveDays, filters: { auditoriumId, departmentId }, data: filledTrends, });
    } catch (error) {
        console.error(`[Error] Fetch booking trends failed (Filters: Audi-${auditoriumId || 'N/A'}, Dept-${departmentId || 'N/A'}):`, error);
        res.status(500).json({ success: false, message: 'Server error retrieving trends.' });
    }
};

/**
 * @desc    Get booked time slots (approved only) for an auditorium in a given month/year
 * @route   GET /api/bookings/availability/:auditoriumId?year=YYYY&month=M
 * @access  Private (User - needs login)
 */
exports.getAuditoriumAvailability = async (req, res, next) => {
    // Implementation from your provided code...
     const { auditoriumId } = req.params;
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    console.log(`[API Call] GET /api/bookings/availability/${auditoriumId} | Year: ${year}, Month: ${month}`);

    if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid Auditorium ID.' }); }
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) { return res.status(400).json({ success: false, message: 'Valid year/month needed.' }); }

    try {
        const startOfMonthUTC = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month').toUTC().toJSDate();
        const endOfMonthUTC = DateTime.local(year, month, 1, { zone: istTimezone }).endOf('month').toUTC().toJSDate();
        console.log(`[DEBUG] Availability query UTC Range: ${startOfMonthUTC.toISOString()} - ${endOfMonthUTC.toISOString()}`);

        const bookedSlots = await Booking.find({
             auditorium: auditoriumId, status: 'approved',
             startTime: { $lt: endOfMonthUTC }, endTime: { $gt: startOfMonthUTC }
        }).select('startTime endTime -_id').lean();

        res.status(200).json({ success: true, message: `Availability fetched for ${year}-${String(month).padStart(2, '0')}`, count: bookedSlots.length, data: bookedSlots });
    } catch (error) {
        console.error(`[Error] Fetching availability for Audi ${auditoriumId}, ${month}/${year}:`, error);
        res.status(500).json({ success: false, message: 'Server error retrieving availability.' });
    }
};

/**
 * @desc    Get current and upcoming events
 * @route   GET /api/bookings/public/events
 * @access  Public
 */
exports.getPublicEvents = async (req, res) => {
    // Implementation from your provided code...
    try {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const events = await Booking.find({ status: 'approved', $or: [ { startTime: { $lte: now }, endTime: { $gte: now } }, { startTime: { $gt: now, $lt: nextWeek } } ] })
            .sort({ startTime: 1 }).populate('auditorium', 'name').select('eventName startTime endTime auditorium eventImages');
        console.log('Found events:', events.length); // Log count
        res.status(200).json({ success: true, data: events });
    } catch (error) {
        console.error("[Error] Fetch public events failed:", error);
        res.status(500).json({ success: false, message: 'Error fetching events' });
    }
};


// ==============================================
//          >>> NEW AVAILABILITY CHECK FUNCTION <<<
// ==============================================

/**
 * @desc    Check if a time slot is available for a given auditorium
 * @route   GET /api/bookings/check-availability?auditoriumId=ID&startTime=ISO&endTime=ISO
 * @access  Private (User - needs login)
 */
exports.checkAvailability = async (req, res, next) => {
    const { auditoriumId, startTime, endTime } = req.query;
    console.log(`[API Call] GET /check-availability | Auditorium: ${auditoriumId}, Start: ${startTime}, End: ${endTime}`);

    // --- Validation ---
    if (!auditoriumId || !startTime || !endTime) {
        return res.status(400).json({ success: false, message: 'Missing required query parameters: auditoriumId, startTime, endTime.' });
    }
    if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
        return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' });
    }

    let startDateTimeJS, endDateTimeJS;
    try {
        // Use Luxon for robust ISO parsing
        const startLuxon = DateTime.fromISO(startTime);
        const endLuxon = DateTime.fromISO(endTime);

        if (!startLuxon.isValid || !endLuxon.isValid) {
            throw new Error('Invalid ISO date format.');
        }
        startDateTimeJS = startLuxon.toJSDate(); // Convert to JS Date for Mongoose
        endDateTimeJS = endLuxon.toJSDate();

         if (startDateTimeJS >= endDateTimeJS) {
             return res.status(400).json({ success: false, message: 'End time must be strictly after start time.' });
         }

    } catch (e) {
        console.error("Date parsing error in checkAvailability:", e.message);
        return res.status(400).json({ success: false, message: 'Invalid startTime or endTime format. Use full ISO 8601 format (e.g., 2023-10-27T10:00:00.000Z).' });
    }

    try {
        // Find any APPROVED booking that overlaps the requested time for the SPECIFIC auditorium
        const conflictingBooking = await Booking.findOne({
            auditorium: auditoriumId,
            status: 'approved', // CRITICAL: Only check against approved bookings
            startTime: { $lt: endDateTimeJS }, // Conflict starts before requested ends
            endTime: { $gt: startDateTimeJS },   // Conflict ends after requested starts
        })
        .populate('department', 'name') // Populate for the feedback message
        .select('eventName startTime endTime department') // Select only necessary fields for feedback
        .lean(); // Use lean for performance

        if (conflictingBooking) {
             console.log(`[Conflict Found] Auditorium ${auditoriumId} booked from ${conflictingBooking.startTime} to ${conflictingBooking.endTime} for "${conflictingBooking.eventName}"`);
             res.status(200).json({ // Return 200 OK, but available: false
                success: true,
                available: false,
                conflictingBooking: { // Provide details about the conflict
                    eventName: conflictingBooking.eventName,
                    department: conflictingBooking.department?.name || 'N/A',
                    startTime: conflictingBooking.startTime.toISOString(),
                    endTime: conflictingBooking.endTime.toISOString()
                },
                message: `This time slot overlaps with the approved event: "${conflictingBooking.eventName}".`
            });
        } else {
            console.log(`[Availability Check] Auditorium ${auditoriumId} is AVAILABLE from ${startTime} to ${endTime}`);
            res.status(200).json({
                success: true,
                available: true,
                message: 'Time slot is available.'
            });
        }

    } catch (error) {
        console.error(`[Error] Checking availability for Auditorium ${auditoriumId}:`, error);
        res.status(500).json({ success: false, message: 'Server error checking availability.' });
    }
};