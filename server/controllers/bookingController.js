// server/controllers/bookingController.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon'); // Make sure Luxon is imported

const Booking = require('../models/Booking');
const Auditorium = require('../models/Auditorium');
const User = require('../models/User');
const Department = require('../models/Department');
const {
  sendBookingRequestEmail,
  sendBookingApprovalEmail,
  sendBookingRejectionEmail,
  sendBookingRequestNotificationToAdmin  // Add this line
} = require('../utils/emailService'); // Assuming this path is correct

// --- Constants ---
const istTimezone = 'Asia/Kolkata';
const openingHourIST = 9; // Bookings cannot start before 9 AM IST
const bookingLeadTimeHours = 2; // Bookings must be made at least 2 hours in advance
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Add this to your .env file

// --- Helper: File Cleanup ---
const cleanupUploadedFileOnError = (file) => {
  if (!file) { return; }
  const filePath = typeof file === 'string' && file.startsWith('/uploads/') ? path.join(__dirname, '..', file) : file.path;
  if (filePath) { const fullPath = path.resolve(filePath); console.log(`[CLEANUP] Attempting delete: ${fullPath}`); fs.unlink(fullPath, (err) => { if (err && err.code !== 'ENOENT') { console.error(`[CLEANUP] FAILED delete ${fullPath}:`, err); } else if (!err) { console.log(`[CLEANUP] Success delete: ${fullPath}`); } }); } else { console.warn('[CLEANUP] Could not determine file path for cleanup.'); }
};

// ==================================================
//             BOOKING CONTROLLER FUNCTIONS
// ==================================================

/** createBooking */
exports.createBooking = async (req, res) => {
    try { 
        const eventImage=req.file?`/uploads/${req.file.filename}`:null; 
        const booking=await Booking.create({
            eventName:req.body.eventName,
            description:req.body.description,
            startTime:req.body.startTime,
            endTime:req.body.endTime,
            auditorium:req.body.auditorium,
            department:req.body.department,
            user:req.user._id,
            eventImages:eventImage?[eventImage]:[],
            status:'pending'
        }); 
        const populatedBooking=await Booking.findById(booking._id)
            .populate('user', 'email username')
            .populate('auditorium', 'name location')
            .populate('department', 'name'); 
        try { 
            await sendBookingRequestEmail(populatedBooking.user.email, populatedBooking, populatedBooking.auditorium, populatedBooking.department); 
            console.log(`[Email Sent] Booking req confirm sent for ${booking._id}`); 
        } catch (emailError) { 
            console.error(`[Non-critical Error] Email send fail ${booking._id}:`, emailError); 
        }

        // Send notification to admin
        if (ADMIN_EMAIL) {
            try {
                await sendBookingRequestNotificationToAdmin(
                    ADMIN_EMAIL,
                    populatedBooking,
                    populatedBooking.auditorium,
                    populatedBooking.department
                );
            } catch (emailError) {
                console.error('[Admin Notification Failed]', emailError);
                // Don't return error to client if admin notification fails
            }
        } else {
            console.warn('[Warning] Admin email not configured. Skipping admin notification.');
        }

        res.status(201).json({success:true, message:'Booking created successfully', data:booking}); 
    } catch (error) { 
        if (req.file) { cleanupUploadedFileOnError(req.file); } 
        console.error("[Error] Create Booking Failed:", error); 
        res.status(500).json({success:false, message: error.message || 'Server error creating booking.'}); 
    }
};

/** getMyBookings */
exports.getMyBookings = async (req, res, next) => {
  const userId = req.user._id; try { const userBookings=await Booking.find({ user: userId }).populate('auditorium', 'name location capacity').populate('department', 'name code').sort({ startTime: -1 }); res.status(200).json({success:true, count: userBookings.length, data: userBookings}); } catch (error) { console.error(`[Error] Fetch user ${userId} bookings fail:`, error); res.status(500).json({success:false, message: 'Server error retrieving bookings.'}); }
};

