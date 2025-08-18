// server/controllers/bookingController.js

const mongoose = require('mongoose');
const { DateTime } = require('luxon'); // Ensure Luxon is imported
const { BlobServiceClient } = require('@azure/storage-blob'); // Import Azure SDK
const { v4: uuidv4 } = require('uuid'); // Using uuid for unique blob names

const Booking = require('../models/Booking');
const Auditorium = require('../models/Auditorium');
const User = require('../models/User');
const Department = require('../models/Department');
const {
    sendBookingRequestEmail,
    sendBookingApprovalEmail,
    sendBookingRejectionEmail,
    sendBookingRequestNotificationToAdmin,
    sendBookingWithdrawalConfirmationEmail,
    sendRescheduleRequestEmail,
    sendRescheduleRequestNotificationToAdmin,
    sendBookingCancellationEmail,
    formatDateTimeIST // Assuming this utility exists and works
} = require('../utils/emailService'); // Verify path

// --- Constants ---
const istTimezone = 'Asia/Kolkata';
const openingHourIST = 9;
const bookingLeadTimeHours = 2; // Minimum lead time
const bookingMaxAdvanceMonths = 3; // <<<--- NEW: Maximum months in advance
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME;

// --- Helper: Azure Blob Upload (No changes needed here) ---
const uploadToAzure = async (buffer, originalname, mimetype) => {
    // ... (keep existing implementation from previous step) ...
    if (!AZURE_STORAGE_CONNECTION_STRING || !AZURE_STORAGE_CONTAINER_NAME) { console.error('[Azure Error] Missing Azure Storage connection string or container name in environment variables.'); throw new Error('Server configuration error: Azure Storage details missing.'); }
    if (!buffer) { throw new Error('File buffer is missing for Azure upload.'); }
    try { const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING); const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME); const blobName = `event-images/${uuidv4()}-${originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`; const blockBlobClient = containerClient.getBlockBlobClient(blobName); console.log(`[Azure Upload] Attempting to upload blob: ${blobName} to container: ${AZURE_STORAGE_CONTAINER_NAME}`); const uploadOptions = { blobHTTPHeaders: { blobContentType: mimetype } }; const uploadBlobResponse = await blockBlobClient.uploadData(buffer, uploadOptions); console.log(`[Azure Upload] Successfully uploaded blob ${blobName}. ETag: ${uploadBlobResponse.etag}`); return blockBlobClient.url; } catch (error) { console.error(`[Azure Error] Failed to upload blob ${originalname}:`, error.message || error); if (error.code === 'AuthenticationFailed') { throw new Error('Azure Authentication Failed. Check connection string.'); } else if (error.code === 'ContainerNotFound') { throw new Error(`Azure Container Not Found: ${AZURE_STORAGE_CONTAINER_NAME}. Ensure it exists.`); } throw new Error(`Failed to upload image to Azure Storage. ${error.message}`); }
};

// --- Helper: Azure Blob Delete (No changes needed here) ---
const deleteFromAzure = async (blobUrl) => {
    // ... (keep existing implementation from previous step) ...
     if (!blobUrl) { console.warn('[Azure Delete] No blob URL provided, skipping deletion.'); return; } if (!AZURE_STORAGE_CONNECTION_STRING || !AZURE_STORAGE_CONTAINER_NAME) { console.error('[Azure Error] Missing Azure Storage connection string or container name in environment variables for deletion.'); throw new Error('Server configuration error: Azure Storage details missing.'); } try { const urlParts = blobUrl.split('/'); const blobName = urlParts.slice(4).join('/'); if (!blobName) { throw new Error(`Could not parse blob name from URL: ${blobUrl}`); } const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING); const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME); const blockBlobClient = containerClient.getBlockBlobClient(blobName); console.log(`[Azure Delete] Attempting to delete blob: ${blobName} from container: ${AZURE_STORAGE_CONTAINER_NAME}`); const deleteResponse = await blockBlobClient.deleteIfExists(); if (deleteResponse.succeeded) { console.log(`[Azure Delete] Successfully deleted blob: ${blobName}`); } else { console.warn(`[Azure Delete] Blob not found or already deleted: ${blobName} (ErrorCode: ${deleteResponse.errorCode})`); } } catch (error) { console.error(`[Azure Error] Failed to delete blob ${blobUrl}:`, error.message || error); }
};


// --- Helper: Booking Time Validation (MODIFIED) ---
const validateBookingTime = (startTimeISO, endTimeISO, leadTimeHrs = bookingLeadTimeHours, openHour = openingHourIST, maxMonths = bookingMaxAdvanceMonths) => {
    const start = DateTime.fromISO(startTimeISO, { zone: istTimezone }); // Assume input is IST local time
    const end = DateTime.fromISO(endTimeISO, { zone: istTimezone });   // Assume input is IST local time

    if (!start.isValid || !end.isValid) {
        return { valid: false, message: 'Invalid start or end time format. Please use a valid date/time string (e.g., YYYY-MM-DDTHH:mm:ss).' };
    }
    if (start >= end) {
        return { valid: false, message: 'End time must be strictly after start time.' };
    }
    if (start.hour < openHour) {
        return { valid: false, message: `Booking cannot start before ${openHour}:00 AM ${istTimezone}.` };
    }

    const nowIST = DateTime.now().setZone(istTimezone);

    // Check minimum lead time requirement in IST
    if (start < nowIST.plus({ hours: leadTimeHrs })) {
        return { valid: false, message: `Booking must be made at least ${leadTimeHrs} hours in advance of the start time in ${istTimezone}.` };
    }

    // --- NEW: Check maximum advance booking limit ---
    const maxAdvanceDateIST = nowIST.plus({ months: maxMonths }).endOf('day'); // End of the day, X months from now
    if (start > maxAdvanceDateIST) {
        return {
            valid: false,
            message: `Booking cannot be made more than ${maxMonths} months in advance. Please select a date before ${maxAdvanceDateIST.toLocaleString(DateTime.DATE_MED)}.`
        };
    }
    // --- END NEW CHECK ---

    // Return JS Date objects (converted to UTC for database storage)
    return {
        valid: true,
        message: 'Time validation passed.',
        start: start.toUTC().toJSDate(), // Convert to UTC for Mongoose
        end: end.toUTC().toJSDate()     // Convert to UTC for Mongoose
    };
};


