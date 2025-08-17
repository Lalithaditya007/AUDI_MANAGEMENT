// server/utils/emailService.js
/**
 * Email Service using Gmail with App Password Authentication
 * 
 * Setup Instructions:
 * 1. Go to your Google Account settings
 * 2. Enable 2-Factor Authentication if not already enabled
 * 3. Go to Security → 2-Step Verification → App passwords
 * 4. Generate a new app password for "Mail"
 * 5. Use the generated 16-character password in GMAIL_APP_PASSWORD env variable
 * 
 * Required Environment Variables:
 * - GMAIL_USER: Your Gmail address (e.g., vnrauditoriums@gmail.com)
 * - GMAIL_APP_PASSWORD: Your Gmail app password (16 characters)
 * - ADMIN_EMAIL: Admin email for notifications
 */

const nodemailer = require('nodemailer');
const { DateTime } = require('luxon'); // For date formatting
require('dotenv').config(); // Ensure environment variables are loaded early

// --- Constants ---
const istTimezone = 'Asia/Kolkata'; // For display formatting
const emailUser = process.env.GMAIL_USER; // Your sending Gmail address
const appPassword = process.env.GMAIL_APP_PASSWORD; // Gmail App Password

// --- Input Validation ---
if (!emailUser || !appPassword) {
  console.error("[Email FATAL] Missing required environment variables for email service (GMAIL_USER, GMAIL_APP_PASSWORD). Email sending will likely fail.");
} else {
    console.log("[Email Service] Configuration loaded. Attempting to initialize transporter.");
}

// --- Helper: Create Nodemailer Transporter ---
let transporterInstance = null;
async function createTransporter() {
    if (transporterInstance) { 
        return transporterInstance; 
    }
    
    try {
        console.log('[Email] Creating transporter with app password authentication...');
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: appPassword
            },
            pool: true,
            maxConnections: 5,
            maxMessages: Infinity,
            rateLimit: 10,
            logger: false,
            debug: false
        });
        
        transporterInstance = transporter;
        console.log("[Email Service] Transporter created and cached.");
        
        try { 
            await transporter.verify(); 
            console.log("[Email Service] Transporter verified successfully."); 
        } catch (verifyError) { 
            console.warn("[Email Service WARN] Transporter verification failed:", verifyError.message || verifyError); 
        }
        
        return transporter;
    } catch (error) {
        console.error("[Email Service FATAL] Error creating or authenticating email transporter:", error.message || error);
        
        if (error.code === 'EAUTH' || error.message.includes('auth failed')) { 
            console.error("[Email Service FATAL] SMTP AUTH ERROR: Check Gmail credentials or app password."); 
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) { 
            console.error("[Email Service FATAL] NETWORK ERROR: Could not connect to Google servers."); 
        }
        
        transporterInstance = null;
        throw new Error('Failed to initialize email service transporter.');
    }
}

// --- Helper: Date Formatting ---
function formatDateTimeIST(date) {
    if (!date) return 'N/A';
    try {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error('Input is not a valid Date object');
        }
        // Drop timezone suffix (e.g., GMT+5:30) while keeping IST clock time
        const formatOptions = { ...DateTime.DATETIME_MED_WITH_WEEKDAY };
        return DateTime.fromJSDate(date, { zone: 'utc' })
            .setZone(istTimezone)
            .toLocaleString(formatOptions);
    } catch (e) {
        console.warn(`[Email Service Date Format Error] Could not format date value: ${date}. Error: ${e.message}`);
        return 'Invalid Date';
    }
}

// --- Core Email Sending Helper ---
async function sendEmail(to, subject, html) {
  // ... (keep existing implementation - no changes needed here) ...
  if (!to || !subject || !html) { const missing = []; if (!to) missing.push('to'); if (!subject) missing.push('subject'); if (!html) missing.push('html'); console.error(`[Email Service Error] sendEmail called with missing parameters: ${missing.join(', ')}`); throw new Error(`Missing required parameters: ${missing.join(', ')}`); }
  try { const transporter = await createTransporter(); const mailOptions = { from: `"Auditorium Management System" <${emailUser}>`, to: to, subject: subject, html: html, }; console.log(`[Email Service] Preparing to send email to ${to} with subject: "${subject}"...`); const info = await transporter.sendMail(mailOptions); console.log(`[Email Service Sent] Successfully sent email to: ${to} | Subject: ${subject} | Message ID: ${info.messageId}`); return info; } catch (error) { console.error(`[Email Service Error] Failed to send email to ${to} with subject "${subject}":`, error.message || error); if (error.response) { console.error('[Email Service Error] SMTP Response:', error.response); } throw error; }
}

// ==================================================
//             EXPORTED EMAIL FUNCTIONS
// ==================================================

