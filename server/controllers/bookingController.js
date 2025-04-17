// server/controllers/bookingController.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon'); // Ensure Luxon is imported

const Booking = require('../models/Booking');
const Auditorium = require('../models/Auditorium');
const User = require('../models/User');
const Department = require('../models/Department');
const {
    sendBookingRequestEmail,
    sendBookingApprovalEmail,
    sendBookingRejectionEmail,
    sendBookingRequestNotificationToAdmin
} = require('../utils/emailService'); // Assuming this path is correct

// --- Constants ---
const istTimezone = 'Asia/Kolkata';
const openingHourIST = 9; // Bookings cannot start before 9 AM IST
const bookingLeadTimeHours = 2; // Bookings must be made at least 2 hours in advance
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Add this to your .env file

// --- Helper: File Cleanup ---
const cleanupUploadedFileOnError = (file) => {
    if (!file) { return; }
    // Prefer file.path if available (multer object), fallback to string logic
    const filePath = file.path ? file.path : (typeof file === 'string' && file.startsWith('/uploads/') ? path.join(__dirname, '..', file) : null);
    if (filePath) {
        const fullPath = path.resolve(filePath); // Ensure absolute path
        console.log(`[CLEANUP] Attempting delete: ${fullPath}`);
        fs.unlink(fullPath, (err) => {
            if (err && err.code !== 'ENOENT') { // Ignore if file already doesn't exist
                console.error(`[CLEANUP] FAILED delete ${fullPath}:`, err);
            } else if (!err) {
                console.log(`[CLEANUP] Success delete: ${fullPath}`);
            }
        });
    } else {
        console.warn('[CLEANUP] Could not determine file path for cleanup from:', file);
    }
};


// --- Helper: Booking Time Validation ---
const validateBookingTime = (startTimeISO, endTimeISO, leadTimeHrs = bookingLeadTimeHours, openHour = openingHourIST) => {
    const start = DateTime.fromISO(startTimeISO);
    const end = DateTime.fromISO(endTimeISO);

    if (!start.isValid || !end.isValid) {
        return { valid: false, message: 'Invalid start or end time format. Please use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).' };
    }
    if (start >= end) {
        return { valid: false, message: 'End time must be strictly after start time.' };
    }

    const startIST = start.setZone(istTimezone);
    if (startIST.hour < openHour) {
        return { valid: false, message: `Booking cannot start before ${openHour}:00 AM ${istTimezone}.` };
    }

    const now = DateTime.now();
    if (start < now.plus({ hours: leadTimeHrs })) {
        return { valid: false, message: `Booking must be made at least ${leadTimeHrs} hours in advance.` };
    }

    // Return JS Date objects (in UTC) for Mongoose
    return { valid: true, message: 'Time validation passed.', start: start.toJSDate(), end: end.toJSDate() };
};


// ==================================================
//             BOOKING CONTROLLER FUNCTIONS
// ==================================================