// ==================================================
//             BOOKING CONTROLLER FUNCTIONS
// ==================================================

// --- createBooking (Uses the modified validateBookingTime) ---
exports.createBooking = async (req, res) => {
    // ... (keep existing implementation - it calls the updated helper) ...
    let uploadedBlobUrl = null;
    try {
        const { eventName, description, startTime, endTime, auditorium, department } = req.body;
        const userId = req.user._id;
        if (!eventName || !description || !startTime || !endTime || !auditorium || !department) { return res.status(400).json({ success: false, message: 'Missing required booking fields.' }); }
        if (!mongoose.Types.ObjectId.isValid(auditorium) || !mongoose.Types.ObjectId.isValid(department)) { return res.status(400).json({ success: false, message: 'Invalid Auditorium or Department ID format.' }); }

        const timeValidation = validateBookingTime(startTime, endTime); // Calls the updated function
        if (!timeValidation.valid) { return res.status(400).json({ success: false, message: timeValidation.message }); }
        const validatedStartTime = timeValidation.start; const validatedEndTime = timeValidation.end;

        const immediateConflict = await Booking.findOne({ auditorium: auditorium, status: 'approved', startTime: { $lt: validatedEndTime }, endTime: { $gt: validatedStartTime } });
        if (immediateConflict) { return res.status(409).json({ success: false, message: `The requested time slot conflicts with an existing approved booking (${immediateConflict.eventName}).` }); }


        let eventImages = [];
        if (req.file) {
            // Store path relative to /uploads/events/
            eventImages.push(`/uploads/events/${req.file.filename}`);
        }

        const booking = new Booking({ eventName: eventName.trim(), description: description.trim(), startTime: validatedStartTime, endTime: validatedEndTime, auditorium: auditorium, department: department, user: userId, eventImages: eventImages, status: 'pending' });
        await booking.save();
        const populatedBooking = await Booking.findById(booking._id).populate('user', 'email username').populate('auditorium', 'name location').populate('department', 'name');
        if (!populatedBooking) { throw new Error("Booking created but failed to retrieve details."); }

        try { if (populatedBooking.user?.email) { await sendBookingRequestEmail(populatedBooking.user.email, populatedBooking, populatedBooking.auditorium, populatedBooking.department); } else { console.warn(`[Email Skipped] User email missing for booking ${booking._id}.`); } } catch (emailError) { console.error(`[Non-critical Error] Sending user confirmation email failed:`, emailError); }
        if (ADMIN_EMAIL) { try { await sendBookingRequestNotificationToAdmin(ADMIN_EMAIL, populatedBooking, populatedBooking.auditorium, populatedBooking.department); } catch (emailError) { console.error('[Non-critical Error] Sending admin notification email failed:', emailError); } } else { console.warn('[Warning] ADMIN_EMAIL not configured.'); }

        res.status(201).json({ success: true, message: 'Booking request created successfully and is pending approval.', data: populatedBooking });
    } catch (error) {
        console.error("[Error] Create Booking Failed:", error);
        if (uploadedBlobUrl) { console.error(`[Orphaned Blob Alert] Booking creation failed after Azure upload. Orphaned Blob URL: ${uploadedBlobUrl}`); }
        if (error.message.includes('Azure Storage details missing') || error.message.includes('Azure Authentication Failed') || error.message.includes('Azure Container Not Found')) { return res.status(500).json({ success: false, message: `Server Configuration Error: ${error.message}` }); }
        if (error.message.includes('Failed to upload image to Azure Storage')) { return res.status(500).json({ success: false, message: `Image Upload Failed: ${error.message}` }); }
        if (error.name === 'ValidationError' || error.name === 'CastError') { return res.status(400).json({ success: false, message: error.message }); }
        if (!res.headersSent) { res.status(500).json({ success: false, message: error.message || 'Server error creating booking request.' }); }
    }
};

// --- getMyBookings (No changes needed) ---
exports.getMyBookings = async (req, res, next) => {
  // ... (keep existing implementation) ...
  const userId = req.user._id; try { const userBookings = await Booking.find({ user: userId }).populate('auditorium', 'name location capacity').populate('department', 'name code').sort({ startTime: -1 }); res.status(200).json({ success: true, count: userBookings.length, data: userBookings }); } catch (error) { console.error(`[Error] Fetching bookings for user ${userId} failed:`, error); res.status(500).json({ success: false, message: 'Server error retrieving your bookings.' }); }
};

