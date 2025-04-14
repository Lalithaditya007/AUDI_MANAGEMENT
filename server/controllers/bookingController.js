// server/controllers/bookingController.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

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

  // Determine the file path whether it's an object from multer or a direct path string
  const filePath = typeof file === 'string' && file.startsWith('/uploads/')
    ? path.join(__dirname, '..', file) // Relative path from /uploads/
    : file.path; // Assuming file.path from multer

  if (filePath) {
    const fullPath = path.resolve(filePath);
    console.log(`[CLEANUP] Attempting delete: ${fullPath}`);
    fs.unlink(fullPath, (err) => {
      if (err && err.code !== 'ENOENT') { // Ignore error if file doesn't exist
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
        // Get the file path if an image was uploaded
        const eventImage = req.file ? `/uploads/${req.file.filename}` : null;

        const booking = await Booking.create({
            eventName: req.body.eventName,
            description: req.body.description,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            auditorium: req.body.auditorium,
            department: req.body.department,
            user: req.user._id,
            eventImages: eventImage ? [eventImage] : [], // Save the path in the array
            status: 'pending'
        });

        // Populate necessary fields for the email
        const populatedBooking = await Booking.findById(booking._id)
            .populate('user', 'email username')
            .populate('auditorium', 'name location')
            .populate('department', 'name');

        // Send pending booking notification email
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
            // Don't throw error - continue with response even if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: booking
        });

    } catch (error) {
        // If error occurs, delete uploaded file
        if (req.file) {
            const fs = require('fs');
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
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
      .populate('auditorium', 'name location capacity') // Populate necessary fields
      .populate('department', 'name code')
      .sort({ startTime: -1 }); // Sort by most recent start time first

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
    const filtersApplied = {}; // To reflect filters in the response

    // --- Apply Filters ---
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
      query.eventName = { $regex: req.query.eventName, $options: 'i' }; // Case-insensitive search
      filtersApplied.eventName = req.query.eventName;
    }
    if (req.query.userEmail) {
      // Find user IDs matching the email pattern
      const users = await User.find({ email: { $regex: req.query.userEmail, $options: 'i' } }).select('_id');
      const userIds = users.map(user => user._id);
      if (userIds.length === 0) {
        // If no users match, return empty result immediately
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
      // Find bookings overlapping the specified date (converted to UTC for DB query)
      const startOfDayUTC = targetDateLuxon.startOf('day').toUTC().toJSDate();
      const endOfDayUTC = targetDateLuxon.endOf('day').toUTC().toJSDate();
      query.startTime = { $lt: endOfDayUTC }; // Booking starts before the end of the day
      query.endTime = { $gt: startOfDayUTC }; // Booking ends after the start of the day
      filtersApplied.date = req.query.date;
    }

    // --- Fetch Bookings ---
    const bookings = await Booking.find(query)
      .populate('user', 'username email')
      .populate('auditorium', 'name location capacity')
      .populate('department', 'name code')
      .sort({ createdAt: -1 }); // Sort by creation date, newest first

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
 * @route   PATCH /api/bookings/admin/approve/:id
 * @access  Private (Admin)
 */
exports.approveBooking = async (req, res, next) => {
  const bookingId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ success: false, message: "Invalid Booking ID format." });
  }

  try {
    const booking = await Booking.findById(bookingId)
      .populate('user', 'email username') // Needed for email
      .populate('auditorium') // Needed for conflict check and email
      .populate('department', 'name'); // Needed for email

    if (!booking) {
      return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking status is already '${booking.status}'. Cannot approve.` });
    }

    // --- Double-check for conflicts right before approval ---
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id }, // Exclude the booking itself
      auditorium: booking.auditorium._id,
      status: 'approved',
      startTime: { $lt: booking.endTime },
      endTime: { $gt: booking.startTime },
    });

    if (conflict) {
      console.warn(`[Approval Conflict] Booking ${bookingId} conflicts with approved booking ${conflict._id} upon approval attempt.`);
      return res.status(409).json({ // 409 Conflict
        success: false,
        message: `Approval failed: Time slot now conflicts with another approved booking (ID: ${conflict._id}). Please review the schedule.`,
      });
    }

    // --- Update Status ---
    booking.status = 'approved';
    booking.rejectionReason = undefined; // Clear any previous rejection reason if applicable (though unlikely)
    const updatedBooking = await booking.save();

    console.log(`[Success] Booking ${updatedBooking._id} approved.`);

    // --- Send Approval Email (Non-critical) ---
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

    // --- Success Response ---
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
 * @route   PATCH /api/bookings/admin/reject/:id
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
      .populate('user', 'email username') // Needed for email
      .populate('auditorium') // Needed for email
      .populate('department', 'name'); // Needed for email

    if (!booking) {
      return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking status is already '${booking.status}'. Cannot reject.` });
    }

    // --- Update Status and Reason ---
    booking.status = 'rejected';
    booking.rejectionReason = rejectionReason.trim();
    const updatedBooking = await booking.save();

    console.log(`[Success] Booking ${updatedBooking._id} rejected. Reason: ${updatedBooking.rejectionReason}`);

    // --- Send Rejection Email (Non-critical) ---
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

    // --- Success Response ---
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
  const groupByField = req.query.groupBy; // 'auditorium' or 'department' or undefined/null
  console.log(`[API Call] GET /api/bookings/admin/stats | GroupBy: ${groupByField || 'overall'}`);

  try {
    let aggregationPipeline = [];

    if (groupByField === 'auditorium' || groupByField === 'department') {
      // --- Aggregation Pipeline for Grouping by Auditorium or Department ---
      aggregationPipeline = [
        // Stage 1: Group by the specified field AND status
        {
          $group: {
            _id: { group: `$${groupByField}`, status: '$status' },
            count: { $sum: 1 },
          },
        },
        // Stage 2: Group again by the field to collect status counts
        {
          $group: {
            _id: '$_id.group', // Group by Auditorium/Department ID
            stats: {
              $push: { k: "$_id.status", v: "$count" }, // Create key-value pairs for status counts
            },
            total: { $sum: '$count' }, // Calculate total bookings for this group
          },
        },
        // Stage 3: Lookup the name of the Auditorium/Department
        {
          $lookup: {
            from: groupByField === 'auditorium' ? 'auditoria' : 'departments', // Collection name
            localField: '_id',
            foreignField: '_id',
            as: 'groupInfo',
          },
        },
        // Stage 4: Reshape the document
        {
          $project: {
            _id: 1, // Keep the ID of the auditorium/department
            name: { $ifNull: [{ $arrayElemAt: ['$groupInfo.name', 0] }, 'Unknown/Deleted'] }, // Get the name, handle missing
            statsAsObject: { $arrayToObject: '$stats' }, // Convert [{k: 'pending', v: 5}, ...] to { pending: 5, ... }
            total: 1,
          },
        },
        // Stage 5: Merge the stats object with default values (ensures all statuses are present)
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                { _id: '$_id', name: '$name', total: '$total', pending: 0, approved: 0, rejected: 0 }, // Defaults
                '$statsAsObject', // Overwrite defaults with actual counts
              ],
            },
          },
        },
        // Stage 6: Sort by name
        { $sort: { name: 1 } },
      ];
    } else {
      // --- Aggregation Pipeline for Overall Stats ---
      aggregationPipeline = [
        // Stage 1: Group by status
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        // Stage 2: Group everything to calculate total and create key-value pairs
        {
          $group: {
            _id: null, // Group all documents together
            stats: {
              $push: { k: "$_id", v: "$count" }, // e.g., [{k:'pending', v:10}, {k:'approved', v:50}]
            },
            total: { $sum: "$count" },
          },
        },
        // Stage 3: Reshape into the final object format with defaults
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                { total: 0, pending: 0, approved: 0, rejected: 0 }, // Default values
                { $arrayToObject: "$stats" },                         // Convert stats array to object {pending: 10, approved: 50}
                { total: { $ifNull: ["$total", 0] } },                // Ensure total is included, default to 0 if no bookings exist
              ],
            },
          },
        },
      ];
    }

    const statsResult = await Booking.aggregate(aggregationPipeline);

    // Determine response format based on grouping
    const responseData = (groupByField === 'auditorium' || groupByField === 'department')
      ? statsResult // Result is an array when grouped
      : (statsResult[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }); // Result is single object or default

    res.status(200).json({
      success: true,
      groupedBy: groupByField || 'overall',
      data: responseData,
    });

  } catch (error) {
    console.error(`[Error] Get booking stats (GroupBy: ${groupByField || 'overall'}) failed:`, error);
    res.status(500).json({ success: false, message: 'Server error retrieving booking statistics.' });
  }
};