/** createBooking */
exports.createBooking = async (req, res) => {
    let uploadedFilePath = null; // Store path for potential cleanup
    try {
        const { eventName, description, startTime, endTime, auditorium, department } = req.body;
        const userId = req.user._id;

        // --- 1. Basic Input Validation ---
        if (!eventName || !description || !startTime || !endTime || !auditorium || !department) {
            return res.status(400).json({ success: false, message: 'Missing required booking fields.' });
        }
        if (!mongoose.Types.ObjectId.isValid(auditorium) || !mongoose.Types.ObjectId.isValid(department)) {
            return res.status(400).json({ success: false, message: 'Invalid Auditorium or Department ID format.' });
        }

        // --- 2. Time Validation ---
        const timeValidation = validateBookingTime(startTime, endTime);
        if (!timeValidation.valid) {
            return res.status(400).json({ success: false, message: timeValidation.message });
        }
        const validatedStartTime = timeValidation.start; // Use JS Date from validation
        const validatedEndTime = timeValidation.end;     // Use JS Date from validation

        // --- 3. Check for Immediate Conflicts ---
        const immediateConflict = await Booking.findOne({
            auditorium: auditorium,
            status: 'approved',
            startTime: { $lt: validatedEndTime }, // Starts before the new end time
            endTime: { $gt: validatedStartTime }  // Ends after the new start time
        });

        if (immediateConflict) {
            console.warn(`[Create Booking] Immediate conflict detected for user ${userId} trying to book auditorium ${auditorium} for ${startTime}-${endTime}. Conflict with booking ${immediateConflict._id} (${immediateConflict.eventName}).`);
            return res.status(409).json({
                success: false,
                message: `The requested time slot conflicts with an existing approved booking (${immediateConflict.eventName}). Please choose a different time.`
            });
        }

        // --- 4. Handle File Upload --- (Place after validation)
        const eventImage = req.file ? `/uploads/${req.file.filename}` : null;
        if(req.file) {
           uploadedFilePath = req.file.path; // Save for cleanup if needed
        }


        // --- 5. Create Booking Document ---
        const booking = await Booking.create({
            eventName: eventName.trim(),
            description: description.trim(),
            startTime: validatedStartTime, // Use validated date
            endTime: validatedEndTime,     // Use validated date
            auditorium: auditorium,
            department: department,
            user: userId,
            eventImages: eventImage ? [eventImage] : [],
            status: 'pending' // Default status
        });

        // --- 6. Populate for Emails ---
        const populatedBooking = await Booking.findById(booking._id)
            .populate('user', 'email username')
            .populate('auditorium', 'name location')
            .populate('department', 'name');

        if (!populatedBooking) {
            // Should not happen if create succeeded, but good practice
             console.error(`[Critical Error] Failed to populate newly created booking ${booking._id}`);
             // Clean up potentially created booking document? Less critical than the file usually.
             throw new Error("Failed to retrieve details of the created booking.");
        }

        // --- 7. Send Emails (User Confirmation + Admin Notification) ---
        try {
            if (populatedBooking.user?.email) {
                 await sendBookingRequestEmail(populatedBooking.user.email, populatedBooking, populatedBooking.auditorium, populatedBooking.department);
                 console.log(`[Email Sent] Booking request confirmation sent for ${booking._id} to ${populatedBooking.user.email}`);
            } else {
                 console.warn(`[Email Skipped] User email missing for booking ${booking._id}. Cannot send confirmation.`);
            }
        } catch (emailError) {
            console.error(`[Non-critical Error] Sending user confirmation email failed for booking ${booking._id}:`, emailError.message || emailError);
            // Do not fail the request, just log the error
        }

        if (ADMIN_EMAIL) {
            try {
                await sendBookingRequestNotificationToAdmin(
                    ADMIN_EMAIL,
                    populatedBooking,
                    populatedBooking.auditorium,
                    populatedBooking.department
                );
                console.log(`[Email Sent] Admin notification sent for booking ${booking._id} to ${ADMIN_EMAIL}`);
            } catch (emailError) {
                console.error('[Non-critical Error] Sending admin notification email failed:', emailError.message || emailError);
                // Do not fail the request, just log the error
            }
        } else {
            console.warn('[Warning] ADMIN_EMAIL not configured in environment variables. Skipping admin notification.');
        }

        // --- 8. Send Success Response ---
        res.status(201).json({ success: true, message: 'Booking request created successfully and is pending approval.', data: populatedBooking }); // Return populated data

    } catch (error) {
        // --- Error Handling & Cleanup ---
        if (req.file && uploadedFilePath) {
            // Use the stored path from the successful upload attempt
             cleanupUploadedFileOnError({ path: uploadedFilePath }); // Pass as object to match helper structure
        } else if (req.file) {
             // Fallback if path wasn't stored (shouldn't happen ideally)
             cleanupUploadedFileOnError(req.file);
        }
        console.error("[Error] Create Booking Failed:", error);

        // Handle potential Mongoose validation errors specifically
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
         // Handle CastError for invalid ObjectIds if not caught earlier
         if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid ID format provided: ${error.value}` });
        }


        // Generic server error
        res.status(500).json({ success: false, message: error.message || 'Server error creating booking request.' });
    }
};

/** getMyBookings */
exports.getMyBookings = async (req, res, next) => {
  const userId = req.user._id;
  try {
    const userBookings = await Booking.find({ user: userId })
      .populate('auditorium', 'name location capacity')
      .populate('department', 'name code')
      .sort({ startTime: -1 }); // Sort by start time, most recent first

    res.status(200).json({
      success: true,
      count: userBookings.length,
      data: userBookings
    });
  } catch (error) {
    console.error(`[Error] Fetching bookings for user ${userId} failed:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving your bookings.'
    });
  }
};

/** getAllBookings (Admin) */
exports.getAllBookings = async (req, res, next) => {
    try {
        const query = {};
        const filtersApplied = {};

        // Status Filter
        if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status.toLowerCase())) {
            query.status = req.query.status.toLowerCase();
            filtersApplied.status = query.status;
        }

        // Auditorium Filter
        if (req.query.auditoriumId && mongoose.Types.ObjectId.isValid(req.query.auditoriumId)) {
            query.auditorium = req.query.auditoriumId;
            filtersApplied.auditoriumId = req.query.auditoriumId;
        } else if (req.query.auditoriumId) {
             console.warn(`[Admin All Bookings] Invalid Auditorium ID in filter: ${req.query.auditoriumId}`);
        }

        // Department Filter
        if (req.query.departmentId && mongoose.Types.ObjectId.isValid(req.query.departmentId)) {
            query.department = req.query.departmentId;
            filtersApplied.departmentId = req.query.departmentId;
        } else if (req.query.departmentId) {
             console.warn(`[Admin All Bookings] Invalid Department ID in filter: ${req.query.departmentId}`);
        }

        // Event Name Filter (Case-Insensitive)
        if (req.query.eventName) {
            query.eventName = { $regex: req.query.eventName, $options: 'i' };
            filtersApplied.eventName = req.query.eventName;
        }

        // User Email Filter (Case-Insensitive)
        if (req.query.userEmail) {
            const users = await User.find({ email: { $regex: req.query.userEmail, $options: 'i' } }).select('_id');
            const userIds = users.map(u => u._id);
            if (userIds.length === 0) {
                 // If no user matches the email filter, return empty results directly
                return res.status(200).json({ success: true, count: 0, filtersApplied, data: [] });
            }
            query.user = { $in: userIds };
            filtersApplied.userEmail = req.query.userEmail;
        }

        // Date Filter (Based on IST Day Overlap)
        if (req.query.date) {
            const targetDate = DateTime.fromISO(req.query.date, { zone: istTimezone });
            if (!targetDate.isValid) {
                return res.status(400).json({ success: false, message: `Invalid date filter format: ${req.query.date}. Use YYYY-MM-DD.` });
            }
            // Find bookings that overlap with the target day in IST
            const startOfDayUTC = targetDate.startOf('day').toUTC().toJSDate();
            const endOfDayUTC = targetDate.endOf('day').toUTC().toJSDate();
            // A booking overlaps if it starts before the end of the day AND ends after the start of the day
            query.startTime = { $lt: endOfDayUTC };
            query.endTime = { $gt: startOfDayUTC };
            filtersApplied.date = req.query.date;
            console.log(`[Admin All Bookings] Date filter active: ${startOfDayUTC.toISOString()} - ${endOfDayUTC.toISOString()} (UTC)`);
        }

        const bookings = await Booking.find(query)
            .populate('user', 'username email')
            .populate('auditorium', 'name location')
            .populate('department', 'name code')
            .sort({ createdAt: -1 }); // Sort by creation date, newest first

        res.status(200).json({
            success: true,
            count: bookings.length,
            filtersApplied,
            data: bookings
        });

    } catch (error) {
        console.error("[Error] Admin getting all bookings failed:", error);
        res.status(500).json({ success: false, message: 'Server error retrieving bookings.' });
    }
};