/** getAllBookings (Admin) */
exports.getAllBookings = async (req, res, next) => {
    try { const query={}; const filtersApplied={}; if(req.query.status&&['pending', 'approved', 'rejected'].includes(req.query.status)){query.status=req.query.status;filtersApplied.status=req.query.status} if(req.query.auditoriumId&&mongoose.Types.ObjectId.isValid(req.query.auditoriumId)){query.auditorium=req.query.auditoriumId;filtersApplied.auditoriumId=req.query.auditoriumId} if(req.query.departmentId&&mongoose.Types.ObjectId.isValid(req.query.departmentId)){query.department=req.query.departmentId;filtersApplied.departmentId=req.query.departmentId} if(req.query.eventName){query.eventName={$regex:req.query.eventName, $options:'i'};filtersApplied.eventName=req.query.eventName} if(req.query.userEmail){const users=await User.find({email:{$regex:req.query.userEmail, $options:'i'}}).select('_id'); const userIds=users.map(u=>u._id); if(userIds.length===0){return res.status(200).json({success:true, count:0, filtersApplied, data:[]})} query.user={$in:userIds};filtersApplied.userEmail=req.query.userEmail} if(req.query.date){const targetDate=DateTime.fromISO(req.query.date,{zone:istTimezone}); if(!targetDate.isValid){return res.status(400).json({success:false, message:`Invalid date filter: ${req.query.date}.`})} const startUTC=targetDate.startOf('day').toUTC().toJSDate(); const endUTC=targetDate.endOf('day').toUTC().toJSDate(); query.startTime={$lt:endUTC}; query.endTime={$gt:startUTC}; filtersApplied.date=req.query.date} const bookings=await Booking.find(query).populate('user','username email').populate('auditorium','name location').populate('department','name code').sort({createdAt:-1}); res.status(200).json({success:true, count:bookings.length, filtersApplied, data:bookings}); } catch(error){ console.error("Admin get all bookings err:",error); res.status(500).json({success:false, message:'Server error getting bookings.'}); }
};

/** approveBooking (Admin) */
exports.approveBooking = async (req, res, next) => {
  const bookingId=req.params.id; if(!mongoose.Types.ObjectId.isValid(bookingId)){return res.status(400).json({success:false, message:"Invalid ID"})} try {const booking=await Booking.findById(bookingId).populate('user','email username').populate('auditorium').populate('department','name'); if(!booking){return res.status(404).json({success:false, message:`Booking ${bookingId} not found.`})} if(booking.status!=='pending'){return res.status(400).json({success:false, message:`Status already '${booking.status}'.`})} const conflict=await Booking.findOne({_id:{$ne:booking._id}, auditorium:booking.auditorium._id, status:'approved', startTime:{$lt:booking.endTime}, endTime:{$gt:booking.startTime}}); if(conflict){console.warn(`Approve Conflict: ${bookingId} vs ${conflict._id}`);return res.status(409).json({success:false, message:`Time conflicts with approved booking ${conflict._id}.`})} booking.status='approved';booking.rejectionReason=undefined;const updatedBooking=await booking.save();console.log(`Booking ${updatedBooking._id} approved.`); try{if(booking.user?.email&&booking.auditorium&&booking.department){await sendBookingApprovalEmail(booking.user.email, updatedBooking, booking.auditorium, booking.department); console.log(`Approve email sent for ${updatedBooking._id}`)}else{console.warn(`Email skipped approve ${updatedBooking._id}.`)}}catch(e){console.error(`Approve email err ${updatedBooking._id}:`, e.message||e)} res.status(200).json({success:true, message:'Booking approved.', data:updatedBooking});} catch(error){ console.error(`Approve err ${bookingId}:`,error); if(!res.headersSent){res.status(500).json({success:false, message:'Server error approving.'});}}
};