exports.sendBookingRequestEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
    // ... (keep existing implementation) ...
    try { if (!userEmail) throw new Error('Recipient email missing.'); if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details.'); if (!auditoriumDetails?.name) throw new Error('Auditorium details missing.'); if (!departmentDetails?.name) throw new Error('Department details missing.'); const startTimeIST=formatDateTimeIST(bookingDetails.startTime); const endTimeIST=formatDateTimeIST(bookingDetails.endTime); const auditoriumName=auditoriumDetails.name||'N/A'; const departmentName=departmentDetails.name||'N/A'; const eventName=bookingDetails.eventName||'N/A'; const userName=bookingDetails.user?.username||'Valued User'; const emailSubject=`📝 Auditorium Booking Request Received: ${eventName}`; const htmlContent=`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px"><h2 style="color:#333;text-align:center;margin-bottom:20px">Booking Request Received</h2><p>Dear ${userName},</p><p>Your request to book an auditorium has been received and is currently under review by the administration team.</p><div style="background:#f8f9fa;padding:15px;border-left:4px solid #007bff;border-radius:4px;margin:20px 0"><h3 style="color:#007bff;margin-top:0;margin-bottom:10px;font-size:1.1em">Event Details</h3><p style="margin:5px 0"><strong>Event:</strong> ${eventName}</p><p style="margin:5px 0"><strong>Venue:</strong> ${auditoriumName}</p><p style="margin:5px 0"><strong>Department:</strong> ${departmentName}</p><p style="margin:5px 0"><strong>Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</p></div><p>You will receive another email once your request has been approved or rejected.</p><p style="margin-top:25px;font-size:0.9em;color:#555">If you have any questions, please contact the administration office.</p><p style="margin-top:30px;font-size:0.9em;color:#777">Best regards,<br>Auditorium Management Team</p></div><div style="text-align:center;margin-top:20px;font-size:0.8em;color:#aaa">This is an automated message, please do not reply.</div>`; const info=await sendEmail(userEmail, emailSubject, htmlContent); return info; } catch (error) { console.error(`[Email Service Error] Failed sending booking request email for booking ${bookingDetails?._id} to ${userEmail}:`, error.message || error); return; }
};

exports.sendBookingApprovalEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
  // ... (keep existing implementation) ...
    try { if (!userEmail) throw new Error('Recipient email missing.'); if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details.'); if (!auditoriumDetails?.name || !auditoriumDetails.location) throw new Error('Auditorium details missing.'); if (!departmentDetails?.name) throw new Error('Department details missing.'); const startTimeIST=formatDateTimeIST(bookingDetails.startTime); const endTimeIST=formatDateTimeIST(bookingDetails.endTime); const auditoriumName=auditoriumDetails.name||'N/A'; const auditoriumLocation=auditoriumDetails.location||'N/A'; const departmentName=departmentDetails.name||'N/A'; const eventName=bookingDetails.eventName||'N/A'; const userName=bookingDetails.user?.username||'Valued User'; const emailSubject=`✅ Auditorium Booking Approved: ${eventName}`; const htmlContent=`<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px\"><h2 style=\"color:#28a745;text-align:center;margin-bottom:20px\">Booking Approved!</h2><p>Dear ${userName},</p><p>We are pleased to inform you that your auditorium booking request has been <strong style=\"color:#28a745\">approved</strong>.</p><div style=\"background:#f8f9fa;padding:15px;border-left:4px solid #28a745;border-radius:4px;margin:20px 0\"><h3 style=\"color:#28a745;margin-top:0;margin-bottom:10px;font-size:1.1em\">Event Details</h3><p style=\"margin:5px 0\"><strong>Event:</strong> ${eventName}</p><p style=\"margin:5px 0\"><strong>Venue:</strong> ${auditoriumName} (${auditoriumLocation})</p><p style=\"margin:5px 0\"><strong>Department:</strong> ${departmentName}</p><p style=\"margin:5px 0\"><strong>Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</p></div><p>Please ensure to follow all guidelines for using the auditorium.</p><p style=\"margin-top:25px;font-size:0.9em;color:#555\">For any questions or specific requirements, please contact the administration office.</p><p style=\"margin-top:30px;font-size:0.9em;color:#777\">Best regards,<br>Auditorium Management Team</p></div><div style=\"text-align:center;margin-top:20px;font-size:0.8em;color:#aaa\">This is an automated message, please do not reply.</div>`; const info=await sendEmail(userEmail, emailSubject, htmlContent); return info; } catch (error) { console.error(`[Email Service Error] Failed sending approval email for booking ${bookingDetails?._id} to ${userEmail}:`, error.message || error); return; }
};