/** approveBooking (Admin) */
exports.approveBooking = async (req, res, next) => {
    const bookingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: "Invalid booking ID format." });
    }

    try {
        const booking = await Booking.findById(bookingId)
            .populate('user', 'email username') // Needed for email
            .populate('auditorium')            // Needed for conflict check & email
            .populate('department', 'name');    // Needed for email

        if (!booking) {
            return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Booking status is already '${booking.status}'. Only pending bookings can be approved.` });
        }

        // Check for conflicts with OTHER 'approved' bookings for the SAME auditorium
        const conflict = await Booking.findOne({
            _id: { $ne: booking._id }, // Exclude the booking itself
            auditorium: booking.auditorium._id,
            status: 'approved',
            startTime: { $lt: booking.endTime }, // Starts before this one ends
            endTime: { $gt: booking.startTime }   // Ends after this one starts
        });

        if (conflict) {
            console.warn(`[Approve Conflict] Cannot approve booking ${bookingId}. It conflicts with approved booking ${conflict._id} (${conflict.eventName}).`);
            return res.status(409).json({ // 409 Conflict status code
                success: false,
                message: `Time slot conflict detected. This booking overlaps with an existing approved booking: '${conflict.eventName}' scheduled from ${conflict.startTime.toISOString()} to ${conflict.endTime.toISOString()}.`
            });
        }

        // Update status and clear rejection reason
        booking.status = 'approved';
        booking.rejectionReason = undefined; // Ensure reason is cleared on approval

        const updatedBooking = await booking.save();
        console.log(`Booking ${updatedBooking._id} (${updatedBooking.eventName}) approved by admin.`);

        // Send approval email (Non-critical failure)
        try {
             if (booking.user?.email && booking.auditorium && booking.department) {
                await sendBookingApprovalEmail(booking.user.email, updatedBooking, booking.auditorium, booking.department);
                console.log(`[Email Sent] Approval notification sent for booking ${updatedBooking._id} to ${booking.user.email}`);
            } else {
                 console.warn(`[Email Skipped] Approval email skipped for ${updatedBooking._id}. Missing user email, auditorium, or department details.`);
            }
        } catch (e) {
            console.error(`[Non-critical Error] Sending approval email for booking ${updatedBooking._id} failed:`, e.message || e);
        }

        res.status(200).json({ success: true, message: 'Booking approved successfully.', data: updatedBooking });

    } catch (error) {
        console.error(`[Error] Approving booking ${bookingId} failed:`, error);
        // Avoid sending multiple responses
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server error during booking approval.' });
        }
    }
};


/** rejectBooking (Admin) */
exports.rejectBooking = async (req, res, next) => {
    const bookingId = req.params.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: "Invalid booking ID format." });
    }

    try {
        const booking = await Booking.findById(bookingId)
            .populate('user', 'email username') // Needed for email
            .populate('auditorium')            // Needed for email
            .populate('department', 'name');    // Needed for email

        if (!booking) {
            return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Booking status is already '${booking.status}'. Only pending bookings can be rejected.` });
        }

        // Update status and set rejection reason
        booking.status = 'rejected';
        booking.rejectionReason = rejectionReason.trim();

        const updatedBooking = await booking.save();
        console.log(`Booking ${updatedBooking._id} (${updatedBooking.eventName}) rejected by admin. Reason: ${updatedBooking.rejectionReason}`);

        // Send rejection email (Non-critical failure)
        try {
            if (booking.user?.email && booking.auditorium && booking.department) {
                await sendBookingRejectionEmail(
                    booking.user.email,
                    updatedBooking,
                    booking.auditorium,
                    booking.department,
                    updatedBooking.rejectionReason // Pass the reason to the email function
                 );
                console.log(`[Email Sent] Rejection notification sent for booking ${updatedBooking._id} to ${booking.user.email}`);
            } else {
                 console.warn(`[Email Skipped] Rejection email skipped for ${updatedBooking._id}. Missing user email, auditorium, or department details.`);
            }
        } catch (e) {
            console.error(`[Non-critical Error] Sending rejection email for booking ${updatedBooking._id} failed:`, e.message || e);
        }

        res.status(200).json({ success: true, message: 'Booking rejected successfully.', data: updatedBooking });

    } catch (error) {
        console.error(`[Error] Rejecting booking ${bookingId} failed:`, error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server error during booking rejection.' });
        }
    }
};