/** rejectBooking (Admin) */
exports.rejectBooking = async (req, res, next) => {
  const bookingId=req.params.id; const{rejectionReason}=req.body; if(!rejectionReason||!rejectionReason.trim()){return res.status(400).json({success:false, message:'Reason required.'})} if(!mongoose.Types.ObjectId.isValid(bookingId)){return res.status(400).json({success:false, message:"Invalid ID"})} try {const booking=await Booking.findById(bookingId).populate('user','email username').populate('auditorium').populate('department','name'); if(!booking){return res.status(404).json({success:false, message:`Booking ${bookingId} not found.`})} if(booking.status!=='pending'){return res.status(400).json({success:false, message:`Status already '${booking.status}'.`})} booking.status='rejected';booking.rejectionReason=rejectionReason.trim();const updatedBooking=await booking.save();console.log(`Booking ${updatedBooking._id} rejected. Reason: ${updatedBooking.rejectionReason}`); try{if(booking.user?.email&&booking.auditorium&&booking.department){await sendBookingRejectionEmail(booking.user.email,updatedBooking,booking.auditorium,booking.department,updatedBooking.rejectionReason);console.log(`Reject email sent ${updatedBooking._id}`)}else{console.warn(`Email skipped reject ${updatedBooking._id}`)}}catch(e){console.error(`Reject email err ${updatedBooking._id}:`, e.message||e)} res.status(200).json({success:true, message:'Booking rejected.', data:updatedBooking});} catch(error){ console.error(`Reject err ${bookingId}:`, error); if(!res.headersSent){res.status(500).json({success:false, message:'Server error rejecting.'});}}
};

/** getBookingStats (Admin) */
exports.getBookingStats = async (req, res, next) => {
    const groupByField=req.query.groupBy; console.log(`Get Stats | GroupBy: ${groupByField||'overall'}`); try {let pipeline=[]; if(groupByField==='auditorium'||groupByField==='department'){pipeline=[{$group:{_id:{group:`$${groupByField}`,status:'$status'},count:{$sum:1}}},{$group:{_id:'$_id.group',stats:{$push:{k:"$_id.status",v:"$count"}},total:{$sum:'$count'}}},{$lookup:{from:groupByField==='auditorium'?'auditoria':'departments',localField:'_id',foreignField:'_id',as:'groupInfo'}},{$project:{_id:1,name:{$ifNull:[{$arrayElemAt:['$groupInfo.name',0]},'Unknown']},statsAsObject:{$arrayToObject:'$stats'},total:1}},{$replaceRoot:{newRoot:{$mergeObjects:[{_id:'$_id',name:'$name',total:'$total',pending:0,approved:0,rejected:0},'$statsAsObject']}}},{$sort:{name:1}}]} else {pipeline=[{$group:{_id:'$status',count:{$sum:1}}},{$group:{_id:null,stats:{$push:{k:"$_id",v:"$count"}},total:{$sum:"$count"}}},{$replaceRoot:{newRoot:{$mergeObjects:[{total:0,pending:0,approved:0,rejected:0},{$arrayToObject:"$stats"},{total:{$ifNull:["$total",0]}}]}}}]} const result=await Booking.aggregate(pipeline); const data=(groupByField==='auditorium'||groupByField==='department')?result:(result[0]||{total:0,pending:0,approved:0,rejected:0}); res.status(200).json({success:true, groupedBy:groupByField||'overall', data:data});} catch(error){console.error(`Stats err (GroupBy:${groupByField||'overall'}):`,error);res.status(500).json({success:false, message:'Server error getting stats.'});}
};