// --- getAllBookings (Admin) (No changes needed) ---
exports.getAllBookings = async (req, res, next) => {
    // ... (keep existing implementation) ...
    try { const query = {}; const filtersApplied = {}; if (req.query.status && ['pending', 'approved', 'rejected', 'cancelled'].includes(req.query.status.toLowerCase())) { query.status = req.query.status.toLowerCase(); filtersApplied.status = query.status; } if (req.query.auditoriumId && mongoose.Types.ObjectId.isValid(req.query.auditoriumId)) { query.auditorium = req.query.auditoriumId; filtersApplied.auditoriumId = req.query.auditoriumId; } if (req.query.departmentId && mongoose.Types.ObjectId.isValid(req.query.departmentId)) { query.department = req.query.departmentId; filtersApplied.departmentId = req.query.departmentId; } if (req.query.eventName) { query.eventName = { $regex: req.query.eventName, $options: 'i' }; filtersApplied.eventName = req.query.eventName; } if (req.query.userEmail) { const users = await User.find({ email: { $regex: req.query.userEmail, $options: 'i' } }).select('_id'); const userIds = users.map(u => u._id); if (userIds.length === 0) { return res.status(200).json({ success: true, count: 0, filtersApplied, data: [] }); } query.user = { $in: userIds }; filtersApplied.userEmail = req.query.userEmail; } if (req.query.date) { const targetDateIST = DateTime.fromISO(req.query.date, { zone: istTimezone }); if (!targetDateIST.isValid) { return res.status(400).json({ success: false, message: `Invalid date filter format: ${req.query.date}. Use YYYY-MM-DD.` }); } const startOfDayUTC = targetDateIST.startOf('day').toUTC().toJSDate(); const endOfDayUTC = targetDateIST.endOf('day').toUTC().toJSDate(); query.startTime = { $lt: endOfDayUTC }; query.endTime = { $gt: startOfDayUTC }; filtersApplied.date = req.query.date; } const bookings = await Booking.find(query).populate('user', 'username email').populate('auditorium', 'name location').populate('department', 'name code').sort({ createdAt: -1 }); res.status(200).json({ success: true, count: bookings.length, filtersApplied, data: bookings }); } catch (error) { console.error("[Error] Admin getting all bookings failed:", error); res.status(500).json({ success: false, message: 'Server error retrieving bookings.' }); }
};

// --- approveBooking (Admin) (No changes needed) ---
exports.approveBooking = async (req, res, next) => {
    // ... (keep existing implementation) ...
    const bookingId = req.params.id; if (!mongoose.Types.ObjectId.isValid(bookingId)) { return res.status(400).json({ success: false, message: "Invalid booking ID format." }); } try { const booking = await Booking.findById(bookingId).populate('user', 'email username').populate('auditorium').populate('department', 'name'); if (!booking) { return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` }); } if (booking.status !== 'pending') { return res.status(400).json({ success: false, message: `Booking status is already '${booking.status}'.` }); } const conflict = await Booking.findOne({ _id: { $ne: booking._id }, auditorium: booking.auditorium._id, status: 'approved', startTime: { $lt: booking.endTime }, endTime: { $gt: booking.startTime } }); if (conflict) { return res.status(409).json({ success: false, message: `Time slot conflict detected with: '${conflict.eventName}'.` }); } booking.status = 'approved'; booking.rejectionReason = undefined; const updatedBooking = await booking.save(); try { if (updatedBooking.user?.email && updatedBooking.auditorium && updatedBooking.department) { await sendBookingApprovalEmail(updatedBooking.user.email, updatedBooking, updatedBooking.auditorium, updatedBooking.department); } else { console.warn(`[Email Skipped] Approval email skipped for ${updatedBooking._id}. Missing details.`); } } catch (e) { console.error(`[Non-critical Error] Sending approval email failed:`, e); } res.status(200).json({ success: true, message: 'Booking approved successfully.', data: updatedBooking }); } catch (error) { console.error(`[Error] Approving booking ${bookingId} failed:`, error); if (!res.headersSent) { res.status(500).json({ success: false, message: 'Server error during booking approval.' }); } }
};

// --- rejectBooking (Admin) (No changes needed) ---
exports.rejectBooking = async (req, res, next) => {
    // ... (keep existing implementation) ...
     const bookingId = req.params.id; const { rejectionReason } = req.body; if (!rejectionReason || !rejectionReason.trim()) { return res.status(400).json({ success: false, message: 'A rejection reason is required.' }); } if (!mongoose.Types.ObjectId.isValid(bookingId)) { return res.status(400).json({ success: false, message: "Invalid booking ID format." }); } try { const booking = await Booking.findById(bookingId).populate('user', 'email username').populate('auditorium').populate('department', 'name'); if (!booking) { return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` }); } if (booking.status !== 'pending') { return res.status(400).json({ success: false, message: `Booking status is already '${booking.status}'.` }); } const updatedBooking = await Booking.findByIdAndUpdate(bookingId, { $set: { status: 'rejected', rejectionReason: rejectionReason.trim() } }, { new: true, runValidators: false }).populate('user', 'email username').populate('auditorium').populate('department', 'name'); try { if (updatedBooking.user?.email && updatedBooking.auditorium && updatedBooking.department) { await sendBookingRejectionEmail(updatedBooking.user.email, updatedBooking, updatedBooking.auditorium, updatedBooking.department, updatedBooking.rejectionReason); } else { console.warn(`[Email Skipped] Rejection email skipped for ${updatedBooking._id}. Missing details.`); } } catch (emailError) { console.error(`[Non-critical Error] Sending rejection email failed:`, emailError); } res.status(200).json({ success: true, message: 'Booking rejected successfully.', data: updatedBooking }); } catch (error) { console.error(`[Error] Rejecting booking ${bookingId} failed:`, error); res.status(500).json({ success: false, message: 'Server error during booking rejection.' }); }
};