/** getBookingStats (Admin) */
exports.getBookingStats = async (req, res, next) => {
    const groupByField = req.query.groupBy; // e.g., 'auditorium', 'department', or none for overall
    console.log(`GET /stats requested | Grouping by: ${groupByField || 'overall'}`);

    try {
        let pipeline = [];

        if (groupByField === 'auditorium' || groupByField === 'department') {
             // Group by status within the specified field first
            pipeline = [
                {
                    $group: {
                        _id: {
                            group: `$${groupByField}`, // Group by auditorium ID or department ID
                            status: '$status'        // Sub-group by status
                        },
                        count: { $sum: 1 }
                    }
                },
                 // Group again by the main field to structure stats
                {
                    $group: {
                         _id: '$_id.group', // The auditorium/department ID
                        stats: {
                            $push: { k: "$_id.status", v: "$count" } // Create key-value pairs for status counts
                         },
                        total: { $sum: '$count' } // Calculate total per group
                    }
                },
                // Convert the stats array into an object
                 {
                    $addFields: {
                        statsAsObject: { $arrayToObject: '$stats' }
                    }
                },
                // Perform a lookup to get the name of the auditorium/department
                 {
                    $lookup: {
                         from: groupByField === 'auditorium' ? 'auditoria' : 'departments', // Collection name
                         localField: '_id',      // Booking's auditorium/department field (which is the _id from previous $group)
                         foreignField: '_id', // Auditorium/Department collection's _id field
                         as: 'groupInfo'
                     }
                 },
                // Reshape the document
                 {
                     $project: {
                         _id: 1, // Keep the auditorium/department ID
                         // Safely get the name, default to 'Unknown' if lookup fails or name missing
                         name: { $ifNull: [{ $arrayElemAt: ['$groupInfo.name', 0] }, 'Unknown / Deleted'] },
                         total: 1,
                        // Explicitly project status counts, defaulting to 0
                        pending: { $ifNull: ['$statsAsObject.pending', 0] },
                        approved: { $ifNull: ['$statsAsObject.approved', 0] },
                        rejected: { $ifNull: ['$statsAsObject.rejected', 0] }
                    }
                 },
                { $sort: { name: 1 } } // Sort alphabetically by name
            ];
        } else {
            // Overall stats (not grouped by auditorium or department)
            pipeline = [
                {
                    $group: {
                         _id: '$status', // Group by status only
                        count: { $sum: 1 }
                    }
                 },
                // Group all statuses into a single document
                 {
                     $group: {
                        _id: null, // Group all documents together
                        stats: { $push: { k: "$_id", v: "$count" } }, // Create key-value pairs
                         total: { $sum: "$count" } // Calculate the grand total
                     }
                 },
                // Reshape into the desired format with defaults
                 {
                     $replaceRoot: {
                         newRoot: {
                            $mergeObjects: [
                                { total: 0, pending: 0, approved: 0, rejected: 0 }, // Default values
                                 { $arrayToObject: "$stats" }, // Convert {k:status, v:count} pairs into object
                                { total: { $ifNull: ["$total", 0] } } // Overwrite total with calculated value (or 0 if no bookings)
                             ]
                         }
                    }
                 }
             ];
         }

        const result = await Booking.aggregate(pipeline);

        // Adjust response structure based on grouping
        const data = (groupByField === 'auditorium' || groupByField === 'department')
            ? result // Result is already an array of objects { _id, name, total, pending, approved, rejected }
             : (result[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }); // Result is a single object or defaults

        res.status(200).json({
            success: true,
            groupedBy: groupByField || 'overall',
            data: data
        });

    } catch (error) {
        console.error(`[Error] Getting booking stats (GroupBy: ${groupByField || 'overall'}) failed:`, error);
        res.status(500).json({ success: false, message: 'Server error calculating booking statistics.' });
    }
};

/** withdrawBooking (User) */
exports.withdrawBooking = async (req, res, next) => {
    const bookingId = req.params.id;
    const userId = req.user._id;
    console.log(`DELETE /api/bookings/${bookingId} request initiated by User: ${userId}`);

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID format.' });
    }

    try {
        // Find the booking, ensuring it belongs to the current user
        const booking = await Booking.findOne({ _id: bookingId, user: userId });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found or you do not have permission to withdraw it.' });
        }

        // Check if the status allows withdrawal
        if (!['pending', 'approved'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: `Cannot withdraw a booking with status: '${booking.status}'. Only 'pending' or 'approved' bookings can be withdrawn.` });
        }

        // Additional check for 'approved' bookings: Cannot withdraw too close to the start time
        if (booking.status === 'approved') {
            const now = DateTime.now();
            const startTime = DateTime.fromJSDate(booking.startTime, { zone: 'utc' }); // Ensure we work with UTC date from DB

            // Calculate the cutoff time (X hours before the start time)
            const allowedWithdrawTime = startTime.minus({ hours: bookingLeadTimeHours }); // Default lead time constant

            if (now >= allowedWithdrawTime) { // If current time is at or after the cutoff time
                console.warn(`[Withdraw Denied] User ${userId} attempted to withdraw approved booking ${bookingId} too late. Now: ${now.toISO()}, Cutoff: ${allowedWithdrawTime.toISO()}`);
                return res.status(400).json({
                     success: false,
                     message: `Approved bookings cannot be withdrawn less than ${bookingLeadTimeHours} hours before the scheduled start time.`
                 });
            }
        }

        // If the booking has images, attempt to delete them
        if (booking.eventImages && booking.eventImages.length > 0) {
             console.log(`[Withdrawal Cleanup] Preparing to delete images for booking ${bookingId}`);
            booking.eventImages.forEach(imagePath => {
                if (imagePath) {
                     cleanupUploadedFileOnError(imagePath); // Pass the path string
                }
            });
        }

        // Delete the booking document
        await Booking.deleteOne({ _id: bookingId });
        console.log(`Booking ${bookingId} (${booking.eventName}) successfully withdrawn by user ${userId}.`);

        res.status(200).json({ success: true, message: 'Booking withdrawn successfully.' });

    } catch (error) {
        console.error(`[Error] Withdrawing booking ${bookingId} by user ${userId} failed:`, error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server error withdrawing booking.' });
        }
    }
};