/** withdrawBooking (User) */
exports.withdrawBooking = async (req, res, next) => {
    const bookingId=req.params.id; const userId=req.user._id; console.log(`DELETE /bookings/${bookingId} | User: ${userId}`); if(!mongoose.Types.ObjectId.isValid(bookingId)){return res.status(400).json({success:false, message:'Invalid ID.'})} try {const booking=await Booking.findOne({_id:bookingId, user:userId}); if(!booking){return res.status(404).json({success:false, message:'Booking not found or no permission.'})} if(!['pending','approved'].includes(booking.status)){return res.status(400).json({success:false, message:`Cannot withdraw status: '${booking.status}'.`})} if(booking.status==='approved'){const now=DateTime.now(); const startTime=DateTime.fromJSDate(booking.startTime); const allowedWithdrawTime=startTime.minus({hours:bookingLeadTimeHours||2}); if(now>allowedWithdrawTime){return res.status(400).json({success:false, message:`Cannot withdraw approved booking <= ${bookingLeadTimeHours} hrs before start.`})}} if(booking.eventImages&&booking.eventImages.length>0){booking.eventImages.forEach(p=>{if(p){console.log(`Withdrawal cleanup: ${p}`);cleanupUploadedFileOnError(p)}})} await Booking.deleteOne({_id:bookingId}); console.log(`Booking ${bookingId} withdrawn by ${userId}.`); res.status(200).json({success:true, message:'Booking withdrawn.'});} catch(error){ console.error(`Withdraw err ${bookingId} user ${userId}:`, error); if(!res.headersSent){res.status(500).json({success:false, message:'Server error withdrawing.'});}}
};

/** requestReschedule (User) */
exports.requestReschedule = async (req, res, next) => {
  const bookingId=req.params.id; const userId=req.user._id; const{newStartTime, newEndTime}=req.body; console.log(`PUT /bookings/${bookingId} (Reschedule) | User: ${userId}`); if(!newStartTime||!newEndTime){return res.status(400).json({success:false, message:'New times required.'})} if(!mongoose.Types.ObjectId.isValid(bookingId)){return res.status(400).json({success:false, message:'Invalid ID.'})} try {const booking=await Booking.findOne({_id:bookingId, user:userId}).populate('auditorium').populate('department','name'); if(!booking){return res.status(404).json({success:false, message:'Booking not found/no permission.'})} if(booking.status!=='approved'){return res.status(400).json({success:false, message:`Only approved can be rescheduled. Status '${booking.status}'.`})} const startNew=DateTime.fromISO(newStartTime); const endNew=DateTime.fromISO(newEndTime); if(!startNew.isValid||!endNew.isValid){return res.status(400).json({success:false, message:'Invalid new date/time format.'})} const startJS=startNew.toJSDate(); const endJS=endNew.toJSDate(); if(startJS>=endJS){return res.status(400).json({success:false, message:'New end > start required.'})} const startNewIST=startNew.setZone(istTimezone); if(startNewIST.hour<openingHourIST){return res.status(400).json({success:false, message:`New start >= ${openingHourIST}:00 AM ${istTimezone}.`})} const now=DateTime.now(); if(startNew<now.plus({hours:bookingLeadTimeHours||2})){return res.status(400).json({success:false, message:`New start >= ${bookingLeadTimeHours}h ahead.`})} if(booking.startTime.getTime()===startJS.getTime()&&booking.endTime.getTime()===endJS.getTime()){return res.status(400).json({success:false, message:`Times unchanged.`})} const conflictNew=await Booking.findOne({_id:{$ne:booking._id}, auditorium:booking.auditorium._id, status:'approved', startTime:{$lt:endJS}, endTime:{$gt:startJS}}); if(conflictNew){console.warn(`Reschedule Conflict ${bookingId} vs ${conflictNew._id}.`); return res.status(409).json({success:false, message:`New time conflicts.`})} booking.startTime=startJS; booking.endTime=endJS; booking.status='pending'; booking.rejectionReason=undefined; const saved=await booking.save(); console.log(`Reschedule request ${bookingId} by ${userId}. Status pending.`); const populated=await Booking.findById(saved._id).populate('user','email username').populate('auditorium').populate('department','name'); res.status(200).json({success:true, message:'Reschedule request submitted, awaiting re-approval.', data:populated});} catch(error){ console.error(`Reschedule err ${bookingId}:`, error); if(!res.headersSent){if(error.name==='ValidationError'||error.name==='CastError'){return res.status(400).json({success:false, message:error.message})} res.status(500).json({success:false, message:'Server error rescheduling.'})}}
};