// --- getBookingStats (Admin) (No changes needed) ---
exports.getBookingStats = async (req, res, next) => {
    // ... (keep existing implementation) ...
     const groupByField = req.query.groupBy; console.log(`GET /stats requested | Grouping by: ${groupByField || 'overall'}`); try { let pipeline = []; if (groupByField === 'auditorium' || groupByField === 'department') { pipeline = [ { $group: { _id: { group: `$${groupByField}`, status: '$status' }, count: { $sum: 1 } } }, { $group: { _id: '$_id.group', stats: { $push: { k: "$_id.status", v: "$count" } }, total: { $sum: '$count' } } }, { $addFields: { statsAsObject: { $arrayToObject: '$stats' } } }, { $lookup: { from: groupByField === 'auditorium' ? 'auditoria' : 'departments', localField: '_id', foreignField: '_id', as: 'groupInfo' } }, { $unwind: { path: '$groupInfo', preserveNullAndEmptyArrays: true } }, { $project: { _id: 1, name: { $ifNull: ['$groupInfo.name', 'Unknown / Deleted'] }, total: 1, pending: { $ifNull: ['$statsAsObject.pending', 0] }, approved: { $ifNull: ['$statsAsObject.approved', 0] }, rejected: { $ifNull: ['$statsAsObject.rejected', 0] } } }, { $sort: { name: 1 } } ]; } else { pipeline = [ { $group: { _id: '$status', count: { $sum: 1 } } }, { $group: { _id: null, stats: { $push: { k: "$_id", v: "$count" } }, total: { $sum: "$count" } } }, { $replaceRoot: { newRoot: { $mergeObjects: [ { total: 0, pending: 0, approved: 0, rejected: 0 }, { $arrayToObject: "$stats" }, { total: { $ifNull: ["$total", 0] } } ] } } } ]; } const result = await Booking.aggregate(pipeline); const data = (groupByField === 'auditorium' || groupByField === 'department') ? result : (result[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }); res.status(200).json({ success: true, groupedBy: groupByField || 'overall', data: data }); } catch (error) { console.error(`[Error] Getting booking stats (GroupBy: ${groupByField || 'overall'}) failed:`, error); res.status(500).json({ success: false, message: 'Server error calculating booking statistics.' }); }
};

// --- withdrawBooking (User) (No changes needed) ---
exports.withdrawBooking = async (req, res, next) => {
    // ... (keep existing implementation) ...
     const bookingId = req.params.id; const userId = req.user._id; if (!mongoose.Types.ObjectId.isValid(bookingId)) { return res.status(400).json({ success: false, message: 'Invalid booking ID format.' }); } try { const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate('user', 'email username').populate('auditorium', 'name').populate('department', 'name'); if (!booking) { return res.status(404).json({ success: false, message: 'Booking not found or permission denied.' }); } if (!['pending', 'approved'].includes(booking.status)) { return res.status(400).json({ success: false, message: `Cannot withdraw a booking with status: '${booking.status}'.` }); } if (booking.status === 'approved') { const nowIST = DateTime.now().setZone(istTimezone); const startTimeIST = DateTime.fromJSDate(booking.startTime).setZone(istTimezone); const allowedWithdrawTimeIST = startTimeIST.minus({ hours: bookingLeadTimeHours }); if (nowIST >= allowedWithdrawTimeIST) { return res.status(400).json({ success: false, message: `Approved bookings cannot be withdrawn less than ${bookingLeadTimeHours} hours before start time.` }); } } if (booking.eventImages && booking.eventImages.length > 0) { console.log(`[Withdrawal Cleanup] Preparing to delete Azure blobs for booking ${bookingId}`); const deletePromises = booking.eventImages.map(imageUrl => deleteFromAzure(imageUrl).catch(err => { console.error(`[Withdrawal Cleanup Error] Failed to delete blob ${imageUrl}: ${err.message}`); return { status: 'rejected', reason: err }; })); await Promise.allSettled(deletePromises); console.log(`[Withdrawal Cleanup] Finished attempting Azure blob deletions for booking ${bookingId}`); } else { console.log(`[Withdrawal Cleanup] No Azure blobs associated with booking ${bookingId}.`); } try { if (booking.user?.email) { await sendBookingWithdrawalConfirmationEmail(booking.user.email, booking, booking.auditorium, booking.department); } } catch (emailError) { console.error(`[Non-critical Error] Sending withdrawal confirmation email failed:`, emailError); } const deleteResult = await Booking.deleteOne({ _id: bookingId, user: userId }); if (deleteResult.deletedCount === 0) { return res.status(404).json({ success: false, message: 'Booking not found or already withdrawn.' }); } console.log(`Booking ${bookingId} (${booking.eventName}) successfully withdrawn by user ${userId}.`); res.status(200).json({ success: true, message: 'Booking withdrawn successfully.' }); } catch (error) { console.error(`[Error] Withdrawing booking ${bookingId} failed:`, error); if (error.message.includes('Azure Storage details missing')) { return res.status(500).json({ success: false, message: `Server Configuration Error: ${error.message}` }); } if (!res.headersSent) { res.status(500).json({ success: false, message: 'Server error withdrawing booking.' }); } }
};