/** requestReschedule (User) */
exports.requestReschedule = async (req, res, next) => {
    const bookingId = req.params.id;
    const userId = req.user._id;
    const { newStartTime, newEndTime } = req.body;
    console.log(`PUT /api/bookings/${bookingId}/reschedule request initiated by User: ${userId}`);

    if (!newStartTime || !newEndTime) {
        return res.status(400).json({ success: false, message: 'New start time and end time are required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID format.' });
    }

    try {
        // Find the booking, ensuring it belongs to the user
        const booking = await Booking.findOne({ _id: bookingId, user: userId })
            .populate('auditorium')            // Need auditorium for conflict check
            .populate('department', 'name');    // For potential future use/logging

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found or you do not have permission to modify it.' });
        }
         if (!booking.auditorium) {
              // This should generally not happen if data integrity is maintained
             console.error(`[Reschedule Error] Booking ${bookingId} is missing auditorium data.`);
             return res.status(500).json({ success: false, message: 'Internal server error: Booking data is incomplete.' });
         }


        if (booking.status !== 'approved') {
            return res.status(400).json({ success: false, message: `Only approved bookings can be rescheduled. Current status is '${booking.status}'.` });
        }

        // Validate the new times
        const timeValidation = validateBookingTime(newStartTime, newEndTime); // Uses defaults for lead time, opening hour
        if (!timeValidation.valid) {
            return res.status(400).json({ success: false, message: `Invalid new times: ${timeValidation.message}` });
        }
        const validatedStartTime = timeValidation.start;
        const validatedEndTime = timeValidation.end;

        // Check if times are actually different
        if (booking.startTime.getTime() === validatedStartTime.getTime() && booking.endTime.getTime() === validatedEndTime.getTime()) {
            return res.status(400).json({ success: false, message: `The requested new time slot is the same as the current schedule.` });
        }

        // Check for conflicts with OTHER approved bookings at the NEW time slot
        const conflictNew = await Booking.findOne({
            _id: { $ne: booking._id }, // Exclude the current booking
            auditorium: booking.auditorium._id,
            status: 'approved',
            startTime: { $lt: validatedEndTime },
            endTime: { $gt: validatedStartTime }
        });

        if (conflictNew) {
             console.warn(`[Reschedule Conflict] Reschedule request for ${bookingId} by ${userId} conflicts with approved booking ${conflictNew._id} (${conflictNew.eventName}).`);
             return res.status(409).json({ // 409 Conflict
                success: false,
                message: `The requested new time slot conflicts with another approved booking (${conflictNew.eventName}). Please choose a different time.`
             });
         }

        // Update the booking: set new times, revert status to pending, clear rejection reason
        booking.startTime = validatedStartTime;
        booking.endTime = validatedEndTime;
        booking.status = 'pending'; // Must be re-approved by admin
        booking.rejectionReason = undefined; // Clear any previous reason

        const savedBooking = await booking.save();
        console.log(`Reschedule requested for booking ${bookingId} by user ${userId}. New times: ${savedBooking.startTime.toISOString()} - ${savedBooking.endTime.toISOString()}. Status set to 'pending' for re-approval.`);

        // Optionally, send notification to admin about the reschedule request?
        // if (ADMIN_EMAIL) { try { /* ... send email ... */ } catch(e){}}

        // Repopulate user for the response if needed (or select fields)
         const populatedReschedule = await Booking.findById(savedBooking._id)
             .populate('user', 'email username')
             .populate('auditorium', 'name location')
             .populate('department', 'name');

        res.status(200).json({
            success: true,
            message: 'Reschedule request submitted. Your booking status is now pending re-approval.',
            data: populatedReschedule // Send back the updated booking
        });

    } catch (error) {
        console.error(`[Error] Rescheduling booking ${bookingId} failed:`, error);
        if (!res.headersSent) {
            if (error.name === 'ValidationError' || error.name === 'CastError') {
                return res.status(400).json({ success: false, message: `Invalid input: ${error.message}` });
            }
            res.status(500).json({ success: false, message: 'Server error processing reschedule request.' });
        }
    }
};