/** getAuditoriumSchedule */
exports.getAuditoriumSchedule = async (req, res, next) => {
  const {auditoriumId}=req.params; const year=parseInt(req.query.year,10); const month=parseInt(req.query.month,10); console.log(`GET Schedule/${auditoriumId}|Yr:${year},Mo:${month}`); if(!mongoose.Types.ObjectId.isValid(auditoriumId)){return res.status(400).json({success:false, message:'Invalid Audi ID.'})} if(isNaN(year)||isNaN(month)||month<1||month>12||year<1970||year>2100){return res.status(400).json({success:false, message:'Valid yr/mo needed.'})} try {const startLocal=DateTime.local(year,month,1,{zone:istTimezone}).startOf('month'); const endLocal=DateTime.local(year,month,1,{zone:istTimezone}).endOf('month'); const startUTC=startLocal.toUTC().toJSDate(); const endUTC=endLocal.toUTC().toJSDate(); console.log(`Sched Query UTC: ${startUTC.toISOString()} - ${endUTC.toISOString()}`); const schedule=await Booking.find({auditorium:auditoriumId, status:'approved', startTime:{$lt:endUTC}, endTime:{$gt:startUTC}}).populate('user','username email').select('eventName startTime endTime user description').sort({startTime:1}); res.status(200).json({success:true, message:`Sched fetched ${startLocal.toFormat('MMM yyyy')}`, count:schedule.length, data:schedule});} catch(error){console.error(`Err fetch sched Audi ${auditoriumId}, ${month}/${year}:`,error);res.status(500).json({success:false, message:'Server error get sched.'})}
};

/** getRecentPendingBookings (Admin) */
exports.getRecentPendingBookings = async (req, res, next) => {
    const limit=parseInt(req.query.limit,10);const effectiveLimit=(!isNaN(limit)&&limit>0)?Math.min(limit,20):5; console.log(`GET recent-pending | Limit:${effectiveLimit}`); try {const recent=await Booking.find({status:'pending'}).sort({createdAt:-1}).limit(effectiveLimit).populate('user','username email').populate('auditorium','name').populate('department','name code'); res.status(200).json({success:true, count:recent.length, limit:effectiveLimit, data:recent});} catch(error){console.error("Err recent pending:",error);res.status(500).json({success:false, message:'Server err recent pending.'})}
};

/** getUpcomingBookings (Admin) */
exports.getUpcomingBookings = async (req, res, next) => {
    const days=parseInt(req.query.days,10); const effectiveDays=(!isNaN(days)&&days>0)?Math.min(days,30):7; console.log(`GET upcoming | Days:${effectiveDays}`); try {const now=DateTime.now().toJSDate(); const future=DateTime.now().plus({days:effectiveDays}).endOf('day').toJSDate(); console.log(`Upcoming query: ${now.toISOString()}-${future.toISOString()}`); const upcoming=await Booking.find({status:'approved',startTime:{$gte:now,$lt:future}}).sort({startTime:1}).populate('user','username email').populate('auditorium','name').populate('department','name code'); res.status(200).json({success:true, count:upcoming.length, days:effectiveDays, data:upcoming});} catch(error){console.error("Err upcoming:",error);res.status(500).json({success:false, message:'Server err upcoming.'})}
};