// --- requestReschedule (User) (Uses the modified validateBookingTime) ---
exports.requestReschedule = async (req, res, next) => {
    // ... (rest of the implementation is largely the same, but it calls the updated helper) ...
     const bookingId = req.params.id; const userId = req.user._id; const { newStartTime, newEndTime } = req.body; if (!newStartTime || !newEndTime) { return res.status(400).json({ success: false, message: 'New start time and end time are required.' }); } if (!mongoose.Types.ObjectId.isValid(bookingId)) { return res.status(400).json({ success: false, message: 'Invalid booking ID format.' }); } try { const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate('user', 'email username').populate('auditorium').populate('department', 'name'); if (!booking) { return res.status(404).json({ success: false, message: 'Booking not found or permission denied.' }); } if (!booking.auditorium) { return res.status(500).json({ success: false, message: 'Internal server error: Booking data incomplete.' }); } if (booking.status !== 'approved') { return res.status(400).json({ success: false, message: `Only approved bookings can be rescheduled. Status: '${booking.status}'.` }); }
         const timeValidation = validateBookingTime(newStartTime, newEndTime); // Calls the updated function
         if (!timeValidation.valid) { return res.status(400).json({ success: false, message: `Invalid new times: ${timeValidation.message}` }); }
         const validatedStartTime = timeValidation.start; const validatedEndTime = timeValidation.end; if (booking.startTime.getTime() === validatedStartTime.getTime() && booking.endTime.getTime() === validatedEndTime.getTime()) { return res.status(400).json({ success: false, message: `Requested time is the same as current.` }); } const conflictNew = await Booking.findOne({ _id: { $ne: booking._id }, auditorium: booking.auditorium._id, status: 'approved', startTime: { $lt: validatedEndTime }, endTime: { $gt: validatedStartTime } }); if (conflictNew) { return res.status(409).json({ success: false, message: `New time conflicts with booking: (${conflictNew.eventName}).` }); } const oldTimes = { startTime: booking.startTime, endTime: booking.endTime }; booking.startTime = validatedStartTime; booking.endTime = validatedEndTime; booking.status = 'pending'; booking.rejectionReason = undefined; const savedBooking = await booking.save(); try { if (booking.user?.email) { await sendRescheduleRequestEmail(booking.user.email, savedBooking, booking.auditorium, booking.department, oldTimes); } if (process.env.ADMIN_EMAIL) { await sendRescheduleRequestNotificationToAdmin(process.env.ADMIN_EMAIL, savedBooking, booking.auditorium, booking.department, oldTimes); } } catch (emailError) { console.error(`[Non-critical Error] Sending reschedule notifications failed:`, emailError); } res.status(200).json({ success: true, message: 'Reschedule request submitted. Status set to pending re-approval.', data: savedBooking }); } catch (error) { console.error(`[Error] Rescheduling booking ${bookingId} failed:`, error); if (!res.headersSent) { if (error.name === 'ValidationError' || error.name === 'CastError') { return res.status(400).json({ success: false, message: `Invalid input: ${error.message}` }); } res.status(500).json({ success: false, message: 'Server error processing reschedule request.' }); } }
};