/** getAuditoriumSchedule (for calendar views, etc.) */
exports.getAuditoriumSchedule = async (req, res, next) => {
    const { auditoriumId } = req.params;
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // Expect month as 1-12

    console.log(`GET /api/bookings/schedule/${auditoriumId} requested | Year: ${year}, Month: ${month}`);

    if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
        return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' });
    }
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) {
        return res.status(400).json({ success: false, message: 'Valid year and month (1-12) query parameters are required.' });
    }

    try {
        // Calculate start and end of the month in IST, then convert to UTC for database query
        const startOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month');
        const endOfMonthLocal = startOfMonthLocal.endOf('month');

        const startUTC = startOfMonthLocal.toUTC().toJSDate();
        const endUTC = endOfMonthLocal.toUTC().toJSDate();

        console.log(`[Schedule Query] Fetching approved bookings for ${auditoriumId} overlapping month ${year}-${month} (UTC range: ${startUTC.toISOString()} to ${endUTC.toISOString()})`);

        // Find APPROVED bookings that OVERLAP with the requested month
        const schedule = await Booking.find({
            auditorium: auditoriumId,
            status: 'approved',
            startTime: { $lt: endUTC }, // Starts before the month ends
            endTime: { $gt: startUTC }   // Ends after the month starts
        })
        .populate('user', 'username email') // Include user details
        .select('eventName startTime endTime user description') // Select relevant fields
        .sort({ startTime: 1 }); // Sort chronologically

        res.status(200).json({
            success: true,
            message: `Schedule fetched successfully for ${startOfMonthLocal.toFormat('MMMM yyyy')}`,
            count: schedule.length,
            data: schedule // Array of booking objects
        });

    } catch (error) {
        console.error(`[Error] Fetching schedule for Auditorium ${auditoriumId}, ${month}/${year} failed:`, error);
        res.status(500).json({ success: false, message: 'Server error retrieving auditorium schedule.' });
    }
};


/** getRecentPendingBookings (Admin Dashboard) */
exports.getRecentPendingBookings = async (req, res, next) => {
    const limitParam = parseInt(req.query.limit, 10);
    // Set a default limit and a maximum cap
    const effectiveLimit = (!isNaN(limitParam) && limitParam > 0) ? Math.min(limitParam, 50) : 5;
    console.log(`GET /api/bookings/recent-pending requested | Limit: ${effectiveLimit}`);

    try {
        const recentPending = await Booking.find({ status: 'pending' })
            .sort({ createdAt: -1 }) // Get the most recently created pending requests first
            .limit(effectiveLimit)
            .populate('user', 'username email')
            .populate('auditorium', 'name')
            .populate('department', 'name code');

        res.status(200).json({
            success: true,
            count: recentPending.length,
            limit: effectiveLimit,
            data: recentPending
        });
    } catch (error) {
        console.error("[Error] Fetching recent pending bookings failed:", error);
        res.status(500).json({ success: false, message: 'Server error retrieving recent pending bookings.' });
    }
};


/** getUpcomingBookings (Admin Dashboard) */
exports.getUpcomingBookings = async (req, res, next) => {
    const daysParam = parseInt(req.query.days, 10);
    // Set a default number of days and a maximum cap
    const effectiveDays = (!isNaN(daysParam) && daysParam > 0) ? Math.min(daysParam, 90) : 7; // Default to 7 days, max 90
    console.log(`GET /api/bookings/upcoming requested | Days ahead: ${effectiveDays}`);

    try {
        const now = DateTime.now().startOf('day').toJSDate(); // Start from beginning of today
        const futureCutoff = DateTime.now().plus({ days: effectiveDays }).endOf('day').toJSDate(); // End of the target future day

        console.log(`[Upcoming Query] Fetching approved bookings from ${now.toISOString()} to ${futureCutoff.toISOString()}`);

        const upcoming = await Booking.find({
            status: 'approved',
            startTime: {
                 $gte: now,         // Starts today or later
                 $lt: futureCutoff  // Starts before the end of the target future day
            }
        })
        .sort({ startTime: 1 }) // Chronological order
        .populate('user', 'username email')
        .populate('auditorium', 'name')
        .populate('department', 'name code');

        res.status(200).json({
            success: true,
            count: upcoming.length,
            days: effectiveDays,
            data: upcoming
        });
    } catch (error) {
        console.error("[Error] Fetching upcoming bookings failed:", error);
        res.status(500).json({ success: false, message: 'Server error retrieving upcoming bookings.' });
    }
};