/**
 * @desc    Withdraw/Cancel a booking (by the user who made it)
 * @route   DELETE /api/bookings/withdraw/:id
 * @access  Private (User - needs login)
 */
exports.withdrawBooking = async (req, res, next) => {
  const bookingId = req.params.id;
  const userId = req.user._id;

  console.log(`[API Call] DELETE /api/bookings/withdraw/${bookingId} | User: ${userId}`);

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ success: false, message: 'Invalid Booking ID format.' });
  }

  try {
    // Find the booking only if it belongs to the current user
    const booking = await Booking.findOne({ _id: bookingId, user: userId });

    if (!booking) {
      // Either booking doesn't exist OR it doesn't belong to this user
      return res.status(404).json({ success: false, message: 'Booking not found or you do not have permission to modify it.' });
    }

    // Check if the booking status allows withdrawal
    if (!['pending', 'approved'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw booking: Current status is '${booking.status}'. Only pending or approved bookings can be withdrawn.`,
      });
    }

    // --- Cleanup associated files (if any) before deleting the record ---
    if (booking.eventImages && booking.eventImages.length > 0) {
      booking.eventImages.forEach(imagePath => {
        if (imagePath) {
          console.log(`[Withdrawal] Cleaning up image: ${imagePath}`);
          cleanupUploadedFileOnError(imagePath); // Use the helper function
        }
      });
    }

    // --- Delete the booking ---
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
 * @route   PATCH /api/bookings/reschedule/:id
 * @access  Private (User - needs login)
 */
exports.requestReschedule = async (req, res, next) => {
  const bookingId = req.params.id;
  const userId = req.user._id;
  const { newStartTime, newEndTime } = req.body;

  console.log(`[API Call] PATCH /api/bookings/reschedule/${bookingId} | User: ${userId}`);

  // --- Basic Validation ---
  if (!newStartTime || !newEndTime) {
    return res.status(400).json({ success: false, message: 'New start time and new end time are required.' });
  }
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ success: false, message: 'Invalid Booking ID format.' });
  }

  try {
    // Find the booking, ensuring it belongs to the user
    const booking = await Booking.findOne({ _id: bookingId, user: userId })
      .populate('auditorium') // Needed for conflict check
      .populate('department', 'name'); // Needed for response maybe

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or you do not have permission to modify it.' });
    }

    // Only allow rescheduling for 'approved' bookings
    if (booking.status !== 'approved') {
      return res.status(400).json({ success: false, message: `Cannot request reschedule: Booking status is '${booking.status}'. Only approved bookings can be rescheduled.` });
    }

    // --- Validate New Dates/Times ---
    const startLuxonNew = DateTime.fromISO(newStartTime);
    const endLuxonNew = DateTime.fromISO(newEndTime);

    if (!startLuxonNew.isValid || !endLuxonNew.isValid) {
      return res.status(400).json({ success: false, message: 'Invalid new date/time format provided. Use ISO 8601.' });
    }

    const startDateNew = startLuxonNew.toJSDate();
    const endDateNew = endLuxonNew.toJSDate();

    if (startDateNew >= endDateNew) {
      return res.status(400).json({ success: false, message: 'New end time must be strictly after new start time.' });
    }

    // Check opening hours for the new time
    const startLuxonNewIST = startLuxonNew.setZone(istTimezone);
    if (startLuxonNewIST.hour < openingHourIST) {
      return res.status(400).json({ success: false, message: `New start time cannot be before ${openingHourIST}:00 AM ${istTimezone}.` });
    }

    // Check lead time for the new time
    const now = DateTime.now();
    if (startLuxonNew < now.plus({ hours: bookingLeadTimeHours })) {
      return res.status(400).json({ success: false, message: `New start time must be at least ${bookingLeadTimeHours} hours in advance.` });
    }

    // Prevent reschedule if times haven't actually changed
    if (booking.startTime.getTime() === startDateNew.getTime() && booking.endTime.getTime() === endDateNew.getTime()) {
      return res.status(400).json({ success: false, message: `Reschedule failed: The requested new times are the same as the current booking times.` });
    }

    // --- Check for Conflicts with the *New* Time Slot ---
    const conflictNew = await Booking.findOne({
      _id: { $ne: booking._id }, // Exclude self
      auditorium: booking.auditorium._id,
      status: 'approved',
      startTime: { $lt: endDateNew },
      endTime: { $gt: startDateNew },
    });

    if (conflictNew) {
      console.warn(`[Reschedule Conflict] Request for booking ${bookingId} conflicts with approved booking ${conflictNew._id}.`);
      return res.status(409).json({ // 409 Conflict
        success: false,
        message: `Requested new time slot conflicts with another approved booking (ID: ${conflictNew._id}). Please choose a different time.`,
      });
    }

    // --- Update Booking: Set new times and change status back to 'pending' ---
    booking.startTime = startDateNew;
    booking.endTime = endDateNew;
    booking.status = 'pending'; // Requires admin re-approval
    booking.rejectionReason = undefined; // Clear any previous rejection reason
    const updatedBookingBasic = await booking.save();

    console.log(`[Success] Booking ${bookingId} reschedule requested by user ${userId}. Status reset to 'pending'.`);

    // Re-populate for the response to include user/auditorium/department details
    const updatedBookingPopulated = await Booking.findById(updatedBookingBasic._id)
      .populate('user', 'email username')
      .populate('auditorium')
      .populate('department', 'name');

    // --- Success Response ---
    // Note: No automatic email notification here for the reschedule request itself,
    // but the admin will see it as 'pending'. An approval/rejection email will be sent later.
    res.status(200).json({
      success: true,
      message: 'Reschedule request submitted successfully. It is now pending re-approval by the admin.',
      data: updatedBookingPopulated,
    });

  } catch (error) {
    console.error(`[Error] Request reschedule for booking ${bookingId} failed:`, error);
    if (!res.headersSent) {
      if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Server error processing reschedule request.' });
    }
  }
};

/**
 * @desc    Get the schedule (approved bookings) for a specific auditorium for a given month/year
 * @route   GET /api/bookings/schedule/:auditoriumId?year=YYYY&month=M
 * @access  Private (User - needs login)
 */
exports.getAuditoriumSchedule = async (req, res, next) => {
  const { auditoriumId } = req.params;
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10); // JS months are 0-indexed, Luxon uses 1-12

  console.log(`[API Call] GET /api/bookings/schedule/${auditoriumId} | Year: ${year}, Month: ${month}`);

  // --- Validation ---
  if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
    return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' });
  }
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) {
    return res.status(400).json({ success: false, message: 'Valid year and month (1-12) query parameters are required.' });
  }

  try {
    // --- Calculate Date Range (in UTC for DB Query) ---
    // Use Luxon with the specified timezone to correctly determine month boundaries
    const startOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month');
    const endOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).endOf('month');

    // Convert boundaries to UTC JS Dates for the Mongoose query
    const startOfMonthUTC = startOfMonthLocal.toUTC().toJSDate();
    const endOfMonthUTC = endOfMonthLocal.toUTC().toJSDate();

    console.log(`[DEBUG] Schedule Query UTC Range: ${startOfMonthUTC.toISOString()} - ${endOfMonthUTC.toISOString()}`);

    // --- Fetch Approved Bookings in Range ---
    const scheduleBookings = await Booking.find({
      auditorium: auditoriumId,
      status: 'approved', // Only show confirmed schedule slots
      // Overlap condition: (Booking Start < End of Month) AND (Booking End > Start of Month)
      startTime: { $lt: endOfMonthUTC },
      endTime: { $gt: startOfMonthUTC },
    })
    .populate('user', 'username email') // Include user info if needed
    .select('eventName startTime endTime user description') // Select only relevant fields
    .sort({ startTime: 1 }); // Order chronologically

    res.status(200).json({
      success: true,
      message: `Schedule fetched for ${startOfMonthLocal.toFormat('MMMM yyyy')}`,
      count: scheduleBookings.length,
      data: scheduleBookings,
    });

  } catch (error) {
    console.error(`[Error] Fetching schedule for Auditorium ${auditoriumId}, ${month}/${year}:`, error);
    res.status(500).json({ success: false, message: 'Server error retrieving auditorium schedule.' });
  }
};


/**
 * @desc    Get recently created pending booking requests (Admin dashboard widget)
 * @route   GET /api/bookings/admin/recent-pending?limit=N
 * @access  Private (Admin)
 */
exports.getRecentPendingBookings = async (req, res, next) => {
  const limit = parseInt(req.query.limit, 10);
  // Set a default limit and a maximum cap
  const effectiveLimit = (!isNaN(limit) && limit > 0) ? Math.min(limit, 20) : 5;

  console.log(`[API Call] GET /api/bookings/admin/recent-pending | Limit: ${effectiveLimit}`);

  try {
    const recentPending = await Booking.find({ status: 'pending' })
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(effectiveLimit)
      .populate('user', 'username email')
      .populate('auditorium', 'name')
      .populate('department', 'name code');

    res.status(200).json({
      success: true,
      count: recentPending.length,
      limit: effectiveLimit,
      data: recentPending,
    });

  } catch (error) {
    console.error("[Error] Fetch recent pending bookings failed:", error);
    res.status(500).json({ success: false, message: 'Server error retrieving recent pending booking requests.' });
  }
};

/**
 * @desc    Get upcoming approved bookings within the next N days (Admin dashboard widget)
 * @route   GET /api/bookings/admin/upcoming?days=N
 * @access  Private (Admin)
 */
exports.getUpcomingBookings = async (req, res, next) => {
  const days = parseInt(req.query.days, 10);
  // Set a default lookahead period and a maximum cap
  const effectiveDays = (!isNaN(days) && days > 0) ? Math.min(days, 30) : 7;

  console.log(`[API Call] GET /api/bookings/admin/upcoming | Days: ${effectiveDays}`);

  try {
    const now = DateTime.now().toJSDate(); // Start from now
    const futureDate = DateTime.now().plus({ days: effectiveDays }).endOf('day').toJSDate(); // End of Nth day from now

    console.log(`[DEBUG] Upcoming query range: ${now.toISOString()} - ${futureDate.toISOString()}`);

    const upcomingBookings = await Booking.find({
      status: 'approved',
      startTime: { $gte: now, $lt: futureDate }, // Starts between now and N days from now
    })
    .sort({ startTime: 1 }) // Sort chronologically
    .populate('user', 'username email')
    .populate('auditorium', 'name')
    .populate('department', 'name code');

    res.status(200).json({
      success: true,
      count: upcomingBookings.length,
      days: effectiveDays,
      data: upcomingBookings,
    });

  } catch (error) {
    console.error("[Error] Fetch upcoming bookings failed:", error);
    res.status(500).json({ success: false, message: 'Server error retrieving upcoming approved bookings.' });
  }
};

/**
 * @desc    Get booking trends (count per day) over the last N days, optionally filtered
 * @route   GET /api/bookings/admin/trends?days=N&auditoriumId=ID&departmentId=ID
 * @access  Private (Admin)
 */
exports.getBookingTrends = async (req, res, next) => {
  const days = parseInt(req.query.days, 10);
  const auditoriumId = req.query.auditoriumId;
  const departmentId = req.query.departmentId;
  // Set default days and maximum cap
  const effectiveDays = (!isNaN(days) && days > 0) ? Math.min(days, 90) : 30;

  console.log(`[API Call] GET /api/bookings/admin/trends | Days: ${effectiveDays}, AudiID: ${auditoriumId || 'N/A'}, DeptID: ${departmentId || 'N/A'}`);

  try {
    // Calculate start date for the trend period
    const startDate = DateTime.now().minus({ days: effectiveDays }).startOf('day').toJSDate();
    console.log(`[DEBUG] Trends query start date (UTC): ${startDate.toISOString()}`);

    // --- Build Match Stage for Aggregation ---
    const matchStage = {
      createdAt: { $gte: startDate }, // Filter by creation date within the period
    };
    if (auditoriumId && mongoose.Types.ObjectId.isValid(auditoriumId)) {
      matchStage.auditorium = new mongoose.Types.ObjectId(auditoriumId);
      console.log(`[DEBUG] Filtering trends by Auditorium: ${auditoriumId}`);
    } else if (auditoriumId) {
      console.warn(`[WARN] Invalid auditoriumId passed to trends: ${auditoriumId}`);
    }
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      matchStage.department = new mongoose.Types.ObjectId(departmentId);
      console.log(`[DEBUG] Filtering trends by Department: ${departmentId}`);
    } else if (departmentId) {
      console.warn(`[WARN] Invalid departmentId passed to trends: ${departmentId}`);
    }

    // --- Aggregation Pipeline ---
    const aggregationPipeline = [
      // Stage 1: Filter bookings based on criteria
      { $match: matchStage },
      // Stage 2: Group by creation date (day level, using IST for grouping)
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: istTimezone } // Group by YYYY-MM-DD in IST
          },
          count: { $sum: 1 }, // Count bookings per day
        },
      },
      // Stage 3: Reshape the output
      {
        $project: {
          _id: 0, // Exclude the default _id
          date: "$_id", // Rename _id (the date string) to 'date'
          count: 1, // Include the count
        },
      },
      // Stage 4: Sort by date chronologically
      { $sort: { date: 1 } },
    ];

    const trendsData = await Booking.aggregate(aggregationPipeline);

    // --- Fill Missing Dates with Zero Counts ---
    const filledTrends = [];
    let currentDate = DateTime.fromJSDate(startDate).setZone(istTimezone); // Start from the beginning of the period in IST
    const endDate = DateTime.now().setZone(istTimezone).startOf('day'); // Go up to today in IST
    const trendsMap = new Map(trendsData.map(item => [item.date, item.count])); // Efficient lookup

    while (currentDate <= endDate) {
      const dateString = currentDate.toFormat('yyyy-MM-dd');
      filledTrends.push({
        date: dateString,
        count: trendsMap.get(dateString) || 0, // Get count from map or default to 0
      });
      currentDate = currentDate.plus({ days: 1 }); // Move to the next day
    }

    res.status(200).json({
      success: true,
      days: effectiveDays,
      filters: { auditoriumId, departmentId }, // Reflect applied filters
      data: filledTrends, // Return the array with all days in the period
    });

  } catch (error) {
    console.error(`[Error] Fetch booking trends failed (Filters: Audi-${auditoriumId || 'N/A'}, Dept-${departmentId || 'N/A'}):`, error);
    res.status(500).json({ success: false, message: 'Server error retrieving booking trends.' });
  }
};


/**
 * @desc    Get booked time slots (approved only) for an auditorium in a given month/year
 * @route   GET /api/bookings/availability/:auditoriumId?year=YYYY&month=M
 * @access  Private (User - needs login)
 */
exports.getAuditoriumAvailability = async (req, res, next) => {
  const { auditoriumId } = req.params;
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);

  console.log(`[API Call] GET /api/bookings/availability/${auditoriumId} | Year: ${year}, Month: ${month}`);

  // --- Validation ---
  if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
    return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' });
  }
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) {
    return res.status(400).json({ success: false, message: 'Valid year and month (1-12) query parameters are required.' });
  }

  try {
    // --- Calculate Date Range (in UTC) ---
    const startOfMonthUTC = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month').toUTC().toJSDate();
    const endOfMonthUTC = DateTime.local(year, month, 1, { zone: istTimezone }).endOf('month').toUTC().toJSDate();

    console.log(`[DEBUG] Availability query UTC Range: ${startOfMonthUTC.toISOString()} - ${endOfMonthUTC.toISOString()}`);

    // --- Fetch Approved Bookings Overlapping the Month ---
    const bookedSlots = await Booking.find({
      auditorium: auditoriumId,
      status: 'approved', // Only interested in confirmed bookings
      startTime: { $lt: endOfMonthUTC }, // Starts before month ends
      endTime: { $gt: startOfMonthUTC } // Ends after month starts
    })
    .select('startTime endTime -_id') // Only fetch the start and end times, exclude the default _id
    .lean(); // Use lean for performance as we only need plain JS objects

    res.status(200).json({
      success: true,
      message: `Availability fetched for month ${year}-${String(month).padStart(2, '0')}`,
      count: bookedSlots.length,
      data: bookedSlots, // Array of {startTime, endTime} objects
    });

  } catch (error) {
    console.error(`[Error] Fetching availability for Auditorium ${auditoriumId}, ${month}/${year}:`, error);
    res.status(500).json({ success: false, message: 'Server error retrieving auditorium availability.' });
  }
};

/**
 * @desc    Get current and upcoming events
 * @route   GET /api/bookings/public/events
 * @access  Public
 */
exports.getPublicEvents = async (req, res) => {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = await Booking.find({
      status: 'approved',
      $or: [
        // Current events (happening now)
        {
          startTime: { $lte: now },
          endTime: { $gte: now }
        },
        // Upcoming events (within next 7 days)
        {
          startTime: { $gt: now, $lt: nextWeek }
        }
      ]
    })
    .sort({ startTime: 1 })
    .populate('auditorium', 'name')
    .select('eventName startTime endTime auditorium eventImages'); // Added eventImages field

    console.log('Found events:', events); // Debug log

    res.status(200).json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error("[Error] Fetch public events failed:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching events' 
    });
  }
};