// --- Other controller functions (No changes needed) ---
exports.getAuditoriumSchedule = async (req, res, next) => {
    // ... (keep existing implementation) ...
     const { auditoriumId } = req.params; const year = parseInt(req.query.year, 10); const month = parseInt(req.query.month, 10); if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' }); } if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) { return res.status(400).json({ success: false, message: 'Valid year and month (1-12) query parameters are required.' }); } try { const startOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month'); const endOfMonthLocal = startOfMonthLocal.endOf('month'); const startUTC = startOfMonthLocal.toUTC().toJSDate(); const endUTC = endOfMonthLocal.toUTC().toJSDate(); const schedule = await Booking.find({ auditorium: auditoriumId, status: 'approved', startTime: { $lt: endUTC }, endTime: { $gt: startUTC } }).populate('user', 'username email').select('eventName startTime endTime user description').sort({ startTime: 1 }); res.status(200).json({ success: true, message: `Schedule fetched successfully for ${startOfMonthLocal.toFormat('MMMM yyyy')}`, count: schedule.length, data: schedule }); } catch (error) { console.error(`[Error] Fetching schedule for Auditorium ${auditoriumId}, ${month}/${year} failed:`, error); res.status(500).json({ success: false, message: 'Server error retrieving auditorium schedule.' }); }
};
exports.getRecentPendingBookings = async (req, res, next) => {
    // ... (keep existing implementation) ...
      const limitParam = parseInt(req.query.limit, 10); const effectiveLimit = (!isNaN(limitParam) && limitParam > 0) ? Math.min(limitParam, 50) : 5; try { const recentPending = await Booking.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(effectiveLimit).populate('user', 'username email').populate('auditorium', 'name').populate('department', 'name code'); res.status(200).json({ success: true, count: recentPending.length, limit: effectiveLimit, data: recentPending }); } catch (error) { console.error("[Error] Fetching recent pending bookings failed:", error); res.status(500).json({ success: false, message: 'Server error retrieving recent pending bookings.' }); }
};
exports.getUpcomingBookings = async (req, res, next) => {
    // ... (keep existing implementation) ...
     const daysParam = parseInt(req.query.days, 10); const effectiveDays = (!isNaN(daysParam) && daysParam > 0) ? Math.min(daysParam, 90) : 7; try { const nowIST = DateTime.now().setZone(istTimezone); const startQueryUTC = nowIST.startOf('day').toUTC().toJSDate(); const futureCutoffIST = nowIST.plus({ days: effectiveDays }).endOf('day'); const endQueryUTC = futureCutoffIST.toUTC().toJSDate(); const upcoming = await Booking.find({ status: 'approved', startTime: { $gte: startQueryUTC, $lt: endQueryUTC } }).sort({ startTime: 1 }).populate('user', 'username email').populate('auditorium', 'name').populate('department', 'name code'); res.status(200).json({ success: true, count: upcoming.length, days: effectiveDays, data: upcoming }); } catch (error) { console.error("[Error] Fetching upcoming bookings failed:", error); res.status(500).json({ success: false, message: 'Server error retrieving upcoming bookings.' }); }
};
exports.getBookingTrends = async (req, res, next) => {
    // ... (keep existing implementation) ...
     const daysParam = parseInt(req.query.days, 10); const auditoriumIdFilter = req.query.auditoriumId; const departmentIdFilter = req.query.departmentId; const effectiveDays = (!isNaN(daysParam) && daysParam > 0) ? Math.min(daysParam, 365) : 30; try { const endDateIST = DateTime.now().setZone(istTimezone).endOf('day'); const startDateIST = endDateIST.minus({ days: effectiveDays - 1 }).startOf('day'); const startDateUTC = startDateIST.toUTC().toJSDate(); const matchStage = { createdAt: { $gte: startDateUTC } }; const filtersApplied = {}; if (auditoriumIdFilter && mongoose.Types.ObjectId.isValid(auditoriumIdFilter)) { matchStage.auditorium = new mongoose.Types.ObjectId(auditoriumIdFilter); filtersApplied.auditoriumId = auditoriumIdFilter; } if (departmentIdFilter && mongoose.Types.ObjectId.isValid(departmentIdFilter)) { matchStage.department = new mongoose.Types.ObjectId(departmentIdFilter); filtersApplied.departmentId = departmentIdFilter; } const pipeline = [ { $match: matchStage }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: istTimezone } }, count: { $sum: 1 } } }, { $project: { _id: 0, date: "$_id", count: 1 } }, { $sort: { date: 1 } } ]; const trendsData = await Booking.aggregate(pipeline); const trendsMap = new Map(trendsData.map(item => [item.date, item.count])); const filledTrends = []; let currentDateIST = startDateIST; while (currentDateIST <= endDateIST) { const dateStr = currentDateIST.toFormat('yyyy-MM-dd'); filledTrends.push({ date: dateStr, count: trendsMap.get(dateStr) || 0 }); currentDateIST = currentDateIST.plus({ days: 1 }); } res.status(200).json({ success: true, days: effectiveDays, filters: filtersApplied, data: filledTrends }); } catch (error) { console.error(`[Error] Fetching booking trends failed:`, error); res.status(500).json({ success: false, message: 'Server error generating booking trends.' }); }
};
exports.getAuditoriumAvailability = async (req, res, next) => {
    // ... (keep existing implementation) ...
      const { auditoriumId } = req.params; const year = parseInt(req.query.year, 10); const month = parseInt(req.query.month, 10); if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' }); } if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) { return res.status(400).json({ success: false, message: 'Valid year and month (1-12) query parameters are required.' }); } try { const startOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month'); const endOfMonthLocal = startOfMonthLocal.endOf('month'); const startUTC = startOfMonthLocal.toUTC().toJSDate(); const endUTC = endOfMonthLocal.toUTC().toJSDate(); const bookedSlots = await Booking.find({ auditorium: auditoriumId, status: 'approved', startTime: { $lt: endUTC }, endTime: { $gt: startUTC } }).select('startTime endTime -_id').lean(); res.status(200).json({ success: true, message: `Availability data fetched for ${startOfMonthLocal.toFormat('MMMM yyyy')}`, count: bookedSlots.length, data: bookedSlots, }); } catch (error) { console.error(`[Error] Fetching availability for Auditorium ${auditoriumId}, ${month}/${year}:`, error); res.status(500).json({ success: false, message: 'Server error retrieving auditorium availability.' }); }
};
exports.checkAvailability = async (req, res, next) => {
    // ... (keep existing implementation) ...
     const { auditoriumId, startTime, endTime, excludeBookingId } = req.query; if (!auditoriumId || !startTime || !endTime) { return res.status(400).json({ success: false, message: 'Auditorium ID, startTime, and endTime query parameters are required.' }); } if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' }); } const startDt = DateTime.fromISO(startTime, { setZone: true }); const endDt = DateTime.fromISO(endTime, { setZone: true }); if (!startDt.isValid || !endDt.isValid) { return res.status(400).json({ success: false, message: 'Invalid startTime or endTime format. Use ISO 8601.' }); } if (startDt >= endDt) { return res.status(400).json({ success: false, message: 'End time must be strictly after start time.' }); } const startUTC = startDt.toJSDate(); const endUTC = endDt.toJSDate(); try { const conflictQuery = { auditorium: auditoriumId, status: 'approved', startTime: { $lt: endUTC }, endTime: { $gt: startUTC } }; if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) { conflictQuery._id = { $ne: excludeBookingId }; } const conflictingBooking = await Booking.findOne(conflictQuery).select('eventName startTime endTime'); if (conflictingBooking) { const formatTime = (date) => { try { return formatDateTimeIST(date); } catch (e) { return date.toISOString(); } }; return res.status(200).json({ success: true, available: false, hasConflict: true, message: `Conflicts with approved booking: '${conflictingBooking.eventName}' from ${formatTime(conflictingBooking.startTime)} to ${formatTime(conflictingBooking.endTime)}`, conflictingBooking }); } return res.status(200).json({ success: true, available: true, hasConflict: false, message: 'The selected time slot is available.' }); } catch (error) { console.error(`[Error] Checking availability for Auditorium ${auditoriumId}:`, error); res.status(500).json({ success: false, message: 'Server error checking availability.' }); }
};
exports.getPublicEvents = async (req, res) => {
    // ... (keep existing implementation) ...
     try { const nowIST = DateTime.now().setZone(istTimezone); const nowUTC = nowIST.toUTC().toJSDate(); const nextWeekIST = nowIST.plus({ days: 7 }); const nextWeekUTC = nextWeekIST.toUTC().toJSDate(); const events = await Booking.find({ status: 'approved', $or: [ { startTime: { $lte: nowUTC }, endTime: { $gte: nowUTC } }, { startTime: { $gt: nowUTC, $lt: nextWeekUTC } } ] }).sort({ startTime: 1 }).populate('auditorium', 'name').select('eventName startTime endTime auditorium eventImages description'); res.status(200).json({ success: true, data: events }); } catch (error) { console.error("[Error] Fetching public events failed:", error); res.status(500).json({ success: false, message: 'Error fetching public events.' }); }
};
exports.checkBookingConflicts = async (req, res) => {
    // ... (keep existing implementation) ...
     console.log(`POST /api/bookings/conflicts requested`); try { const { auditoriumId, startTime, endTime, excludeBookingId } = req.body; if (!auditoriumId || !startTime || !endTime) { return res.status(400).json({ success: false, message: 'Auditorium ID, startTime, and endTime are required in the request body.' }); } if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' }); } const startDt = DateTime.fromISO(startTime, { setZone: true }); const endDt = DateTime.fromISO(endTime, { setZone: true }); if (!startDt.isValid || !endDt.isValid) { return res.status(400).json({ success: false, message: 'Invalid startTime or endTime format. Use ISO 8601 format.' }); } if (startDt >= endDt) { return res.status(400).json({ success: false, message: 'End time must be strictly after start time.' }); } const startUTC = startDt.toJSDate(); const endUTC = endDt.toJSDate(); const conflictQuery = { auditorium: auditoriumId, status: 'approved', startTime: { $lt: endUTC }, endTime: { $gt: startUTC } }; if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) { conflictQuery._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) }; } const conflict = await Booking.findOne(conflictQuery).populate('auditorium', 'name').select('eventName startTime endTime auditorium'); if (conflict) { return res.status(200).json({ success: true, hasConflict: true, message: `Conflicts with: '${conflict.eventName}' in ${conflict.auditorium?.name || 'N/A'} from ${formatDateTimeIST(conflict.startTime)} to ${formatDateTimeIST(conflict.endTime)}.`, conflictingBooking: { eventName: conflict.eventName, startTime: conflict.startTime, endTime: conflict.endTime, auditoriumName: conflict.auditorium?.name || 'N/A' } }); } return res.status(200).json({ success: true, hasConflict: false, message: 'The selected time slot appears to be available.' }); } catch (error) { console.error('[Error] Check booking conflicts via POST failed:', error); res.status(500).json({ success: false, message: 'Server error checking booking conflicts.' }); }
};
/**
 * @desc    Get Pending bookings starting within the next 2 days (Admin Action Required View)
 * @route   GET /api/bookings/admin/pending-upcoming
 * @access  Private/Admin
 */
exports.getPendingUpcomingBookings = async (req, res, next) => {
    console.log(`[Admin] Fetching pending bookings requiring action (next 2 days)...`);
    try {
        // Calculate time range: Now (UTC) to End of Day 2 days from now (UTC)
        const now = DateTime.now(); // Server's current time
        const startQueryUTC = now.toUTC().toJSDate(); // From now
        const endQueryUTC = now.plus({ days: 2 }).endOf('day').toUTC().toJSDate(); // To end of the day, 2 days from now

        console.log(`[Admin Action Required Query] Time window (UTC): ${startQueryUTC.toISOString()} to ${endQueryUTC.toISOString()}`);

        const upcomingPending = await Booking.find({
            status: 'pending',
            startTime: {
                $gte: startQueryUTC, // Starting now or later
                $lt: endQueryUTC     // Starting before the end of the target day
            }
        })
        .sort({ startTime: 1 }) // Show earliest first
        .populate('user', 'username email')
        .populate('auditorium', 'name')
        .populate('department', 'name code');

        console.log(`[Admin Action Required Query] Found ${upcomingPending.length} bookings.`);

        res.status(200).json({
            success: true,
            count: upcomingPending.length,
            data: upcomingPending
        });
    } catch (error) {
        console.error("[Error] Fetching pending upcoming bookings failed:", error);
        res.status(500).json({ success: false, message: 'Server error retrieving pending upcoming bookings.' });
    }
};

/**
 * @desc    End an ongoing approved event immediately by setting endTime to now
 * @route   PUT /api/bookings/:id/end
 * @access  Private/Admin
 */
exports.endBookingNow = async (req, res) => {
    const bookingId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID format.' });
    }

    try {
        const booking = await Booking.findById(bookingId)
            .populate('user', 'email username')
            .populate('auditorium', 'name')
            .populate('department', 'name');

        if (!booking) {
            return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` });
        }

        if (booking.status !== 'approved') {
            return res.status(400).json({ success: false, message: `Only approved bookings can be ended early. Current status: '${booking.status}'.` });
        }

        const nowIST = DateTime.now().setZone(istTimezone);
        const startIST = DateTime.fromJSDate(booking.startTime).setZone(istTimezone);
        const endIST = DateTime.fromJSDate(booking.endTime).setZone(istTimezone);

        if (nowIST < startIST) {
            return res.status(400).json({ success: false, message: 'Event has not started yet. You can only end an event after it starts.' });
        }
        if (nowIST >= endIST) {
            return res.status(400).json({ success: false, message: 'Event is already over.' });
        }

        const previousEndTime = booking.endTime;
        booking.endTime = nowIST.toUTC().toJSDate();
        const updated = await booking.save();

        return res.status(200).json({
            success: true,
            message: 'Event ended successfully. End time set to now.',
            data: updated,
            meta: { previousEndTime }
        });
    } catch (error) {
        console.error(`[Error] Ending booking ${bookingId} early failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error ending event.' });
    }
};

/**
 * @desc    Cancel an approved booking (admin action) with a required reason; notifies the user by email
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private/Admin
 */
exports.cancelBooking = async (req, res) => {
    const bookingId = req.params.id;
    const { cancellationReason } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID format.' });
    }
    if (!cancellationReason || !cancellationReason.trim()) {
        return res.status(400).json({ success: false, message: 'Cancellation reason is required.' });
    }

    try {
        const booking = await Booking.findById(bookingId)
            .populate('user', 'email username')
            .populate('auditorium', 'name location')
            .populate('department', 'name');

        if (!booking) {
            return res.status(404).json({ success: false, message: `Booking with ID ${bookingId} not found.` });
        }
        if (booking.status !== 'approved') {
            return res.status(400).json({ success: false, message: `Only approved bookings can be cancelled. Current status: '${booking.status}'.` });
        }

        booking.status = 'cancelled';
        booking.cancellationReason = cancellationReason.trim();
        const updated = await booking.save();

        // Repopulate to guarantee fields for email (some ORMs drop population on save)
        const updatedPopulated = await Booking.findById(updated._id)
            .populate('user', 'email username')
            .populate('auditorium', 'name location')
            .populate('department', 'name');

        // Email the user about cancellation
        try {
            const userEmail = updatedPopulated?.user?.email;
            if (userEmail) {
                console.log(`[Email] Sending cancellation email for booking ${updated._id} to ${userEmail}`);
                await sendBookingCancellationEmail(
                    userEmail,
                    updatedPopulated,
                    updatedPopulated.auditorium,
                    updatedPopulated.department,
                    updatedPopulated.cancellationReason
                );
                console.log(`[Email] Cancellation email dispatched for booking ${updated._id}`);
            } else {
                console.warn(`[Email Skipped] User email missing for booking ${updated._id} cancellation.`);
            }
        } catch (emailError) {
            console.error(`[Non-critical Error] Sending cancellation email failed for booking ${updated._id}:`, emailError);
        }

        return res.status(200).json({ success: true, message: 'Booking cancelled successfully.', data: updated });
    } catch (error) {
        console.error(`[Error] Cancelling booking ${bookingId} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error cancelling booking.' });
    }
};

// --- Edit Booking Details (User can edit name, description, poster for approved bookings) ---
exports.editBookingDetails = async (req, res) => {
    const bookingId = req.params.id;
    const userId = req.user._id;
    const { eventName, description } = req.body;
    let uploadedImagePath = null;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID format.' });
    }

    try {
        // Find the booking and verify ownership
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Check if user owns this booking
        if (booking.user.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only edit your own bookings.' });
        }

        // Only allow editing of approved bookings
        if (booking.status !== 'approved') {
            return res.status(400).json({ 
                success: false, 
                message: 'Only approved bookings can be edited. Current status: ' + booking.status 
            });
        }

        // Check if the event has already started (no editing past events)
        const now = new Date();
        if (booking.startTime <= now) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot edit booking details for events that have already started or ended.' 
            });
        }

        // Prepare update object with allowed fields only
        const updateData = {};
        
        if (eventName && eventName.trim()) {
            if (eventName.trim().length > 150) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Event name cannot exceed 150 characters.' 
                });
            }
            updateData.eventName = eventName.trim();
        }

        if (description && description.trim()) {
            if (description.trim().length > 1000) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Description cannot exceed 1000 characters.' 
                });
            }
            updateData.description = description.trim();
        }

        // Handle image upload if a new poster is provided
        if (req.file) {
            try {
                console.log(`[Edit Booking] Processing new poster upload for booking ${bookingId}`);
                
                // Validate file type and size
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(req.file.mimetype)) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
                    });
                }

                const maxSize = 5 * 1024 * 1024; // 5MB
                if (req.file.size > maxSize) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'File size too large. Maximum size is 5MB.' 
                    });
                }

                // Use the local file path from multer
                const uploadedImagePath = `/uploads/events/${req.file.filename}`;
                console.log(`[Edit Booking] New poster saved locally: ${uploadedImagePath}`);
                
                // Delete old image files if they exist
                if (booking.eventImages && booking.eventImages.length > 0) {
                    const fs = require('fs');
                    const path = require('path');
                    
                    for (const oldImagePath of booking.eventImages) {
                        try {
                            // Convert URL path to file system path
                            const fullPath = path.join(__dirname, '..', oldImagePath);
                            if (fs.existsSync(fullPath)) {
                                fs.unlinkSync(fullPath);
                                console.log(`[Edit Booking] Deleted old poster: ${oldImagePath}`);
                            }
                        } catch (deleteError) {
                            console.warn(`[Edit Booking] Failed to delete old poster ${oldImagePath}:`, deleteError.message);
                        }
                    }
                }

                updateData.eventImages = [uploadedImagePath];
            } catch (uploadError) {
                console.error(`[Edit Booking] Failed to process new poster:`, uploadError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to upload new poster. Please try again.' 
                });
            }
        }

        // Check if there are any updates to make
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No valid fields provided for update.' 
            });
        }

        // Update the booking
        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            updateData,
            { new: true, runValidators: true }
        ).populate('user', 'username email')
         .populate('auditorium', 'name location capacity')
         .populate('department', 'name code');

        if (!updatedBooking) {
            // Clean up uploaded image if update failed
            if (uploadedImagePath) {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const fullPath = path.join(__dirname, '..', uploadedImagePath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                } catch (cleanupError) {
                    console.warn(`[Edit Booking] Failed to cleanup uploaded image after update failure:`, cleanupError.message);
                }
            }
            return res.status(404).json({ success: false, message: 'Booking not found during update.' });
        }

        console.log(`[Edit Booking] Successfully updated booking ${bookingId}`);

        return res.status(200).json({
            success: true,
            message: 'Booking details updated successfully.',
            data: updatedBooking
        });

    } catch (error) {
        console.error(`[Error] Edit booking ${bookingId} failed:`, error);
        
        // Clean up uploaded image if there was an error
        if (uploadedImagePath) {
            try {
                const fs = require('fs');
                const path = require('path');
                const fullPath = path.join(__dirname, '..', uploadedImagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`[Edit Booking] Cleaned up uploaded image after error: ${uploadedImagePath}`);
                }
            } catch (cleanupError) {
                console.warn(`[Edit Booking] Failed to cleanup uploaded image after error:`, cleanupError.message);
            }
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join('. ') });
        }

        return res.status(500).json({ 
            success: false, 
            message: 'Server error updating booking details.' 
        });
    }
};