/** getBookingTrends (Admin Dashboard - Chart) */
exports.getBookingTrends = async (req, res, next) => {
    const daysParam = parseInt(req.query.days, 10);
    const auditoriumIdFilter = req.query.auditoriumId;
    const departmentIdFilter = req.query.departmentId;
    // Set default days and max cap
    const effectiveDays = (!isNaN(daysParam) && daysParam > 0) ? Math.min(daysParam, 180) : 30;
    console.log(`GET /api/bookings/trends requested | Days: ${effectiveDays}, Auditorium Filter: ${auditoriumIdFilter || 'None'}, Department Filter: ${departmentIdFilter || 'None'}`);

    try {
        const endDate = DateTime.now().setZone(istTimezone).endOf('day'); // Today in IST
        const startDate = endDate.minus({ days: effectiveDays - 1 }).startOf('day'); // Go back X days, start of that day
        const startDateUTC = startDate.toUTC().toJSDate();

        console.log(`[Trends Query] Aggregating bookings created from ${startDate.toISO()} (IST) onwards.`);
        console.log(`[Trends Query] UTC start date for match: ${startDateUTC.toISOString()}`);


        const matchStage = {
            createdAt: { $gte: startDateUTC } // Filter by creation date (UTC)
        };

        // Add optional filters
        const filtersApplied = {};
        if (auditoriumIdFilter && mongoose.Types.ObjectId.isValid(auditoriumIdFilter)) {
            matchStage.auditorium = new mongoose.Types.ObjectId(auditoriumIdFilter);
            filtersApplied.auditoriumId = auditoriumIdFilter;
             console.log(`[Trends Query] Filtering by Auditorium: ${auditoriumIdFilter}`);
        } else if (auditoriumIdFilter) {
             console.warn(`[Trends Query] Invalid Auditorium ID provided: ${auditoriumIdFilter}. Ignoring filter.`);
        }

        if (departmentIdFilter && mongoose.Types.ObjectId.isValid(departmentIdFilter)) {
             matchStage.department = new mongoose.Types.ObjectId(departmentIdFilter);
             filtersApplied.departmentId = departmentIdFilter;
             console.log(`[Trends Query] Filtering by Department: ${departmentIdFilter}`);
        } else if (departmentIdFilter) {
             console.warn(`[Trends Query] Invalid Department ID provided: ${departmentIdFilter}. Ignoring filter.`);
        }


        const pipeline = [
             { $match: matchStage },
            {
                $group: {
                    // Group by date string in IST timezone
                     _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: istTimezone } },
                     count: { $sum: 1 } // Count bookings per day
                 }
            },
             { $project: { _id: 0, date: "$_id", count: 1 } }, // Reshape output
             { $sort: { date: 1 } } // Sort by date chronologically
         ];

        const trendsData = await Booking.aggregate(pipeline);

        // Create a map for quick lookup of counts by date
        const trendsMap = new Map(trendsData.map(item => [item.date, item.count]));

        // Generate a complete list of dates in the range and fill counts (defaulting to 0)
        const filledTrends = [];
        let currentDate = startDate; // Start from the calculated start date in IST
        while (currentDate <= endDate) {
            const dateStr = currentDate.toFormat('yyyy-MM-dd');
            filledTrends.push({
                date: dateStr,
                count: trendsMap.get(dateStr) || 0 // Get count from map or default to 0
            });
            currentDate = currentDate.plus({ days: 1 });
        }

        res.status(200).json({
            success: true,
            days: effectiveDays,
            filters: filtersApplied,
            data: filledTrends // Return the array with data for every day in the range
        });

    } catch (error) {
        console.error(`[Error] Fetching booking trends failed (Filters Aud-${auditoriumIdFilter || 'N/A'}, Dep-${departmentIdFilter || 'N/A'}):`, error);
        res.status(500).json({ success: false, message: 'Server error generating booking trends.' });
    }
};

/** getAuditoriumAvailability (for client-side fullcalendar, returns booked intervals) */
exports.getAuditoriumAvailability = async (req, res, next) => {
    const { auditoriumId } = req.params;
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // Expect month as 1-12

    console.log(`GET /api/bookings/availability/${auditoriumId} requested | Year: ${year}, Month: ${month}`);

    if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
        return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' });
    }
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) {
        return res.status(400).json({ success: false, message: 'Valid year and month (1-12) query parameters are required.' });
    }

    try {
        // Calculate date range for the query (UTC)
        const startOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month');
        const endOfMonthLocal = startOfMonthLocal.endOf('month');
        const startUTC = startOfMonthLocal.toUTC().toJSDate();
        const endUTC = endOfMonthLocal.toUTC().toJSDate();

        console.log(`[Availability Query] Fetching booked slots for ${auditoriumId} overlapping month ${year}-${month} (UTC range: ${startUTC.toISOString()} to ${endUTC.toISOString()})`);

        // Find APPROVED bookings overlapping the requested month
        const bookedSlots = await Booking.find({
            auditorium: auditoriumId,
            status: 'approved',
            startTime: { $lt: endUTC }, // Starts before month ends
            endTime: { $gt: startUTC }   // Ends after month starts
        })
        .select('startTime endTime -_id') // Only select start and end times, exclude _id
        .lean(); // Use lean for performance as we only need plain JS objects

        res.status(200).json({
            success: true,
            message: `Availability data fetched for ${startOfMonthLocal.toFormat('MMMM yyyy')}`,
            count: bookedSlots.length,
            data: bookedSlots, // Array of {startTime, endTime} objects
        });

    } catch (error) {
        console.error(`[Error] Fetching availability for Auditorium ${auditoriumId}, ${month}/${year}:`, error);
        res.status(500).json({ success: false, message: 'Server error retrieving auditorium availability.' });
    }
};

/**
 * @desc    Check if a *specific* time slot is available (for forms)
 * @route   GET /api/bookings/check-availability?auditoriumId=ID&startTime=ISO&endTime=ISO&excludeBookingId=ID (optional)
 * @access  Private (User - needs login)
 */