exports.sendBookingRejectionEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails, rejectionReason) => {
  // ... (keep existing implementation) ...
    try { if (!userEmail) throw new Error('Recipient email missing.'); if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details.'); if (!auditoriumDetails?.name) throw new Error('Auditorium details missing.'); if (!departmentDetails?.name) throw new Error('Department details missing.'); if (!rejectionReason || !rejectionReason.trim()) throw new Error('Rejection reason missing.'); const startTimeIST=formatDateTimeIST(bookingDetails.startTime); const endTimeIST=formatDateTimeIST(bookingDetails.endTime); const auditoriumName=auditoriumDetails.name||'N/A'; const departmentName=departmentDetails.name||'N/A'; const eventName=bookingDetails.eventName||'N/A'; const userName=bookingDetails.user?.username||'Valued User'; const reason=rejectionReason.trim(); const emailSubject=`Auditorium Booking Request Update: ${eventName}`; const htmlContent=`<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px\"><h2 style=\"color:#dc3545;text-align:center;margin-bottom:20px\">Booking Request Rejected</h2><p>Dear ${userName},</p><p>We regret to inform you that we are unable to accommodate your auditorium booking request at this time.</p><div style=\"background:#f8f9fa;padding:15px;border-left:4px solid #dc3545;border-radius:4px;margin:20px 0\"><h3 style=\"color:#dc3545;margin-top:0;margin-bottom:10px;font-size:1.1em\">Event Details</h3><p style=\"margin:5px 0\"><strong>Event:</strong> ${eventName}</p><p style=\"margin:5px 0\"><strong>Venue:</strong> ${auditoriumName}</p><p style=\"margin:5px 0\"><strong>Department:</strong> ${departmentName}</p><p style=\"margin:5px 0\"><strong>Requested Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</p></div><div style=\"background:#fff3cd;padding:15px;border-radius:4px;margin:20px 0;border:1px solid #ffc371\"><p style=\"color:#856404;margin:0;font-size:1.1em\"><strong>Reason for Rejection:</strong></p><p style=\"color:#856404;margin:10px 0 0 0\">${reason}</p></div><p style=\"margin-top:25px;font-size:0.9em;color:#555\">You are welcome to submit a new booking request for an alternative date or time. If you have any questions, please contact the administration office.</p><p style=\"margin-top:30px;font-size:0.9em;color:#777\">Best regards,<br>Auditorium Management Team</p></div><div style=\"text-align:center;margin-top:20px;font-size:0.8em;color:#aaa\">This is an automated message, please do not reply.</div>`; const info=await sendEmail(userEmail, emailSubject, htmlContent); return info; } catch (error) { console.error(`[Email Service Error] Failed sending rejection email for booking ${bookingDetails?._id} to ${userEmail}:`, error.message || error); return; }
};

// NEW: Send Booking Cancellation Email to User
exports.sendBookingCancellationEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails, cancellationReason) => {
    try {
        if (!userEmail) throw new Error('Recipient email missing.');
        if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime)
            throw new Error('Incomplete booking details.');
        if (!auditoriumDetails?.name) throw new Error('Auditorium details missing.');
        if (!departmentDetails?.name) throw new Error('Department details missing.');
        if (!cancellationReason || !cancellationReason.trim()) throw new Error('Cancellation reason missing.');

        const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
        const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
        const auditoriumName = auditoriumDetails.name || 'N/A';
        const departmentName = departmentDetails.name || 'N/A';
        const eventName = bookingDetails.eventName || 'N/A';
        const userName = bookingDetails.user?.username || 'Valued User';
        const reason = cancellationReason.trim();

        const emailSubject = `❌ Auditorium Booking Cancelled: ${eventName}`;
        const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px"><h2 style=\"color:#dc3545;text-align:center;margin-bottom:20px\">Booking Cancelled</h2><p>Dear ${userName},</p><p>We regret to inform you that your approved auditorium booking has been <strong style=\"color:#dc3545;\">cancelled by the administration</strong>.</p><div style=\"background:#f8f9fa;padding:15px;border-left:4px solid #dc3545;border-radius:4px;margin:20px 0\"><h3 style=\"color:#dc3545;margin-top:0;margin-bottom:10px;font-size:1.1em\">Event Details</h3><p style=\"margin:5px 0\"><strong>Event:</strong> ${eventName}</p><p style=\"margin:5px 0\"><strong>Venue:</strong> ${auditoriumName}</p><p style=\"margin:5px 0\"><strong>Department:</strong> ${departmentName}</p><p style=\"margin:5px 0\"><strong>Scheduled:</strong> ${startTimeIST} - ${endTimeIST}</p></div><div style=\"background:#fff3cd;padding:15px;border-radius:4px;margin:20px 0;border:1px solid #ffc371\"><p style=\"color:#856404;margin:0;font-size:1.1em\"><strong>Reason for Cancellation:</strong></p><p style=\"color:#856404;margin:10px 0 0 0\">${reason}</p></div><p style=\"margin-top:25px;font-size:0.9em;color:#555\">We apologize for the inconvenience caused. You may submit a new booking request for a different time.</p><p style=\"margin-top:30px;font-size:0.9em;color:#777\">Best regards,<br>Auditorium Management Team</p></div><div style=\"text-align:center;margin-top:20px;font-size:0.8em;color:#aaa\">This is an automated message, please do not reply.</div>`;

        const info = await sendEmail(userEmail, emailSubject, htmlContent);
        return info;
    } catch (error) {
        console.error(`[Email Service Error] Failed sending cancellation email for booking ${bookingDetails?._id} to ${userEmail}:`, error.message || error);
        return;
    }
};