/** getBookingTrends (Admin) */
exports.getBookingTrends = async (req, res, next) => {
  const days=parseInt(req.query.days,10);const audId=req.query.auditoriumId; const depId=req.query.departmentId; const effectiveDays=(!isNaN(days)&&days>0)?Math.min(days,90):30; console.log(`GET trends|Days:${effectiveDays},Aud:${audId||'N/A'},Dep:${depId||'N/A'}`); try {const startDate=DateTime.now().minus({days:effectiveDays}).startOf('day').toJSDate();console.log(`Trends start:${startDate.toISOString()}`);const match={createdAt:{$gte:startDate}};if(audId&&mongoose.Types.ObjectId.isValid(audId)){match.auditorium=new mongoose.Types.ObjectId(audId);console.log(`Trends filter Audi:${audId}`)}else if(audId){console.warn(`Invalid audId trend:${audId}`)} if(depId&&mongoose.Types.ObjectId.isValid(depId)){match.department=new mongoose.Types.ObjectId(depId);console.log(`Trends filter Dept:${depId}`)}else if(depId){console.warn(`Invalid depId trend:${depId}`)} const pipeline=[{$match:match},{$group:{_id:{$dateToString:{format:"%Y-%m-%d",date:"$createdAt",timezone:istTimezone}},count:{$sum:1}}},{$project:{_id:0,date:"$_id",count:1}},{$sort:{date:1}}];const trends=await Booking.aggregate(pipeline);const filled=[];let curr=DateTime.fromJSDate(startDate).setZone(istTimezone);const end=DateTime.now().setZone(istTimezone).startOf('day');const map=new Map(trends.map(i=>[i.date,i.count]));while(curr<=end){const dStr=curr.toFormat('yyyy-MM-dd');filled.push({date:dStr,count:map.get(dStr)||0});curr=curr.plus({days:1})} res.status(200).json({success:true, days:effectiveDays, filters:{auditoriumId:audId,departmentId:depId}, data:filled});}catch(error){console.error(`Err trends(Filt Aud-${audId||'N/A'},Dep-${depId||'N/A'}):`,error);res.status(500).json({success:false, message:'Server err get trends.'})}
};

/** getAuditoriumAvailability */
exports.getAuditoriumAvailability = async (req, res, next) => {
    const {auditoriumId}=req.params;const year=parseInt(req.query.year,10);const month=parseInt(req.query.month,10);console.log(`GET Avail/${auditoriumId}|Yr:${year},Mo:${month}`);if(!mongoose.Types.ObjectId.isValid(auditoriumId)){return res.status(400).json({success:false, message:'Invalid Audi ID.'})} if(isNaN(year)||isNaN(month)||month<1||month>12||year<1970||year>2100){return res.status(400).json({success:false, message:'Valid yr/mo needed.'})} try {const startUTC=DateTime.local(year,month,1,{zone:istTimezone}).startOf('month').toUTC().toJSDate();const endUTC=DateTime.local(year,month,1,{zone:istTimezone}).endOf('month').toUTC().toJSDate();console.log(`Avail Query UTC: ${startUTC.toISOString()}-${endUTC.toISOString()}`);const booked=await Booking.find({auditorium:auditoriumId, status:'approved', startTime:{$lt:endUTC}, endTime:{$gt:startUTC}}).select('startTime endTime -_id').lean();res.status(200).json({success:true, message:`Avail fetch ${year}-${String(month).padStart(2,'0')}`, count:booked.length, data:booked});}catch(error){console.error(`Err Avail Audi ${auditoriumId}, ${month}/${year}:`,error);res.status(500).json({success:false, message:'Server err get avail.'})}
};

/** getPublicEvents */
exports.getPublicEvents = async (req, res) => {
    try {const now=new Date(); const nextWeek=new Date(now.getTime()+6048e5);const events=await Booking.find({status:'approved',$or:[{startTime:{$lte:now},endTime:{$gte:now}},{startTime:{$gt:now,$lt:nextWeek}}]}).sort({startTime:1}).populate('auditorium','name').select('eventName startTime endTime auditorium eventImages'); console.log('Found public events:',events.length);res.status(200).json({success:true,data:events});}catch(error){console.error("Err public events:",error);res.status(500).json({success:false, message:'Error fetching events'})}
};