exports.checkAvailability = async (req, res, next) => {
    const { auditoriumId, startTime, endTime, excludeBookingId } = req.query;

    // --- Basic Validation ---
    if (!auditoriumId || !startTime || !endTime) {
        return res.status(400).json({
            success: false,
            message: 'Auditorium ID, startTime, and endTime query parameters are required.'
        });
    }
    if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid Auditorium ID format.'
        });
    }

    // --- Date Parsing and Validation ---
    const startDt = DateTime.fromISO(startTime);
    const endDt = DateTime.fromISO(endTime);

    if (!startDt.isValid || !endDt.isValid) {
        return res.status(400).json({
            success: false,
            message: 'Invalid startTime or endTime format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).'
        });
    }
    if (startDt >= endDt) {
        return res.status(400).json({
            success: false,
            message: 'End time must be strictly after start time.'
        });
    }

    // Convert to JS Date objects (in UTC) for Mongoose query
    const startUTC = startDt.toJSDate();
    const endUTC = endDt.toJSDate();

    try {
        const conflictingBooking = await Booking.findOne({
            auditorium: auditoriumId,
            status: 'approved',
            startTime: { $lt: endUTC },
            endTime: { $gt: startUTC },
            ...((excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) 
                ? { _id: { $ne: excludeBookingId } } 
                : {})
        });

        if (conflictingBooking) {
            return res.status(200).json({
                success: true,
                available: false,
                hasConflict: true,
                conflictingBooking: {
                    eventName: conflictingBooking.eventName,
                    startTime: conflictingBooking.startTime,
                    endTime: conflictingBooking.endTime
                }
            });
        }

        return res.status(200).json({
            success: true,
            available: true,
            hasConflict: false
        });

    } catch (error) {
        console.error(`[Error] Checking availability for Auditorium ${auditoriumId}:`, error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error checking availability.'
        });
    }
};

/**
 * @desc    Get current and upcoming events (e.g., for a public display)
 * @route   GET /api/bookings/public/events
 * @access  Public
 */
exports.getPublicEvents = async (req, res) => {
    console.log(`GET /api/bookings/public/events requested`);
    try {
        const now = new Date();
        // Define upcoming window (e.g., next 7 days)
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const events = await Booking.find({
            status: 'approved',
            $or: [
                // Events currently happening
                { startTime: { $lte: now }, endTime: { $gte: now } },
                // Events starting within the upcoming window
                { startTime: { $gt: now, $lt: nextWeek } }
            ]
        })
        .sort({ startTime: 1 }) // Show in chronological order
        .populate('auditorium', 'name') // Populate auditorium name
        .select('eventName startTime endTime auditorium eventImages description'); // Select fields to display publicly

        console.log(`[Public Events] Found ${events.length} current or upcoming approved events.`);

        res.status(200).json({
            success: true,
            data: events
        });

    } catch (error) {
        console.error("[Error] Fetching public events failed:", error);
        res.status(500).json({
            success: false,
            message: 'Error fetching public events.'
        });
    }
};


/**
 * @desc    Check for conflicts using POST body (useful before form submission)
 * @route   POST /api/bookings/conflicts
 * @access  Private (User - needs login)
 */
exports.checkBookingConflicts = async (req, res) => {
    console.log(`POST /api/bookings/conflicts requested`);
    try {
        const { auditoriumId, startTime, endTime, excludeBookingId } = req.body;

        // --- Basic Validation ---
        if (!auditoriumId || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'Auditorium ID, startTime, and endTime are required in the request body.'
            });
        }
        if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Auditorium ID format.'
            });
        }

         // --- Date Parsing and Validation ---
        const startDt = DateTime.fromISO(startTime);
        const endDt = DateTime.fromISO(endTime);

        if (!startDt.isValid || !endDt.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid startTime or endTime format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ).'
            });
        }
         if (startDt >= endDt) {
            return res.status(400).json({
                success: false,
                message: 'End time must be strictly after start time.'
            });
         }

        const startUTC = startDt.toJSDate();
        const endUTC = endDt.toJSDate();

        // --- Build Conflict Query ---
        const conflictQuery = {
            auditorium: auditoriumId,
            status: 'approved',
            startTime: { $lt: endUTC },
            endTime: { $gt: startUTC }
        };

        // Exclude specific booking if ID is provided (for checking edits/reschedules)
        if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) {
            conflictQuery._id = { $ne: excludeBookingId };
            console.log(`[Conflict Check POST] Excluding booking ID: ${excludeBookingId}`);
        } else if (excludeBookingId) {
             console.warn(`[Conflict Check POST] Invalid excludeBookingId provided: ${excludeBookingId}. Ignoring.`);
        }


        console.log(`[Conflict Check POST] Querying for auditorium ${auditoriumId} between ${startUTC.toISOString()} and ${endUTC.toISOString()}`);
        const conflict = await Booking.findOne(conflictQuery).select('_id eventName'); // Select minimal data

        if (conflict) {
             console.log(`[Conflict Check POST] Conflict found: Booking ${conflict._id} (${conflict.eventName})`);
            return res.status(200).json({ // Return 200 OK, indicates check completed
                success: true,
                hasConflict: true,
                message: `The selected time slot conflicts with an existing approved booking (${conflict.eventName}).`,
                conflictingEventName: conflict.eventName // Provide name for user feedback
            });
        }

        // No conflicts found
         console.log(`[Conflict Check POST] No conflict found.`);
        return res.status(200).json({
            success: true,
            hasConflict: false,
            message: 'The selected time slot appears to be available.'
        });

    } catch (error) {
        console.error('[Error] Check booking conflicts via POST failed:', error);
        res.status(500).json({
            success: false,
            message: 'Server error checking booking conflicts.'
        });
    }
};