exports.sendBookingRequestNotificationToAdmin = async (adminEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
    // ... (keep existing implementation) ...
     try { if (!adminEmail) throw new Error('Admin email missing.'); if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details.'); if (!auditoriumDetails?.name) throw new Error('Auditorium details missing.'); if (!departmentDetails?.name) throw new Error('Department details missing.'); const startTimeIST=formatDateTimeIST(bookingDetails.startTime); const endTimeIST=formatDateTimeIST(bookingDetails.endTime); const auditoriumName=auditoriumDetails.name||'N/A'; const departmentName=departmentDetails.name||'N/A'; const eventName=bookingDetails.eventName||'N/A'; const userEmail=bookingDetails.user?.email||'N/A'; const userName=bookingDetails.user?.username||'N/A'; const description=bookingDetails.description||'No description provided'; const emailSubject=`🔔 New Booking Request: ${eventName} - ${auditoriumName}`; const htmlContent=`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;border:1px solid #ddd;border-radius:8px"><div style="text-align:center;margin-bottom:25px"><h1 style="color:#dc2626;margin:0;font-size:24px">New Booking Request</h1><p style="color:#666;margin-top:5px">A new auditorium booking request is pending your approval</p></div><div style="background:#f8f9fa;padding:15px;border-left:4px solid #dc2626;border-radius:4px;margin:20px 0"><h2 style="color:#dc2626;margin-top:0;margin-bottom:10px;font-size:1.1em">Event Information</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:6px 0;width:130px;vertical-align:top"><strong>Event Name:</strong></td><td style="padding:6px 0;vertical-align:top">${eventName}</td></tr><tr><td style="padding:6px 0;vertical-align:top"><strong>Description:</strong></td><td style="padding:6px 0;vertical-align:top">${description}</td></tr><tr><td style="padding:6px 0;vertical-align:top"><strong>Venue:</strong></td><td style="padding:6px 0;vertical-align:top">${auditoriumName}</td></tr><tr><td style="padding:6px 0;vertical-align:top"><strong>Department:</strong></td><td style="padding:6px 0;vertical-align:top">${departmentName}</td></tr></table></div><div style="background:#fff3cd;padding:15px;border-radius:4px;margin:20px 0;border:1px solid #ffc371"><h2 style="color:#856404;margin-top:0;margin-bottom:10px;font-size:1.1em">Schedule</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:6px 0;width:130px"><strong>Start Time:</strong></td><td style="padding:6px 0">${startTimeIST}</td></tr><tr><td style="padding:6px 0"><strong>End Time:</strong></td><td style="padding:6px 0">${endTimeIST}</td></tr></table></div><div style="background:#e8eaf6;padding:15px;border-left:4px solid #3f51b5;border-radius:4px;margin:20px 0"><h2 style="color:#3f51b5;margin-top:0;margin-bottom:10px;font-size:1.1em">Requester Details</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:6px 0;width:130px"><strong>Name:</strong></td><td style="padding:6px 0">${userName}</td></tr><tr><td style="padding:6px 0"><strong>Email:</strong></td><td style="padding:6px 0">${userEmail}</td></tr></table></div><div style="margin-top:30px;text-align:center"><p style="color:#666">Please log in to the admin dashboard to review and act on this request.</p></div></div><div style="text-align:center;margin-top:20px;font-size:0.8em;color:#aaa">This is an automated message from the Auditorium Management System.<br>Please do not reply to this email.</div>`; const info=await sendEmail(adminEmail, emailSubject, htmlContent); return info; } catch (error) { console.error(`[Email Service Error] Failed sending admin notification email for booking ${bookingDetails?._id} to ${adminEmail}:`, error.message || error); return; }
};

exports.sendBookingWithdrawalConfirmationEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
    // ... (keep existing implementation) ...
    try { if (!userEmail) throw new Error('Recipient email missing.'); if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details.'); if (!auditoriumDetails?.name) throw new Error('Auditorium details missing.'); if (!departmentDetails?.name) throw new Error('Department details missing.'); const startTimeIST=formatDateTimeIST(bookingDetails.startTime); const endTimeIST=formatDateTimeIST(bookingDetails.endTime); const auditoriumName=auditoriumDetails.name||'N/A'; const departmentName=departmentDetails.name||'N/A'; const eventName=bookingDetails.eventName||'N/A'; const userName=bookingDetails.user?.username||'Valued User'; const emailSubject=`Booking Withdrawal Confirmation: ${eventName}`; const htmlContent=`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px"><h2 style="color:#dc3545;text-align:center;margin-bottom:20px">Booking Withdrawal Confirmation</h2><p>Dear ${userName},</p><p>This email confirms that you have successfully withdrawn your booking request for:</p><div style="background:#f8f9fa;padding:15px;border-left:4px solid #dc3545;border-radius:4px;margin:20px 0"><h3 style="color:#dc3545;margin-top:0;margin-bottom:10px;font-size:1.1em">Event Details</h3><p style="margin:5px 0"><strong>Event:</strong> ${eventName}</p><p style="margin:5px 0"><strong>Venue:</strong> ${auditoriumName}</p><p style="margin:5px 0"><strong>Department:</strong> ${departmentName}</p><p style="margin:5px 0"><strong>Scheduled Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</p></div><p>The time slot is now available for other bookings. If you wish to book another time slot, please submit a new booking request.</p><p style="margin-top:25px;font-size:0.9em;color:#555">If you did not initiate this withdrawal, please contact the administration office immediately.</p><p style="margin-top:30px;font-size:0.9em;color:#777">Best regards,<br>Auditorium Management Team</p></div><div style="text-align:center;margin-top:20px;font-size:0.8em;color:#aaa">This is an automated message, please do not reply.</div>`; const info=await sendEmail(userEmail, emailSubject, htmlContent); return info; } catch (error) { console.error(`[Email Service Error] Failed sending withdrawal confirmation email for booking ${bookingDetails?._id} to ${userEmail}:`, error.message || error); return; }
};

exports.sendRescheduleRequestEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails, oldTimes) => {
    // ... (keep existing implementation) ...
    try { const oldStartTimeIST = formatDateTimeIST(oldTimes.startTime); const oldEndTimeIST = formatDateTimeIST(oldTimes.endTime); const newStartTimeIST = formatDateTimeIST(bookingDetails.startTime); const newEndTimeIST = formatDateTimeIST(bookingDetails.endTime); const userName = bookingDetails.user?.username || 'User'; const emailSubject = `Booking Reschedule Request: ${bookingDetails.eventName}`; const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;"><h2 style="color: #f59e0b; text-align: center; margin-bottom: 20px;">Booking Reschedule Request</h2><p>Dear ${userName},</p><p>Your request to reschedule your booking has been submitted and is pending approval.</p><div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;"><h3 style="color: #f59e0b; margin-top: 0; margin-bottom: 10px;">Event Details</h3><p><strong>Event:</strong> ${bookingDetails.eventName}</p><p><strong>Venue:</strong> ${auditoriumDetails?.name || 'N/A'}</p><p><strong>Department:</strong> ${departmentDetails?.name || 'N/A'}</p></div><div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;"><h3 style="color: #856404; margin-top: 0; margin-bottom: 10px;">Schedule Change</h3><p><strong>Previous Schedule:</strong><br>${oldStartTimeIST} - ${oldEndTimeIST}</p><p style="margin-top: 10px;"><strong>Requested New Schedule:</strong><br>${newStartTimeIST} - ${newEndTimeIST}</p></div><p>Your booking status has been set to \"pending\" while we review this change. You will receive another email once the reschedule request is approved or rejected.</p><p style="margin-top: 25px; color: #666;">If you have any questions, please contact the administration office.</p></div><div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">This is an automated message, please do not reply.</div>`; const info = await sendEmail(userEmail, emailSubject, htmlContent); return info; } catch (error) { console.error(`[Email Service Error] Failed sending reschedule email:`, error); return; }
};

exports.sendRescheduleRequestNotificationToAdmin = async (adminEmail, bookingDetails, auditoriumDetails, departmentDetails, oldTimes) => {
    // ... (keep existing implementation) ...
    try { if (!adminEmail) throw new Error('Admin email missing.'); const oldStartTimeIST = formatDateTimeIST(oldTimes.startTime); const oldEndTimeIST = formatDateTimeIST(oldTimes.endTime); const newStartTimeIST = formatDateTimeIST(bookingDetails.startTime); const newEndTimeIST = formatDateTimeIST(bookingDetails.endTime); const userName = bookingDetails.user?.username || 'N/A'; const userEmail = bookingDetails.user?.email || 'N/A'; const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;"><h2 style="color: #f59e0b; text-align: center; margin-bottom: 20px;">New Reschedule Request</h2><div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;"><h3 style="color: #f59e0b; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Event Details</h3><p><strong>Event:</strong> ${bookingDetails.eventName}</p><p><strong>Venue:</strong> ${auditoriumDetails?.name}</p><p><strong>Department:</strong> ${departmentDetails?.name}</p><p><strong>Requester:</strong> ${userName} (${userEmail})</p></div><div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;"><h3 style="color: #856404; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Schedule Change</h3><p><strong>Current Schedule:</strong><br/>${oldStartTimeIST} - ${oldEndTimeIST}</p><p style="margin-top: 10px;"><strong>Requested New Schedule:</strong><br/>${newStartTimeIST} - ${newEndTimeIST}</p></div><p style="text-align: center; color: #666;">Please review this request in the admin dashboard.</p></div>`; const emailSubject = `🔄 Reschedule Request: ${bookingDetails.eventName}`; const info = await sendEmail(adminEmail, emailSubject, htmlContent); return info; } catch (error) { console.error(`[Email Service Error] Failed sending admin reschedule notification:`, error); return; }
};


// --- NEW: Send Pending Booking Reminder Email to Admin ---
/**
 * Sends a reminder email to the admin about a pending booking approaching its date.
 * @param {string} adminEmail - The admin's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
// --- NEW: Send Pending Booking Reminder Email to Admin ---
/**
 * Sends a reminder email to the admin about a pending booking approaching its date.
 * @param {string} adminEmail - The admin's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendPendingReminderEmailToAdmin = async (adminEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
  const bookingId = bookingDetails?._id || 'N/A'; // Get ID for logging
  console.log(`[Email Service] Preparing to send PENDING REMINDER for Booking ID: ${bookingId} to ${adminEmail}`); // <-- ADDED LOG

  try {
    // --- Input Validation ---
    if (!adminEmail) throw new Error('Admin email is missing for pending reminder.');
    if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details provided for pending reminder.');
    if (!auditoriumDetails?.name) throw new Error('Auditorium details missing for pending reminder.');
    if (!departmentDetails?.name) throw new Error('Department details missing for pending reminder.');
    if (!bookingDetails.user?.email || !bookingDetails.user?.username) console.warn(`[Email Service WARN] User email or username missing for booking ${bookingId} in pending reminder.`);

    // --- Prepare Email Content ---
    // Removed Booking/Request ID from email content per requirements
    const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
    const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
    const eventDate = DateTime.fromJSDate(bookingDetails.startTime, { zone: 'utc' }).setZone(istTimezone).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
    const auditoriumName = auditoriumDetails.name || 'N/A';
    const departmentName = departmentDetails.name || 'N/A';
    const eventName = bookingDetails.eventName || 'N/A';
    const userEmail = bookingDetails.user?.email || 'N/A';
    const userName = bookingDetails.user?.username || 'N/A';

    const emailSubject = `⏰ REMINDER: Pending Booking Action Required Soon - ${eventName}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Pending Booking Reminder</h1>
             <p style="color: #666; margin-top: 5px;">Action required for a booking scheduled in approximately 2 days.</p>
          </div>
          <div style="background: #fff8eb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;">
            <h2 style="color: #d97706; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Booking Details</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
              <tr> <td style="padding: 5px 0; width: 110px; vertical-align: top;"><strong>Event Name:</strong></td> <td style="padding: 5px 0; vertical-align: top;">${eventName}</td> </tr>
              <tr> <td style="padding: 5px 0; vertical-align: top;"><strong>Venue:</strong></td> <td style="padding: 5px 0; vertical-align: top;">${auditoriumName}</td> </tr>
              <tr> <td style="padding: 5px 0; vertical-align: top;"><strong>Department:</strong></td> <td style="padding: 5px 0; vertical-align: top;">${departmentName}</td> </tr>
              <tr> <td style="padding: 5px 0; vertical-align: top;"><strong>Start Time:</strong></td> <td style="padding: 5px 0; vertical-align: top;">${startTimeIST}</td> </tr>
              <tr> <td style="padding: 5px 0; vertical-align: top;"><strong>End Time:</strong></td> <td style="padding: 5px 0; vertical-align: top;">${endTimeIST}</td> </tr>
              <tr> <td style="padding: 5px 0; vertical-align: top;"><strong>Requested By:</strong></td> <td style="padding: 5px 0; vertical-align: top;">${userName} (${userEmail})</td> </tr>
              <tr> <td style="padding: 5px 0; vertical-align: top;"><strong>Status:</strong></td> <td style="padding: 5px 0; vertical-align: top;"><strong style="color: #d97706;">PENDING</strong></td> </tr>
              
            </table>
          </div>
          <div style="margin-top: 30px; text-align: center; padding: 15px; background-color: #fefce8; border: 1px solid #fde047; border-radius: 5px;">
            <p style="color: #a16207; font-weight: bold; margin: 0 0 10px 0;">This event is scheduled for ${eventDate}.</p>
            <p style="color: #a16207; margin: 0;">Please approve or reject this booking request as soon as possible.</p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">
            This is an automated reminder from the Auditorium Management System.<br>
            Please do not reply to this email.
        </div>
      `;

    // --- Send Email using the helper ---
    console.log(`[Email Service] Calling sendEmail for PENDING REMINDER - Booking ID: ${bookingId}`); // <-- ADDED LOG
    const info = await sendEmail(adminEmail, emailSubject, htmlContent);
    console.log(`[Email Service] Successfully completed sendEmail call for PENDING REMINDER - Booking ID: ${bookingId}`); // <-- ADDED LOG

    return info; // Return info object on success

  } catch (error) {
    // Log error *specifically* for this function
    console.error(`[Email Service Error] Failed sending PENDING REMINDER email for booking ${bookingId} to ${adminEmail}:`, error.message || error); // <-- MODIFIED LOG
    // Do not re-throw here, let the scheduler handle the outcome
    return; // Indicate failure (or throw if you want scheduler to know definitively)
  }
};

// --- NEW: Send Feedback Notification to Admin ---
/**
 * Sends a notification email to the admin when a user submits feedback.
 * @param {string} adminEmail - The admin's email address.
 * @param {object} feedbackDetails - The feedback document with user populated.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendFeedbackNotificationToAdmin = async (adminEmail, feedbackDetails) => {
    const feedbackId = feedbackDetails?._id || 'N/A';
    console.log(`[Email Service] Preparing to send FEEDBACK NOTIFICATION for Feedback ID: ${feedbackId} to ${adminEmail}`);

    try {
        // --- Input Validation ---
        if (!adminEmail) throw new Error('Admin email is missing for feedback notification.');
        if (!feedbackDetails?._id || !feedbackDetails.subject || !feedbackDetails.message) throw new Error('Incomplete feedback details provided for notification.');
        if (!feedbackDetails.user?.email || !feedbackDetails.user?.username) console.warn(`[Email Service WARN] User email or username missing for feedback ${feedbackId} notification.`);

        // --- Prepare Email Content ---
        const partialFeedbackId = feedbackDetails._id.toString().slice(-6);
        const submittedAt = formatDateTimeIST(feedbackDetails.createdAt);
        const feedbackType = feedbackDetails.type || 'feedback';
        const subject = feedbackDetails.subject || 'N/A';
        const message = feedbackDetails.message || 'N/A';
        const userEmail = feedbackDetails.user?.email || 'N/A';
        const userName = feedbackDetails.user?.username || 'N/A';
        const userFullName = `${feedbackDetails.user?.profile?.firstName || ''} ${feedbackDetails.user?.profile?.lastName || ''}`.trim() || userName;
        const attachmentCount = feedbackDetails.attachments?.length || 0;

        const emailSubject = `💬 New Feedback Submitted: ${subject}`;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">New Feedback Received</h1>
                    <p style="color: #666; margin-top: 5px;">A user has submitted feedback that requires your attention</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 20px 0;">
                    <h2 style="color: #3b82f6; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Feedback Details</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                        <tr><td style="padding: 6px 0; width: 130px; vertical-align: top;"><strong>Subject:</strong></td><td style="padding: 6px 0; vertical-align: top;">${subject}</td></tr>
                        <tr><td style="padding: 6px 0; vertical-align: top;"><strong>Type:</strong></td><td style="padding: 6px 0; vertical-align: top; text-transform: capitalize;">${feedbackType}</td></tr>
                        <tr><td style="padding: 6px 0; vertical-align: top;"><strong>Submitted:</strong></td><td style="padding: 6px 0; vertical-align: top;">${submittedAt}</td></tr>
                        <tr><td style="padding: 6px 0; vertical-align: top;"><strong>Feedback ID:</strong></td><td style="padding: 6px 0; vertical-align: top;">...${partialFeedbackId}</td></tr>
                        ${attachmentCount > 0 ? `<tr><td style="padding: 6px 0; vertical-align: top;"><strong>Attachments:</strong></td><td style="padding: 6px 0; vertical-align: top;">${attachmentCount} file(s)</td></tr>` : ''}
                    </table>
                </div>
                <div style="background: #e8eaf6; padding: 15px; border-left: 4px solid #3f51b5; border-radius: 4px; margin: 20px 0;">
                    <h2 style="color: #3f51b5; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">User Information</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                        <tr><td style="padding: 6px 0; width: 130px;"><strong>Name:</strong></td><td style="padding: 6px 0;">${userFullName}</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>Username:</strong></td><td style="padding: 6px 0;">${userName}</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>Email:</strong></td><td style="padding: 6px 0;">${userEmail}</td></tr>
                    </table>
                </div>
                <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffc371;">
                    <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px;">Message:</h3>
                    <p style="color: #856404; margin: 0; line-height: 1.5; white-space: pre-wrap;">${message}</p>
                </div>
                <div style="margin-top: 30px; text-align: center;">
                    <p style="color: #666;">Please log in to the admin dashboard to review and respond to this feedback.</p>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">
                This is an automated notification from the Auditorium Management System.<br>
                Please do not reply to this email.
            </div>
        `;

        console.log(`[Email Service] Calling sendEmail for FEEDBACK NOTIFICATION - Feedback ID: ${feedbackId}`);
        const info = await sendEmail(adminEmail, emailSubject, htmlContent);
        console.log(`[Email Service] Successfully sent feedback notification for Feedback ID: ${feedbackId}`);

        return info;

    } catch (error) {
        console.error(`[Email Service Error] Failed sending FEEDBACK NOTIFICATION email for feedback ${feedbackId} to ${adminEmail}:`, error.message || error);
        return;
    }
};

// --- NEW: Send Report Notification to Admin ---
/**
 * Sends a notification email to the admin when a user submits a report.
 * @param {string} adminEmail - The admin's email address.
 * @param {object} reportDetails - The report document with user populated.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendReportNotificationToAdmin = async (adminEmail, reportDetails) => {
    const reportId = reportDetails?._id || 'N/A';
    console.log(`[Email Service] Preparing to send REPORT NOTIFICATION for Report ID: ${reportId} to ${adminEmail}`);

    try {
        // --- Input Validation ---
        if (!adminEmail) throw new Error('Admin email is missing for report notification.');
        if (!reportDetails?._id || !reportDetails.subject || !reportDetails.description) throw new Error('Incomplete report details provided for notification.');
        if (!reportDetails.reporter?.email || !reportDetails.reporter?.username) console.warn(`[Email Service WARN] Reporter email or username missing for report ${reportId} notification.`);

        // --- Prepare Email Content ---
        const partialReportId = reportDetails._id.toString().slice(-6);
        const submittedAt = formatDateTimeIST(reportDetails.createdAt);
        const reportType = reportDetails.reportType || 'other';
        const severity = reportDetails.severity || 'medium';
        const subject = reportDetails.subject || 'N/A';
        const description = reportDetails.description || 'N/A';
        const reporterEmail = reportDetails.reporter?.email || 'N/A';
        const reporterName = reportDetails.reporter?.username || 'N/A';
        const reporterFullName = `${reportDetails.reporter?.profile?.firstName || ''} ${reportDetails.reporter?.profile?.lastName || ''}`.trim() || reporterName;
        const evidenceCount = reportDetails.evidence?.length || 0;

        // Severity color mapping
        const severityColors = {
            low: '#22c55e',
            medium: '#f59e0b',
            high: '#ef4444',
            critical: '#dc2626'
        };
        const severityColor = severityColors[severity] || '#f59e0b';

        // Report type display mapping
        const reportTypeDisplay = {
            'abuse': 'Abuse',
            'inappropriate_content': 'Inappropriate Content',
            'technical_issue': 'Technical Issue',
            'policy_violation': 'Policy Violation',
            'harassment': 'Harassment',
            'spam': 'Spam',
            'other': 'Other'
        };
        const displayType = reportTypeDisplay[reportType] || reportType;

        const emailSubject = `🚨 New Report Submitted: ${subject}`;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="color: #dc2626; margin: 0; font-size: 24px;">New Report Submitted</h1>
                    <p style="color: #666; margin-top: 5px;">A user has submitted a report that requires immediate attention</p>
                </div>
                <div style="background: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; border-radius: 4px; margin: 20px 0;">
                    <h2 style="color: #dc2626; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Report Details</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                        <tr><td style="padding: 6px 0; width: 130px; vertical-align: top;"><strong>Subject:</strong></td><td style="padding: 6px 0; vertical-align: top;">${subject}</td></tr>
                        <tr><td style="padding: 6px 0; vertical-align: top;"><strong>Type:</strong></td><td style="padding: 6px 0; vertical-align: top;">${displayType}</td></tr>
                        <tr><td style="padding: 6px 0; vertical-align: top;"><strong>Severity:</strong></td><td style="padding: 6px 0; vertical-align: top;"><span style="color: ${severityColor}; font-weight: bold; text-transform: uppercase;">${severity}</span></td></tr>
                        <tr><td style="padding: 6px 0; vertical-align: top;"><strong>Submitted:</strong></td><td style="padding: 6px 0; vertical-align: top;">${submittedAt}</td></tr>
                        <tr><td style="padding: 6px 0; vertical-align: top;"><strong>Report ID:</strong></td><td style="padding: 6px 0; vertical-align: top;">...${partialReportId}</td></tr>
                        ${evidenceCount > 0 ? `<tr><td style="padding: 6px 0; vertical-align: top;"><strong>Evidence:</strong></td><td style="padding: 6px 0; vertical-align: top;">${evidenceCount} file(s)</td></tr>` : ''}
                    </table>
                </div>
                <div style="background: #e8eaf6; padding: 15px; border-left: 4px solid #3f51b5; border-radius: 4px; margin: 20px 0;">
                    <h2 style="color: #3f51b5; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Reporter Information</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                        <tr><td style="padding: 6px 0; width: 130px;"><strong>Name:</strong></td><td style="padding: 6px 0;">${reporterFullName}</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>Username:</strong></td><td style="padding: 6px 0;">${reporterName}</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>Email:</strong></td><td style="padding: 6px 0;">${reporterEmail}</td></tr>
                    </table>
                </div>
                <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffc371;">
                    <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px;">Description:</h3>
                    <p style="color: #856404; margin: 0; line-height: 1.5; white-space: pre-wrap;">${description}</p>
                </div>
                <div style="margin-top: 30px; text-align: center; padding: 15px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 5px;">
                    <p style="color: #991b1b; font-weight: bold; margin: 0 0 10px 0;">This report requires immediate attention!</p>
                    <p style="color: #991b1b; margin: 0;">Please log in to the admin dashboard to investigate and take appropriate action.</p>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">
                This is an automated notification from the Auditorium Management System.<br>
                Please do not reply to this email.
            </div>
        `;

        console.log(`[Email Service] Calling sendEmail for REPORT NOTIFICATION - Report ID: ${reportId}`);
        const info = await sendEmail(adminEmail, emailSubject, htmlContent);
        console.log(`[Email Service] Successfully sent report notification for Report ID: ${reportId}`);

        return info;

    } catch (error) {
        console.error(`[Email Service Error] Failed sending REPORT NOTIFICATION email for report ${reportId} to ${adminEmail}:`, error.message || error);
        return;
    }
};

// --- Make sure all previous email functions are still exported ---
module.exports = {
    sendBookingRequestEmail: exports.sendBookingRequestEmail,
    sendBookingApprovalEmail: exports.sendBookingApprovalEmail,
    sendBookingRejectionEmail: exports.sendBookingRejectionEmail,
    sendBookingRequestNotificationToAdmin: exports.sendBookingRequestNotificationToAdmin,
    sendBookingWithdrawalConfirmationEmail: exports.sendBookingWithdrawalConfirmationEmail,
    sendRescheduleRequestEmail: exports.sendRescheduleRequestEmail,
    sendRescheduleRequestNotificationToAdmin: exports.sendRescheduleRequestNotificationToAdmin,
    sendPendingReminderEmailToAdmin: exports.sendPendingReminderEmailToAdmin,
    sendFeedbackNotificationToAdmin: exports.sendFeedbackNotificationToAdmin, // New function
    sendReportNotificationToAdmin: exports.sendReportNotificationToAdmin, // New function
    sendBookingCancellationEmail: exports.sendBookingCancellationEmail,
    formatDateTimeIST // Export the helper if needed elsewhere
};