/**
 * @desc    Check if a time slot is available for a given auditorium, optionally excluding a specific booking
 * @route   GET /api/bookings/check-availability?auditoriumId=ID&startTime=ISO&endTime=ISO&excludeBookingId=ID (optional)
 * @access  Private (User - needs login)
 */
exports.checkAvailability = async (req, res, next) => {
    const { auditoriumId, startTime, endTime, excludeBookingId } = req.query; // Added excludeBookingId
    console.log(`[API Call] GET /check-availability | Auditorium: ${auditoriumId}, Start: ${startTime}, End: ${endTime}, Exclude: ${excludeBookingId || 'N/A'}`);

    // --- Validation ---
    if (!auditoriumId || !startTime || !endTime) { return res.status(400).json({ success: false, message: 'Missing required query parameters: auditoriumId, startTime, endTime.' }); }
    if (!mongoose.Types.ObjectId.isValid(auditoriumId)) { return res.status(400).json({ success: false, message: 'Invalid Auditorium ID format.' }); }
    if (excludeBookingId && !mongoose.Types.ObjectId.isValid(excludeBookingId)) { return res.status(400).json({ success: false, message: 'Invalid excludeBookingId format.' }); }

    let startDateTimeJS, endDateTimeJS;
    try {
        const startLuxon = DateTime.fromISO(startTime); const endLuxon = DateTime.fromISO(endTime);
        if (!startLuxon.isValid || !endLuxon.isValid) throw new Error('Invalid ISO date format.');
        startDateTimeJS = startLuxon.toJSDate(); endDateTimeJS = endLuxon.toJSDate();
        if (startDateTimeJS >= endDateTimeJS) return res.status(400).json({ success: false, message: 'End time must be strictly after start time.' });
    } catch (e) { console.error("Date parsing error:", e.message); return res.status(400).json({ success: false, message: 'Invalid startTime or endTime format. Use full ISO 8601 format.' }); }

    try {
        // Build Conflict Query
        const conflictQuery = {
            auditorium: auditoriumId,
            status: 'approved',
            startTime: { $lt: endDateTimeJS },
            endTime: { $gt: startDateTimeJS },
        };
        // *** Exclude the specific booking ID if provided ***
        if (excludeBookingId) {
            conflictQuery._id = { $ne: excludeBookingId }; // $ne means "not equal"
            console.log(`[DEBUG] Excluding booking ${excludeBookingId} from conflict check.`);
        } else {
            console.log(`[DEBUG] No booking ID excluded.`);
        }

        const conflictingBooking = await Booking.findOne(conflictQuery)
            .populate('department', 'name')
            .populate('user', 'username')
            .select('eventName startTime endTime department user _id') // Ensure _id is selected for check below
            .lean();

        if (conflictingBooking) {
             console.log(`[Conflict Found] Audi ${auditoriumId} conflicts with ${conflictingBooking._id}`);
             res.status(200).json({
                success: true, available: false,
                conflictingBooking: {
                    _id: conflictingBooking._id,
                    eventName: conflictingBooking.eventName,
                    department: conflictingBooking.department?.name || 'N/A',
                    user: conflictingBooking.user?.username || 'N/A',
                    startTime: conflictingBooking.startTime.toISOString(),
                    endTime: conflictingBooking.endTime.toISOString()
                },
                message: `Time slot conflicts with '${conflictingBooking.eventName}'.`
            });
        } else {
            console.log(`[Availability Check] Audi ${auditoriumId} AVAILABLE ${startTime} - ${endTime}`);
            res.status(200).json({ success: true, available: true, message: 'Time slot is available.' });
        }
    } catch (error) { console.error(`[Error] Checking avail for Audi ${auditoriumId}:`, error); res.status(500).json({ success: false, message: 'Server error checking availability.' }); }
};

// --- END of Controller ---