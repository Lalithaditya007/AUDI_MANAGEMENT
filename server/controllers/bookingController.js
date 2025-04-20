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
    formatDateTimeIST
} = require('../utils/emailService');

// --- Constants ---
const istTimezone = 'Asia/Kolkata';
const openingHourIST = 9;
const bookingLeadTimeHours = 2;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
// Ensure Azure connection details are loaded from .env
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME;

// --- Helper: Azure Blob Upload ---
const uploadToAzure = async (buffer, originalname, mimetype) => {
    if (!AZURE_STORAGE_CONNECTION_STRING || !AZURE_STORAGE_CONTAINER_NAME) {
        console.error('[Azure Error] Missing Azure Storage connection string or container name in environment variables.');
        throw new Error('Server configuration error: Azure Storage details missing.');
    }
    if (!buffer) { throw new Error('File buffer is missing for Azure upload.'); }
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
        const blobName = `event-images/${uuidv4()}-${originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        console.log(`[Azure Upload] Attempting to upload blob: ${blobName} to container: ${AZURE_STORAGE_CONTAINER_NAME}`);
        const uploadOptions = { blobHTTPHeaders: { blobContentType: mimetype } };
        const uploadBlobResponse = await blockBlobClient.uploadData(buffer, uploadOptions);
        console.log(`[Azure Upload] Successfully uploaded blob ${blobName}. ETag: ${uploadBlobResponse.etag}`);
        return blockBlobClient.url;
    } catch (error) {
        console.error(`[Azure Error] Failed to upload blob ${originalname}:`, error.message || error);
        if (error.code === 'AuthenticationFailed') { throw new Error('Azure Authentication Failed. Check connection string.'); }
        else if (error.code === 'ContainerNotFound') { throw new Error(`Azure Container Not Found: ${AZURE_STORAGE_CONTAINER_NAME}. Ensure it exists.`); }
        throw new Error(`Failed to upload image to Azure Storage. ${error.message}`);
    }
};

// --- Helper: Azure Blob Delete ---
const deleteFromAzure = async (blobUrl) => {
     if (!blobUrl) { console.warn('[Azure Delete] No blob URL provided, skipping deletion.'); return; }
     if (!AZURE_STORAGE_CONNECTION_STRING || !AZURE_STORAGE_CONTAINER_NAME) { console.error('[Azure Error] Missing Azure Storage connection string or container name for deletion.'); throw new Error('Server configuration error: Azure Storage details missing.'); }
    try {
        const urlParts = blobUrl.split('/'); const blobName = urlParts.slice(4).join('/');
        if (!blobName) { throw new Error(`Could not parse blob name from URL: ${blobUrl}`); }
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        console.log(`[Azure Delete] Attempting to delete blob: ${blobName} from container: ${AZURE_STORAGE_CONTAINER_NAME}`);
        const deleteResponse = await blockBlobClient.deleteIfExists();
        if (deleteResponse.succeeded) { console.log(`[Azure Delete] Successfully deleted blob: ${blobName}`); }
        else { console.warn(`[Azure Delete] Blob not found or already deleted: ${blobName} (ErrorCode: ${deleteResponse.errorCode})`); }
    } catch (error) { console.error(`[Azure Error] Failed to delete blob ${blobUrl}:`, error.message || error); }
};

// --- Helper: Booking Time Validation ---
const validateBookingTime = (startTimeISO, endTimeISO, leadTimeHrs = bookingLeadTimeHours, openHour = openingHourIST) => {
    const start = DateTime.fromISO(startTimeISO, { zone: istTimezone }); const end = DateTime.fromISO(endTimeISO, { zone: istTimezone });
    if (!start.isValid || !end.isValid) { return { valid: false, message: 'Invalid start or end time format.' }; }
    if (start >= end) { return { valid: false, message: 'End time must be after start time.' }; }
    if (start.hour < openHour) { return { valid: false, message: `Booking cannot start before ${openHour}:00 AM ${istTimezone}.` }; }
    const nowIST = DateTime.now().setZone(istTimezone); if (start < nowIST.plus({ hours: leadTimeHrs })) { return { valid: false, message: `Booking must be at least ${leadTimeHrs} hours in advance.` }; }
    return { valid: true, message: 'Time validation passed.', start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
};

// ==================================================
//             BOOKING CONTROLLER FUNCTIONS
// ==================================================

/** createBooking */
exports.createBooking = async (req, res) => {
    let uploadedBlobUrl = null;
    try {
        const { eventName, description, startTime, endTime, auditorium, department } = req.body; const userId = req.user._id;
        if (!eventName || !description || !startTime || !endTime || !auditorium || !department) { return res.status(400).json({ success: false, message: 'Missing required fields.' }); }
        if (!mongoose.Types.ObjectId.isValid(auditorium) || !mongoose.Types.ObjectId.isValid(department)) { return res.status(400).json({ success: false, message: 'Invalid ID format.' }); }
        const timeValidation = validateBookingTime(startTime, endTime); if (!timeValidation.valid) { return res.status(400).json({ success: false, message: timeValidation.message }); }
        const validatedStartTime = timeValidation.start; const validatedEndTime = timeValidation.end;
        const immediateConflict = await Booking.findOne({ auditorium: auditorium, status: 'approved', startTime: { $lt: validatedEndTime }, endTime: { $gt: validatedStartTime } });
        if (immediateConflict) { return res.status(409).json({ success: false, message: `Conflicts with existing booking: ${immediateConflict.eventName}.` }); }
        if (req.file) { uploadedBlobUrl = await uploadToAzure(req.file.buffer, req.file.originalname, req.file.mimetype); }
        const booking = new Booking({ eventName: eventName.trim(), description: description.trim(), startTime: validatedStartTime, endTime: validatedEndTime, auditorium: auditorium, department: department, user: userId, eventImages: uploadedBlobUrl ? [uploadedBlobUrl] : [], status: 'pending' });
        await booking.save();
        const populatedBooking = await Booking.findById(booking._id).populate('user', 'email username').populate('auditorium', 'name location').populate('department', 'name');
        if (!populatedBooking) { console.error(`[Critical Error] Failed to populate booking ${booking._id}`); throw new Error("Booking created but failed details retrieval."); }
        try { if (populatedBooking.user?.email) { await sendBookingRequestEmail(populatedBooking.user.email, populatedBooking, populatedBooking.auditorium, populatedBooking.department); } } catch (emailError) { console.error(`[Non-critical Error] User confirm email fail:`, emailError); }
        if (ADMIN_EMAIL) { try { await sendBookingRequestNotificationToAdmin(ADMIN_EMAIL, populatedBooking, populatedBooking.auditorium, populatedBooking.department); } catch (emailError) { console.error('[Non-critical Error] Admin notify email fail:', emailError); } }
        res.status(201).json({ success: true, message: 'Booking request created successfully.', data: populatedBooking });
    } catch (error) {
        console.error("[Error] Create Booking Failed:", error); if (uploadedBlobUrl) { console.error(`[Orphaned Blob Alert] URL: ${uploadedBlobUrl}`); }
        if (error.message.includes('Azure') || error.message.includes('Server configuration error')) { return res.status(500).json({ success: false, message: `Server Config Error: ${error.message}` }); }
        if (error.message.includes('Failed to upload image')) { return res.status(500).json({ success: false, message: `Upload Fail: ${error.message}` }); }
        if (error.name === 'ValidationError' || error.name === 'CastError') { return res.status(400).json({ success: false, message: error.message }); }
        if (!res.headersSent) { res.status(500).json({ success: false, message: error.message || 'Server error creating booking.' }); }
    }
};

/** getMyBookings */
exports.getMyBookings = async (req, res, next) => {
  const userId = req.user._id;
  try { const userBookings = await Booking.find({ user: userId }).populate('auditorium', 'name location capacity').populate('department', 'name code').sort({ startTime: -1 }); res.status(200).json({ success: true, count: userBookings.length, data: userBookings });
  } catch (error) { console.error(`[Error] Fetch user bookings ${userId} failed:`, error); res.status(500).json({ success: false, message: 'Server error retrieving bookings.' }); }
};

/** getAllBookings (Admin) */
exports.getAllBookings = async (req, res, next) => {
    try {
        const query = {}; const filtersApplied = {};
        if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status.toLowerCase())) { query.status = req.query.status.toLowerCase(); filtersApplied.status = query.status; }
        if (req.query.auditoriumId && mongoose.Types.ObjectId.isValid(req.query.auditoriumId)) { query.auditorium = req.query.auditoriumId; filtersApplied.auditoriumId = req.query.auditoriumId; }
        if (req.query.departmentId && mongoose.Types.ObjectId.isValid(req.query.departmentId)) { query.department = req.query.departmentId; filtersApplied.departmentId = req.query.departmentId; }
        if (req.query.eventName) { query.eventName = { $regex: req.query.eventName, $options: 'i' }; filtersApplied.eventName = req.query.eventName; }
        if (req.query.userEmail) { const users = await User.find({ email: { $regex: req.query.userEmail, $options: 'i' } }).select('_id'); const userIds = users.map(u => u._id); if (userIds.length === 0) { return res.status(200).json({ success: true, count: 0, filtersApplied, data: [] }); } query.user = { $in: userIds }; filtersApplied.userEmail = req.query.userEmail; }
        if (req.query.date) { const targetDateIST = DateTime.fromISO(req.query.date, { zone: istTimezone }); if (!targetDateIST.isValid) { return res.status(400).json({ success: false, message: `Invalid date filter format: ${req.query.date}.` }); } const startOfDayUTC = targetDateIST.startOf('day').toUTC().toJSDate(); const endOfDayUTC = targetDateIST.endOf('day').toUTC().toJSDate(); query.startTime = { $lt: endOfDayUTC }; query.endTime = { $gt: startOfDayUTC }; filtersApplied.date = req.query.date; }
        const bookings = await Booking.find(query).populate('user', 'username email').populate('auditorium', 'name location').populate('department', 'name code').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: bookings.length, filtersApplied, data: bookings });
    } catch (error) { console.error("[Error] Admin getting all bookings failed:", error); res.status(500).json({ success: false, message: 'Server error retrieving bookings.' }); }
};

/** approveBooking (Admin) */
exports.approveBooking = async (req, res, next) => {
    const bookingId = req.params.id; if (!mongoose.Types.ObjectId.isValid(bookingId)) { return res.status(400).json({ success: false, message: "Invalid ID." }); }
    try {
        const booking = await Booking.findById(bookingId).populate('user', 'email username').populate('auditorium').populate('department', 'name'); if (!booking) { return res.status(404).json({ success: false, message: `Booking ${bookingId} not found.` }); }
        if (booking.status !== 'pending') { return res.status(400).json({ success: false, message: `Status is '${booking.status}'.` }); }
        const conflict = await Booking.findOne({ _id: { $ne: booking._id }, auditorium: booking.auditorium._id, status: 'approved', startTime: { $lt: booking.endTime }, endTime: { $gt: booking.startTime } }); if (conflict) { return res.status(409).json({ success: false, message: `Conflict with: '${conflict.eventName}'.` }); }
        booking.status = 'approved'; booking.rejectionReason = undefined; const updatedBooking = await booking.save();
        try { if (updatedBooking.user?.email && updatedBooking.auditorium && updatedBooking.department) { await sendBookingApprovalEmail(updatedBooking.user.email, updatedBooking, updatedBooking.auditorium, updatedBooking.department); } } catch (e) { console.error(`[Non-critical Error] Approval email fail:`, e); }
        res.status(200).json({ success: true, message: 'Booking approved.', data: updatedBooking });
    } catch (error) { console.error(`[Error] Approve booking ${bookingId} fail:`, error); if (!res.headersSent) { res.status(500).json({ success: false, message: 'Server error approving.' }); } }
};

/** rejectBooking (Admin) */
exports.rejectBooking = async (req, res, next) => {
    const bookingId = req.params.id; const { rejectionReason } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) { return res.status(400).json({ success: false, message: 'Reason required.' }); } if (!mongoose.Types.ObjectId.isValid(bookingId)) { return res.status(400).json({ success: false, message: "Invalid ID." }); }
    try {
        const booking = await Booking.findById(bookingId).populate('user', 'email username').populate('auditorium').populate('department', 'name'); if (!booking) { return res.status(404).json({ success: false, message: `Booking ${bookingId} not found.` }); }
        if (booking.status !== 'pending') { return res.status(400).json({ success: false, message: `Status is '${booking.status}'.` }); }
        const updatedBooking = await Booking.findByIdAndUpdate(bookingId, { $set: { status: 'rejected', rejectionReason: rejectionReason.trim() } }, { new: true, runValidators: false }).populate('user', 'email username').populate('auditorium').populate('department', 'name');
        try { if (updatedBooking.user?.email && updatedBooking.auditorium && updatedBooking.department) { await sendBookingRejectionEmail(updatedBooking.user.email, updatedBooking, updatedBooking.auditorium, updatedBooking.department, updatedBooking.rejectionReason); } } catch (emailError) { console.error(`[Non-critical Error] Rejection email fail:`, emailError); }
        res.status(200).json({ success: true, message: 'Booking rejected.', data: updatedBooking });
    } catch (error) { console.error(`[Error] Reject booking ${bookingId} fail:`, error); res.status(500).json({ success: false, message: 'Server error rejecting.' }); }
};

/** getBookingStats (Admin) */
exports.getBookingStats = async (req, res, next) => {
     const groupByField = req.query.groupBy; console.log(`GET /stats | GroupBy: ${groupByField || 'overall'}`);
    try {
        let pipeline = [];
        if (groupByField === 'auditorium' || groupByField === 'department') {
             pipeline = [ { $group: { _id: { group: `$${groupByField}`, status: '$status' }, count: { $sum: 1 } } }, { $group: { _id: '$_id.group', stats: { $push: { k: "$_id.status", v: "$count" } }, total: { $sum: '$count' } } }, { $addFields: { statsAsObject: { $arrayToObject: '$stats' } } }, { $lookup: { from: groupByField === 'auditorium' ? 'auditoria' : 'departments', localField: '_id', foreignField: '_id', as: 'groupInfo' } }, { $unwind: { path: '$groupInfo', preserveNullAndEmptyArrays: true } }, { $project: { _id: 1, name: { $ifNull: ['$groupInfo.name', 'Unknown'] }, total: 1, pending: { $ifNull: ['$statsAsObject.pending', 0] }, approved: { $ifNull: ['$statsAsObject.approved', 0] }, rejected: { $ifNull: ['$statsAsObject.rejected', 0] } } }, { $sort: { name: 1 } } ];
         } else { pipeline = [ { $group: { _id: '$status', count: { $sum: 1 } } }, { $group: { _id: null, stats: { $push: { k: "$_id", v: "$count" } }, total: { $sum: "$count" } } }, { $replaceRoot: { newRoot: { $mergeObjects: [ { total: 0, pending: 0, approved: 0, rejected: 0 }, { $arrayToObject: "$stats" }, { total: { $ifNull: ["$total", 0] } } ] } } } ]; }
        const result = await Booking.aggregate(pipeline); const data = (groupByField === 'auditorium' || groupByField === 'department') ? result : (result[0] || { total: 0, pending: 0, approved: 0, rejected: 0 });
        res.status(200).json({ success: true, groupedBy: groupByField || 'overall', data: data });
    } catch (error) { console.error(`[Error] Stats fail (GroupBy: ${groupByField || 'overall'}):`, error); res.status(500).json({ success: false, message: 'Server error calculating stats.' }); }
};

/** withdrawBooking (User) */
exports.withdrawBooking = async (req, res, next) => {
    const bookingId = req.params.id; const userId = req.user._id; if (!mongoose.Types.ObjectId.isValid(bookingId)) { return res.status(400).json({ success: false, message: 'Invalid ID.' }); }
    try {
        const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate('user', 'email username').populate('auditorium', 'name').populate('department', 'name'); if (!booking) { return res.status(404).json({ success: false, message: 'Booking not found or permission denied.' }); }
        if (!['pending', 'approved'].includes(booking.status)) { return res.status(400).json({ success: false, message: `Cannot withdraw status: '${booking.status}'.` }); }
        if (booking.status === 'approved') { const nowIST = DateTime.now().setZone(istTimezone); const startTimeIST = DateTime.fromJSDate(booking.startTime).setZone(istTimezone); const allowedWithdrawTimeIST = startTimeIST.minus({ hours: bookingLeadTimeHours }); if (nowIST >= allowedWithdrawTimeIST) { return res.status(400).json({ success: false, message: `Cannot withdraw less than ${bookingLeadTimeHours}h before start.` }); } }
        if (booking.eventImages && booking.eventImages.length > 0) { console.log(`[Withdraw Cleanup] Deleting Azure blobs for ${bookingId}`); const deletePromises = booking.eventImages.map(url => deleteFromAzure(url).catch(err => console.error(`[Withdraw Cleanup Error] Blob ${url}: ${err.message}`))); await Promise.allSettled(deletePromises); }
        try { if (booking.user?.email) { await sendBookingWithdrawalConfirmationEmail(booking.user.email, booking, booking.auditorium, booking.department); } } catch (emailError) { console.error(`[Non-critical Error] Withdraw confirm email fail:`, emailError); }
        const deleteResult = await Booking.deleteOne({ _id: bookingId, user: userId }); if (deleteResult.deletedCount === 0) { return res.status(404).json({ success: false, message: 'Booking not found/already withdrawn.' }); }
        console.log(`Booking ${bookingId} withdrawn by user ${userId}.`); res.status(200).json({ success: true, message: 'Booking withdrawn.' });
    } catch (error) {
        console.error(`[Error] Withdraw booking ${bookingId} fail:`, error); if (error.message.includes('Azure')) { return res.status(500).json({ success: false, message: `Server Config Error: ${error.message}` }); }
        if (!res.headersSent) { res.status(500).json({ success: false, message: 'Server error withdrawing.' }); }
    }
};

/** requestReschedule (User) */
exports.requestReschedule = async (req, res, next) => {
     const bookingId = req.params.id; const userId = req.user._id; const { newStartTime, newEndTime } = req.body;
     if (!newStartTime || !newEndTime) { return res.status(400).json({ success: false, message: 'New times required.' }); } if (!mongoose.Types.ObjectId.isValid(bookingId)) { return res.status(400).json({ success: false, message: 'Invalid ID.' }); }
    try {
         const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate('user', 'email username').populate('auditorium').populate('department', 'name'); if (!booking) { return res.status(404).json({ success: false, message: 'Booking not found/permission denied.' }); }
         if (!booking.auditorium) { return res.status(500).json({ success: false, message: 'Internal error: Booking incomplete.' }); }
         if (booking.status !== 'approved') { return res.status(400).json({ success: false, message: `Only approved bookings. Status: '${booking.status}'.` }); }
         const timeValidation = validateBookingTime(newStartTime, newEndTime); if (!timeValidation.valid) { return res.status(400).json({ success: false, message: `Invalid times: ${timeValidation.message}` }); }
         const validatedStartTime = timeValidation.start; const validatedEndTime = timeValidation.end;
         if (booking.startTime.getTime() === validatedStartTime.getTime() && booking.endTime.getTime() === validatedEndTime.getTime()) { return res.status(400).json({ success: false, message: `Time is same as current.` }); }
         const conflictNew = await Booking.findOne({ _id: { $ne: booking._id }, auditorium: booking.auditorium._id, status: 'approved', startTime: { $lt: validatedEndTime }, endTime: { $gt: validatedStartTime } }); if (conflictNew) { return res.status(409).json({ success: false, message: `New time conflicts with: (${conflictNew.eventName}).` }); }
         const oldTimes = { startTime: booking.startTime, endTime: booking.endTime };
         booking.startTime = validatedStartTime; booking.endTime = validatedEndTime; booking.status = 'pending'; booking.rejectionReason = undefined; const savedBooking = await booking.save();
         try { if (booking.user?.email) { await sendRescheduleRequestEmail(booking.user.email, savedBooking, booking.auditorium, booking.department, oldTimes); } if (process.env.ADMIN_EMAIL) { await sendRescheduleRequestNotificationToAdmin(process.env.ADMIN_EMAIL, savedBooking, booking.auditorium, booking.department, oldTimes); } } catch (emailError) { console.error(`[Non-critical Error] Resched notify fail:`, emailError); }
         res.status(200).json({ success: true, message: 'Reschedule requested. Status pending re-approval.', data: savedBooking });
     } catch (error) {
         console.error(`[Error] Resched booking ${bookingId} fail:`, error);
         if (!res.headersSent) { if (error.name === 'ValidationError' || error.name === 'CastError') { return res.status(400).json({ success: false, message: `Invalid input: ${error.message}` }); } res.status(500).json({ success: false, message: 'Server error processing reschedule.' }); }
     }
};

/** getAuditoriumSchedule */
exports.getAuditoriumSchedule = async (req, res, next) => {
    const { auditoriumId } = req.params; const year = parseInt(req.query.year, 10); const month = parseInt(req.query.month, 10);
    if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid ID.' }); }
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) { return res.status(400).json({ success: false, message: 'Valid year/month required.' }); }
    try {
        const startOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month'); const endOfMonthLocal = startOfMonthLocal.endOf('month');
        const startUTC = startOfMonthLocal.toUTC().toJSDate(); const endUTC = endOfMonthLocal.toUTC().toJSDate();
        const schedule = await Booking.find({ auditorium: auditoriumId, status: 'approved', startTime: { $lt: endUTC }, endTime: { $gt: startUTC } }).populate('user', 'username email').select('eventName startTime endTime user description department').populate('department','name').sort({ startTime: 1 }); // Added department population
        res.status(200).json({ success: true, message: `Schedule fetched for ${startOfMonthLocal.toFormat('MMMM yyyy')}`, count: schedule.length, data: schedule });
    } catch (error) { console.error(`[Error] Fetch schedule fail:`, error); res.status(500).json({ success: false, message: 'Server error retrieving schedule.' }); }
};

/** getRecentPendingBookings (Admin Dashboard) */
exports.getRecentPendingBookings = async (req, res, next) => {
     const limitParam = parseInt(req.query.limit, 10); const effectiveLimit = (!isNaN(limitParam) && limitParam > 0) ? Math.min(limitParam, 50) : 5;
     try { const recentPending = await Booking.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(effectiveLimit).populate('user', 'username email').populate('auditorium', 'name').populate('department', 'name code'); res.status(200).json({ success: true, count: recentPending.length, limit: effectiveLimit, data: recentPending }); }
     catch (error) { console.error("[Error] Fetch recent pending fail:", error); res.status(500).json({ success: false, message: 'Server error retrieving recent pending.' }); }
};

/** getUpcomingBookings (Admin Dashboard) */
exports.getUpcomingBookings = async (req, res, next) => {
    const daysParam = parseInt(req.query.days, 10); const effectiveDays = (!isNaN(daysParam) && daysParam > 0) ? Math.min(daysParam, 90) : 7;
    try {
        const nowIST = DateTime.now().setZone(istTimezone); const startQueryUTC = nowIST.startOf('day').toUTC().toJSDate();
        const futureCutoffIST = nowIST.plus({ days: effectiveDays }).endOf('day'); const endQueryUTC = futureCutoffIST.toUTC().toJSDate();
        const upcoming = await Booking.find({ status: 'approved', startTime: { $gte: startQueryUTC, $lt: endQueryUTC } }).sort({ startTime: 1 }).populate('user', 'username email').populate('auditorium', 'name').populate('department', 'name code');
        res.status(200).json({ success: true, count: upcoming.length, days: effectiveDays, data: upcoming });
    } catch (error) { console.error("[Error] Fetch upcoming fail:", error); res.status(500).json({ success: false, message: 'Server error retrieving upcoming.' }); }
};

/** getBookingTrends (Admin Dashboard - Chart) */
exports.getBookingTrends = async (req, res, next) => {
    const daysParam = parseInt(req.query.days, 10); const auditoriumIdFilter = req.query.auditoriumId; const departmentIdFilter = req.query.departmentId; const effectiveDays = (!isNaN(daysParam) && daysParam > 0) ? Math.min(daysParam, 365) : 30;
    try {
        const endDateIST = DateTime.now().setZone(istTimezone).endOf('day'); const startDateIST = endDateIST.minus({ days: effectiveDays - 1 }).startOf('day'); const startDateUTC = startDateIST.toUTC().toJSDate();
        const matchStage = { createdAt: { $gte: startDateUTC } }; const filtersApplied = {};
        if (auditoriumIdFilter && mongoose.Types.ObjectId.isValid(auditoriumIdFilter)) { matchStage.auditorium = new mongoose.Types.ObjectId(auditoriumIdFilter); filtersApplied.auditoriumId = auditoriumIdFilter; }
        if (departmentIdFilter && mongoose.Types.ObjectId.isValid(departmentIdFilter)) { matchStage.department = new mongoose.Types.ObjectId(departmentIdFilter); filtersApplied.departmentId = departmentIdFilter; }
        const pipeline = [ { $match: matchStage }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: istTimezone } }, count: { $sum: 1 } } }, { $project: { _id: 0, date: "$_id", count: 1 } }, { $sort: { date: 1 } } ];
        const trendsData = await Booking.aggregate(pipeline);
        const trendsMap = new Map(trendsData.map(item => [item.date, item.count])); const filledTrends = []; let currentDateIST = startDateIST;
        while (currentDateIST <= endDateIST) { const dateStr = currentDateIST.toFormat('yyyy-MM-dd'); filledTrends.push({ date: dateStr, count: trendsMap.get(dateStr) || 0 }); currentDateIST = currentDateIST.plus({ days: 1 }); }
        res.status(200).json({ success: true, days: effectiveDays, filters: filtersApplied, data: filledTrends });
    } catch (error) { console.error(`[Error] Fetch trends fail:`, error); res.status(500).json({ success: false, message: 'Server error generating trends.' }); }
};

/** getAuditoriumAvailability */
exports.getAuditoriumAvailability = async (req, res, next) => {
    const { auditoriumId } = req.params; const year = parseInt(req.query.year, 10); const month = parseInt(req.query.month, 10);
    if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid ID.' }); }
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) { return res.status(400).json({ success: false, message: 'Valid year/month required.' }); }
    try {
        const startOfMonthLocal = DateTime.local(year, month, 1, { zone: istTimezone }).startOf('month'); const endOfMonthLocal = startOfMonthLocal.endOf('month');
        const startUTC = startOfMonthLocal.toUTC().toJSDate(); const endUTC = endOfMonthLocal.toUTC().toJSDate();
        const bookedSlots = await Booking.find({ auditorium: auditoriumId, status: 'approved', startTime: { $lt: endUTC }, endTime: { $gt: startUTC } }).select('startTime endTime -_id').lean();
        res.status(200).json({ success: true, message: `Availability fetched for ${startOfMonthLocal.toFormat('MMMM yyyy')}`, count: bookedSlots.length, data: bookedSlots, });
    } catch (error) { console.error(`[Error] Fetch availability fail:`, error); res.status(500).json({ success: false, message: 'Server error retrieving availability.' }); }
};

/** checkAvailability */
exports.checkAvailability = async (req, res, next) => {
    const { auditoriumId, startTime, endTime, excludeBookingId } = req.query;
    if (!auditoriumId || !startTime || !endTime) { return res.status(400).json({ success: false, message: 'ID, startTime, endTime required.' }); } if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid ID.' }); }
    const startDt = DateTime.fromISO(startTime, { setZone: true }); const endDt = DateTime.fromISO(endTime, { setZone: true });
    if (!startDt.isValid || !endDt.isValid) { return res.status(400).json({ success: false, message: 'Invalid time format.' }); } if (startDt >= endDt) { return res.status(400).json({ success: false, message: 'End time must be after start.' }); }
    const startUTC = startDt.toJSDate(); const endUTC = endDt.toJSDate();
    try {
        const conflictQuery = { auditorium: auditoriumId, status: 'approved', startTime: { $lt: endUTC }, endTime: { $gt: startUTC } }; if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) { conflictQuery._id = { $ne: excludeBookingId }; }
        const conflictingBooking = await Booking.findOne(conflictQuery).select('eventName startTime endTime');
        if (conflictingBooking) { const formatTime = (d) => { try { return formatDateTimeIST(d); } catch (e) { return d.toISOString(); } }; return res.status(200).json({ success: true, available: false, hasConflict: true, message: `Conflicts with: '${conflictingBooking.eventName}' (${formatTime(conflictingBooking.startTime)} - ${formatTime(conflictingBooking.endTime)})`, conflictingBooking }); }
        return res.status(200).json({ success: true, available: true, hasConflict: false, message: 'Slot available.' });
    } catch (error) { console.error(`[Error] Check availability fail:`, error); res.status(500).json({ success: false, message: 'Server error checking availability.' }); }
};

/** getPublicEvents */
exports.getPublicEvents = async (req, res) => {
    console.log(`GET /api/bookings/public/events requested`);
    try {
        const nowIST = DateTime.now().setZone(istTimezone); const nowUTC = nowIST.toUTC().toJSDate();
        // --- CHANGE HERE: Look 30 days ahead ---
        const futureCutoffIST = nowIST.plus({ days: 30 }); // Changed from 7 to 30
        // --- END CHANGE ---
        const futureCutoffUTC = futureCutoffIST.toUTC().toJSDate();

        console.log(`[Public Events Query] Fetching approved events happening now (IST: ${nowIST.toISO()}) or starting within the next 30 days (up to IST: ${futureCutoffIST.toISO()}).`); // Updated log message
         console.log(`[Public Events Query] Corresponding UTC query times: ${nowUTC.toISOString()} and ${futureCutoffUTC.toISOString()}`);

        const events = await Booking.find({
            status: 'approved',
            $or: [
                // Events currently happening (UTC)
                { startTime: { $lte: nowUTC }, endTime: { $gte: nowUTC } },
                // Events starting within the upcoming window (UTC)
                { startTime: { $gt: nowUTC, $lt: futureCutoffUTC } } // Use the 30-day cutoff UTC time
            ]
        })
        .sort({ startTime: 1 })
        .populate('auditorium', 'name')
        .select('eventName startTime endTime auditorium eventImages description');

        console.log(`[Public Events] Found ${events.length} current or upcoming (30 days) events.`); // Updated log message

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


/** checkBookingConflicts (POST) */
exports.checkBookingConflicts = async (req, res) => {
    console.log(`POST /api/bookings/conflicts requested`);
    try {
        const { auditoriumId, startTime, endTime, excludeBookingId } = req.body;
        if (!auditoriumId || !startTime || !endTime) { return res.status(400).json({ success: false, message: 'ID, startTime, endTime required.' }); } if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid ID.' }); }
        const startDt = DateTime.fromISO(startTime, { setZone: true }); const endDt = DateTime.fromISO(endTime, { setZone: true }); if (!startDt.isValid || !endDt.isValid) { return res.status(400).json({ success: false, message: 'Invalid time format.' }); } if (startDt >= endDt) { return res.status(400).json({ success: false, message: 'End > start required.' }); }
        const startUTC = startDt.toJSDate(); const endUTC = endDt.toJSDate();
        const conflictQuery = { auditorium: auditoriumId, status: 'approved', startTime: { $lt: endUTC }, endTime: { $gt: startUTC } }; if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) { conflictQuery._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) }; }
        console.log(`[Conflict Check POST] Querying ${auditoriumId} between ${startUTC.toISOString()} - ${endUTC.toISOString()}`); const conflict = await Booking.findOne(conflictQuery).populate('auditorium', 'name').select('eventName startTime endTime auditorium');
        if (conflict) { console.log(`[Conflict Check POST] Conflict found: ${conflict._id} (${conflict.eventName}).`); return res.status(200).json({ success: true, hasConflict: true, message: `Conflicts with: '${conflict.eventName}' in ${conflict.auditorium?.name || 'N/A'} (${formatDateTimeIST(conflict.startTime)} - ${formatDateTimeIST(conflict.endTime)}).`, conflictingBooking: { eventName: conflict.eventName, startTime: conflict.startTime, endTime: conflict.endTime, auditoriumName: conflict.auditorium?.name || 'N/A' } }); }
        console.log(`[Conflict Check POST] No conflict.`); return res.status(200).json({ success: true, hasConflict: false, message: 'Slot available.' });
    } catch (error) { console.error('[Error] Check conflicts POST fail:', error); res.status(500).json({ success: false, message: 'Server error checking conflicts.' }); }
};