// server/utils/emailService.js
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { DateTime } = require('luxon'); // For date formatting
require('dotenv').config(); // Ensure environment variables are loaded early

// --- Constants ---
const istTimezone = 'Asia/Kolkata'; // For display formatting
const emailUser = process.env.GMAIL_USER; // Your sending Gmail address
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;
const redirectUri = 'https://developers.google.com/oauthplayground'; // As configured in Google Cloud Console

// --- Input Validation: Check for essential config on startup ---
if (!emailUser || !clientId || !clientSecret || !refreshToken) {
  console.error("[Email FATAL] Missing required environment variables for email service (GMAIL_USER, CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN). Email sending will likely fail.");
  // Decide if you want to crash or just log and disable emailing.
  // For production, you might want to crash or have a robust fallback.
  // For now, we just log a critical error.
} else {
    console.log("[Email Service] Configuration loaded. Attempting to initialize transporter.");
}

// --- OAuth2 Client Setup ---
const Oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
Oauth2Client.setCredentials({ refresh_token: refreshToken });

// --- Helper: Create Nodemailer Transporter ---
// Use a cached instance to avoid creating a new transporter for every email
let transporterInstance = null;

/**
 * Creates or returns a cached Nodemailer transporter instance using OAuth2.
 * Handles fetching a new access token using the refresh token.
 * @returns {Promise<import("nodemailer").Transporter>} A configured Nodemailer transporter instance.
 * @throws {Error} If transporter creation or authentication fails.
 */
async function createTransporter() {
    if (transporterInstance) {
        // Optional: Add logic here to check if the cached transporter is still active/valid
        // For simplicity, we'll just return the cached one.
        // console.log('[Email] Using cached transporter instance.');
        return transporterInstance;
    }

    // If no cached instance, create a new one
    try {
        console.log('[Email] Attempting to get new access token for transporter...');
        const accessTokenResponse = await Oauth2Client.getAccessToken();
        const accessToken = accessTokenResponse.token;

        if (!accessToken) {
            // This might happen if the refresh token is invalid or revoked
            throw new Error("Failed to obtain access token using refresh token. Google API response did not contain a token.");
        }
        console.log('[Email] Access token obtained successfully.');

        const transporter = nodemailer.createTransport({
            service: 'gmail', // Or 'smtp' with specific host/port/secure settings
            auth: {
                type: 'OAuth2',
                user: emailUser,
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
                accessToken: accessToken, // Use the newly obtained access token
            },
             // Add pooling for better performance under load
            pool: true,
            maxConnections: 5, // Limit concurrent connections
            maxMessages: Infinity, // Allow many messages per connection
            rateLimit: 10, // Limit emails per second to avoid hitting provider limits
            logger: false, // Set to true to log SMTP traffic (useful for debugging connection)
            debug: false   // Set to true for more verbose debug output
        });

        // Store the created transporter instance
        transporterInstance = transporter;
        console.log("[Email Service] Transporter created and cached.");

         // Optional: Verify transporter configuration during setup
         try {
           await transporter.verify();
           console.log("[Email Service] Transporter verified successfully.");
         } catch (verifyError) {
           console.warn("[Email Service WARN] Transporter verification failed (this might be temporary):", verifyError.message || verifyError);
         }


        return transporter;

    } catch (error) {
        console.error("[Email Service FATAL] Error creating or authenticating email transporter:", error.message || error);

        // Provide more specific guidance based on common OAuth/SMTP errors
        if (error.response?.data?.error === 'invalid_grant') {
          console.error("[Email Service FATAL] OAUTH ERROR: Invalid grant - Refresh token might be expired, revoked, or invalid.");
          console.error("[Email Service FATAL] ACTION NEEDED: Re-authenticate your application with Google to get a new refresh token.");
        } else if (error.response?.data?.error === 'invalid_client') {
          console.error("[Email Service FATAL] OAUTH ERROR: Invalid client - Check CLIENT_ID and CLIENT_SECRET in your .env file.");
        } else if (error.code === 'EENVELOPE' || error.code === 'EAUTH' || error.message.includes('auth failed')) {
             console.error("[Email Service FATAL] SMTP AUTH ERROR: Authentication failed. Check your OAuth credentials or Gmail settings (e.g., 'Less secure app access' if not using OAuth, but OAuth is preferred).");
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
          console.error("[Email Service FATAL] NETWORK ERROR: Could not connect to Google's authentication/SMTP servers. Check network connectivity, firewall rules, or DNS settings.");
        }

        // Clear cached instance on failure so a new one is attempted next time
        transporterInstance = null;

        // Re-throw the error to indicate that the email service cannot be initialized
        throw new Error('Failed to initialize email service transporter. Check logs for details.');
    }
}

// --- Helper: Date Formatting ---
/**
 * Consistently formats a JavaScript Date object (expected UTC from DB) to a user-friendly string in IST.
 * @param {Date | null | undefined} date - The date object to format.
 * @returns {string} Formatted date string (e.g., "Fri, Oct 27, 2023, 9:30 AM IST") or 'N/A' / 'Invalid Date'.
 */
function formatDateTimeIST(date) {
  if (!date) return 'N/A'; // Handle null or undefined gracefully

  try {
    // Ensure the input is a valid Date object before passing to Luxon
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('Input is not a valid Date object');
    }
    // Assume input date is UTC from MongoDB, then set zone to IST for formatting
    // Use DATETIME_MED_WITH_WEEKDAY and add timeZoneName for clarity
    const formatOptions = { ...DateTime.DATETIME_MED_WITH_WEEKDAY, timeZoneName: 'shortOffset' }; // e.g., "Fri, Oct 27, 2023, 9:30 AM IST"
    return DateTime.fromJSDate(date, { zone: 'utc' }) // Interpret the JS Date as UTC
      .setZone(istTimezone) // Convert it to the IST timezone
      .toLocaleString(formatOptions); // Format it
  } catch (e) {
    console.warn(`[Email Service Date Format Error] Could not format date value: ${date}. Error: ${e.message}`);
    return 'Invalid Date'; // Return an indicator for problematic dates
  }
}

// --- Core Email Sending Helper ---
/**
 * Sends an email using the configured transporter. This is the internal function.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML content of the email.
 * @returns {Promise<object>} Nodemailer info object on success.
 * @throws {Error} If email sending fails (e.g., network, auth, recipient issues).
 */
async function sendEmail(to, subject, html) {
  // Basic check before attempting to create transporter or send
  if (!to || !subject || !html) {
      const missing = [];
      if (!to) missing.push('to');
      if (!subject) missing.push('subject');
      if (!html) missing.push('html');
      console.error(`[Email Service Error] sendEmail called with missing parameters: ${missing.join(', ')}`);
      throw new Error(`Missing required parameters for sending email: ${missing.join(', ')}`);
  }

  try {
    const transporter = await createTransporter(); // Get the transporter (cached or new)
    const mailOptions = {
      from: `"Auditorium Management System" <${emailUser}>`, // Sender display name and email
      to: to, // Use the 'to' parameter passed to this function
      subject: subject, // Use the 'subject' parameter passed to this function
      html: html, // Use the 'html' parameter passed to this function
       // Add optional reply-to, cc, bcc here if needed
    };

    console.log(`[Email Service] Preparing to send email to ${to} with subject: "${subject}"...`);
    const info = await transporter.sendMail(mailOptions);

    console.log(`[Email Service Sent] Successfully sent email to: ${to} | Subject: ${subject} | Message ID: ${info.messageId}`);
     // info.response often contains the SMTP response (e.g., "250 2.1.5 OK ...")
     // info.envelope contains sender and recipient details
     // info.messageId contains the message-id header
    return info; // Resolve the promise with the info object

  } catch (error) {
    console.error(`[Email Service Error] Failed to send email to ${to} with subject "${subject}":`, error.message || error);
    // Log specific details if available from Nodemailer/SMTP errors
    if (error.response) {
         console.error('[Email Service Error] SMTP Response:', error.response);
    }
    // Re-throw the error so the calling function can catch it and log appropriately
    throw error;
  }
}

// ==================================================
//             EXPORTED EMAIL FUNCTIONS
// ==================================================

// --- Send Booking Request Confirmation Email ---
/**
 * Sends an email confirming that a booking request has been submitted.
 * @param {string} userEmail - The recipient's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendBookingRequestEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
    try {
        // --- Input Validation (Basic checks) ---
        if (!userEmail) throw new Error('Recipient email is missing for request confirmation email.');
        if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details provided for request confirmation email.');
        if (!auditoriumDetails?.name) throw new Error('Auditorium details missing for request confirmation email.');
        if (!departmentDetails?.name) throw new Error('Department details missing for request confirmation email.');
         if (!bookingDetails.user?.username) console.warn(`[Email Service WARN] Username missing for booking ${bookingDetails._id} in request confirmation email.`); // Non-critical warning


        // --- Prepare Email Content ---
        const partialBookingId = bookingDetails._id.toString().slice(-6);
        const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
        const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
        const auditoriumName = auditoriumDetails.name || 'N/A';
        const departmentName = departmentDetails.name || 'N/A';
        const eventName = bookingDetails.eventName || 'N/A';
        const userName = bookingDetails.user?.username || 'Valued User'; // Use default if username is missing


        const emailSubject = `📝 Auditorium Booking Request Received: ${eventName}`; // Clearer subject

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Booking Request Received</h2>

                <p>Dear ${userName},</p>

                <p>Your request to book an auditorium has been received and is currently under review by the administration team.</p>

                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; border-radius: 4px; margin: 20px 0;">
                    <h3 style="color: #007bff; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Event Details</h3>
                    <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
                    <p style="margin: 5px 0;"><strong>Venue:</strong> ${auditoriumName}</p>
                    <p style="margin: 5px 0;"><strong>Department:</strong> ${departmentName}</p>
                    <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</p>
                    <p style="margin: 5px 0;"><strong>Request ID (partial):</strong> ${partialBookingId}</p>
                </div>

                 <p>You will receive another email once your request has been approved or rejected.</p>

                <p style="margin-top: 25px; font-size: 0.9em; color: #555;">
                    If you have any questions, please contact the administration office.
                </p>

                <p style="margin-top: 30px; font-size: 0.9em; color: #777;">Best regards,<br>Auditorium Management Team</p>
            </div>
             <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">
                This is an automated message, please do not reply.
            </div>
        `;

        // --- Send Email using the helper ---
        const info = await sendEmail(userEmail, emailSubject, htmlContent);

        // The sendEmail helper already logs success/failure, no need to duplicate here.
        return info; // Return info object on success

    } catch (error) {
        console.error(`[Email Service Error] Failed sending booking request email for booking ${bookingDetails?._id} to ${userEmail}:`, error.message || error);
        // Log the error but do not re-throw, as this email is non-critical to the booking creation process.
        return; // Indicate failure to the caller
    }
};

// --- Send Booking Approval Email ---
/**
 * Sends an email notifying the user their booking request has been approved.
 * @param {string} userEmail - The recipient's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendBookingApprovalEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
  try {
    // --- Input Validation ---
    if (!userEmail) throw new Error('Recipient email is missing for approval email.');
    if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details provided for approval email.');
    if (!auditoriumDetails?.name || !auditoriumDetails.location) throw new Error('Auditorium details (name or location) missing for approval email.');
    if (!departmentDetails?.name) throw new Error('Department details (with name) missing for approval email.');
    if (!bookingDetails.user?.username) console.warn(`[Email Service WARN] Username missing for booking ${bookingDetails._id} in approval email.`);


    // --- Prepare Email Content ---
    const partialBookingId = bookingDetails._id.toString().slice(-6);
    const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
    const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
    const auditoriumName = auditoriumDetails.name || 'N/A';
    const auditoriumLocation = auditoriumDetails.location || 'N/A';
    const departmentName = departmentDetails.name || 'N/A';
    const eventName = bookingDetails.eventName || 'N/A';
    const userName = bookingDetails.user?.username || 'Valued User';


    const emailSubject = `✅ Auditorium Booking Approved: ${eventName}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
             <h2 style="color: #28a745; text-align: center; margin-bottom: 20px;">Booking Approved!</h2>

            <p>Dear ${userName},</p>

            <p>We are pleased to inform you that your auditorium booking request has been <strong style="color: #28a745;">approved</strong>.</p>

            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; border-radius: 4px; margin: 20px 0;">
                <h3 style="color: #28a745; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Event Details</h3>
                <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
                <p style="margin: 5px 0;"><strong>Venue:</strong> ${auditoriumName} (${auditoriumLocation})</p>
                <p style="margin: 5px 0;"><strong>Department:</strong> ${departmentName}</p>
                <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</p>
                <p style="margin: 5px 0;"><strong>Booking ID (partial):</strong> ${partialBookingId}</p>
            </div>

            <p>Please ensure to follow all guidelines for using the auditorium.</p>

            <p style="margin-top: 25px; font-size: 0.9em; color: #555;">
                 For any questions or specific requirements, please contact the administration office.
            </p>

            <p style="margin-top: 30px; font-size: 0.9em; color: #777;">Best regards,<br>Auditorium Management Team</p>
        </div>
         <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">
            This is an automated message, please do not reply.
        </div>
      `;

    // --- Send Email ---
    const info = await sendEmail(userEmail, emailSubject, htmlContent);

    return info; // Return info object on success

  } catch (error) {
    console.error(`[Email Service Error] Failed sending booking approval email for booking ${bookingDetails?._id} to ${userEmail}:`, error.message || error);
    return; // Indicate failure
  }
};

// --- Send Booking Rejection Email ---
/**
 * Sends an email notifying the user their booking request has been rejected.
 * @param {string} userEmail - The recipient's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @param {string} rejectionReason - The reason provided for rejection.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendBookingRejectionEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails, rejectionReason) => {
  try {
    // --- Input Validation ---
    if (!userEmail) throw new Error('Recipient email is missing for rejection email.');
    if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details provided for rejection email.');
    if (!auditoriumDetails?.name) throw new Error('Auditorium details (with name) missing for rejection email.');
    if (!departmentDetails?.name) throw new Error('Department details (with name) missing for rejection email.');
    if (!rejectionReason || !rejectionReason.trim()) throw new Error('Rejection reason is missing or empty for rejection email.');
     if (!bookingDetails.user?.username) console.warn(`[Email Service WARN] Username missing for booking ${bookingDetails._id} in rejection email.`);


    // --- Prepare Email Content ---
    const partialBookingId = bookingDetails._id.toString().slice(-6);
    const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
    const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
    const auditoriumName = auditoriumDetails.name || 'N/A';
    const departmentName = departmentDetails.name || 'N/A';
    const eventName = bookingDetails.eventName || 'N/A';
    const userName = bookingDetails.user?.username || 'Valued User';
    const reason = rejectionReason.trim(); // Ensure trimmed reason


    const emailSubject = `Auditorium Booking Request Update: ${eventName}`; // Clearer subject

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #dc3545; text-align: center; margin-bottom: 20px;">Booking Request Rejected</h2>

            <p>Dear ${userName},</p>

            <p>We regret to inform you that we are unable to accommodate your auditorium booking request at this time.</p>

            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; border-radius: 4px; margin: 20px 0;">
                <h3 style="color: #dc3545; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Event Details</h3>
                <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
                <p style="margin: 5px 0;"><strong>Venue:</strong> ${auditoriumName}</p>
                <p style="margin: 5px 0;"><strong>Department:</strong> ${departmentName}</p>
                <p style="margin: 5px 0;"><strong>Requested Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</p>
                <p style="margin: 5px 0;"><strong>Request ID (partial):</strong> ${partialBookingId}</p>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffc371;">
                <p style="color: #856404; margin: 0; font-size: 1.1em;"><strong>Reason for Rejection:</strong></p>
                <p style="color: #856404; margin: 10px 0 0 0;">${reason}</p>
            </div>

            <p style="margin-top: 25px; font-size: 0.9em; color: #555;">
                You are welcome to submit a new booking request for an alternative date or time. If you have any questions, please don't hesitate to contact the administration office.
            </p>


            <p style="margin-top: 30px; font-size: 0.9em; color: #777;">Best regards,<br>Auditorium Management Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">
            This is an automated message, please do not reply.
        </div>
      `;

    // --- Send Email ---
    const info = await sendEmail(userEmail, emailSubject, htmlContent);

    return info; // Return info object on success

  } catch (error) {
    console.error(`[Email Service Error] Failed sending booking rejection email for booking ${bookingDetails?._id} to ${userEmail}:`, error.message || error);
    return; // Indicate failure
  }
};

// --- Send Booking Request Notification to Admin ---
/**
 * Sends an email notifying the admin about a new booking request.
 * @param {string} adminEmail - The admin's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendBookingRequestNotificationToAdmin = async (adminEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
  try {
    // --- Input Validation ---
    if (!adminEmail) throw new Error('Admin email is missing for admin notification.');
    if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) throw new Error('Incomplete booking details provided for admin notification.');
    if (!auditoriumDetails?.name) throw new Error('Auditorium details missing for admin notification.');
    if (!departmentDetails?.name) throw new Error('Department details missing for admin notification.');
     if (!bookingDetails.user?.email || !bookingDetails.user?.username) console.warn(`[Email Service WARN] User email or username missing for booking ${bookingDetails._id} in admin notification.`);


    // --- Prepare Email Content ---
    const partialBookingId = bookingDetails._id.toString().slice(-6);
    const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
    const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
    const auditoriumName = auditoriumDetails.name || 'N/A';
    const departmentName = departmentDetails.name || 'N/A';
    const eventName = bookingDetails.eventName || 'N/A';
    const userEmail = bookingDetails.user?.email || 'N/A';
    const userName = bookingDetails.user?.username || 'N/A';
    const description = bookingDetails.description || 'No description provided';


    const emailSubject = `🔔 New Booking Request: ${eventName} - ${auditoriumName}`; // Include auditorium in subject for quick scan

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 24px;">New Booking Request</h1>
            <p style="color: #666; margin-top: 5px;">A new auditorium booking request is pending your approval</p>
          </div>

          <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #dc2626; border-radius: 4px; margin: 20px 0;">
            <h2 style="color: #dc2626; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Event Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; width: 130px; vertical-align: top;"><strong>Event Name:</strong></td>
                <td style="padding: 6px 0; vertical-align: top;">${eventName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; vertical-align: top;"><strong>Description:</strong></td>
                <td style="padding: 6px 0; vertical-align: top;">${description}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; vertical-align: top;"><strong>Venue:</strong></td>
                <td style="padding: 6px 0; vertical-align: top;">${auditoriumName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; vertical-align: top;"><strong>Department:</strong></td>
                <td style="padding: 6px 0; vertical-align: top;">${departmentName}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffc371;">
            <h2 style="color: #856404; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Schedule</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; width: 130px;"><strong>Start Time:</strong></td>
                <td style="padding: 6px 0;">${startTimeIST}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0;"><strong>End Time:</strong></td>
                <td style="padding: 6px 0;">${endTimeIST}</td>
              </tr>
            </table>
          </div>

          <div style="background: #e8eaf6; padding: 15px; border-left: 4px solid #3f51b5; border-radius: 4px; margin: 20px 0;">
            <h2 style="color: #3f51b5; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Requester Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; width: 130px;"><strong>Name:</strong></td>
                <td style="padding: 6px 0;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0;"><strong>Email:</strong></td>
                <td style="padding: 6px 0;">${userEmail}</td>
              </tr>
               <tr>
                <td style="padding: 6px 0;"><strong>Request ID (partial):</strong></td>
                <td style="padding: 6px 0;">${partialBookingId}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666;">Please log in to the admin dashboard to review and act on this request.</p>
             <!-- You could add a direct link here if your frontend has one -->
             <!-- <a href="YOUR_ADMIN_DASHBOARD_BOOKING_URL/${bookingDetails._id}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Request</a> -->
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">
            This is an automated message from the Auditorium Management System.<br>
            Please do not reply to this email.
        </div>
      `;

    // --- Send Email ---
    const info = await sendEmail(adminEmail, emailSubject, htmlContent);

    return info; // Return info object on success

  } catch (error) {
    console.error(`[Email Service Error] Failed sending admin notification email for booking ${bookingDetails?._id} to ${adminEmail}:`, error.message || error);
     return; // Indicate failure
  }
};

// --- Send Booking Withdrawal Confirmation Email ---
/**
 * Sends an email confirming that a booking request has been withdrawn.
 * @param {string} userEmail - The recipient's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendBookingWithdrawalConfirmationEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
    try {
        // Input validation
        if (!userEmail) throw new Error('Recipient email is missing for withdrawal confirmation email.');
        if (!bookingDetails?._id || !bookingDetails.eventName || !bookingDetails.startTime || !bookingDetails.endTime) {
            throw new Error('Incomplete booking details provided for withdrawal confirmation email.');
        }
        if (!auditoriumDetails?.name) throw new Error('Auditorium details missing for withdrawal confirmation email.');
        if (!departmentDetails?.name) throw new Error('Department details missing for withdrawal confirmation email.');

        // Prepare email content
        const partialBookingId = bookingDetails._id.toString().slice(-6);
        const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
        const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
        const auditoriumName = auditoriumDetails.name || 'N/A';
        const departmentName = departmentDetails.name || 'N/A';
        const eventName = bookingDetails.eventName || 'N/A';
        const userName = bookingDetails.user?.username || 'Valued User';

        const emailSubject = `Booking Withdrawal Confirmation: ${eventName}`;

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #dc3545; text-align: center; margin-bottom: 20px;">Booking Withdrawal Confirmation</h2>

            <p>Dear ${userName},</p>

            <p>This email confirms that you have successfully withdrawn your booking request for:</p>

            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; border-radius: 4px; margin: 20px 0;">
                <h3 style="color: #dc3545; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Event Details</h3>
                <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
                <p style="margin: 5px 0;"><strong>Venue:</strong> ${auditoriumName}</p>
                <p style="margin: 5px 0;"><strong>Department:</strong> ${departmentName}</p>
                <p style="margin: 5px 0;"><strong>Scheduled Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</p>
                <p style="margin: 5px 0;"><strong>Booking ID (partial):</strong> ${partialBookingId}</p>
            </div>

            <p>The time slot is now available for other bookings. If you wish to book another time slot, please submit a new booking request.</p>

            <p style="margin-top: 25px; font-size: 0.9em; color: #555;">
                If you did not initiate this withdrawal, please contact the administration office immediately.
            </p>

            <p style="margin-top: 30px; font-size: 0.9em; color: #777;">Best regards,<br>Auditorium Management Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">
            This is an automated message, please do not reply.
        </div>`;

        // Send email
        const info = await sendEmail(userEmail, emailSubject, htmlContent);
        return info;

    } catch (error) {
        console.error(`[Email Service Error] Failed sending withdrawal confirmation email for booking ${bookingDetails?._id} to ${userEmail}:`, error.message || error);
        return;
    }
};

// --- Send Reschedule Request Email ---
/**
 * Sends an email notifying the user about their reschedule request.
 * @param {string} userEmail - The recipient's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @param {object} oldTimes - The previous schedule times.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendRescheduleRequestEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails, oldTimes) => {
    try {
        const partialBookingId = bookingDetails._id.toString().slice(-6);
        const oldStartTimeIST = formatDateTimeIST(oldTimes.startTime);
        const oldEndTimeIST = formatDateTimeIST(oldTimes.endTime);
        const newStartTimeIST = formatDateTimeIST(bookingDetails.startTime);
        const newEndTimeIST = formatDateTimeIST(bookingDetails.endTime);
        const userName = bookingDetails.user?.username || 'User';

        const emailSubject = `Booking Reschedule Request: ${bookingDetails.eventName}`;
        
        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #f59e0b; text-align: center; margin-bottom: 20px;">Booking Reschedule Request</h2>
            
            <p>Dear ${userName},</p>
            
            <p>Your request to reschedule your booking has been submitted and is pending approval.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;">
                <h3 style="color: #f59e0b; margin-top: 0; margin-bottom: 10px;">Event Details</h3>
                <p><strong>Event:</strong> ${bookingDetails.eventName}</p>
                <p><strong>Venue:</strong> ${auditoriumDetails?.name || 'N/A'}</p>
                <p><strong>Department:</strong> ${departmentDetails?.name || 'N/A'}</p>
                <p><strong>Booking ID:</strong> ${partialBookingId}</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px;">Schedule Change</h3>
                <p><strong>Previous Schedule:</strong><br>${oldStartTimeIST} - ${oldEndTimeIST}</p>
                <p style="margin-top: 10px;"><strong>Requested New Schedule:</strong><br>${newStartTimeIST} - ${newEndTimeIST}</p>
            </div>
            
            <p>Your booking status has been set to "pending" while we review this change. You will receive another email once the reschedule request is approved or rejected.</p>
            
            <p style="margin-top: 25px; color: #666;">If you have any questions, please contact the administration office.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 0.8em; color: #aaa;">
            This is an automated message, please do not reply.
        </div>`;

        const info = await sendEmail(userEmail, emailSubject, htmlContent);
        return info;
    } catch (error) {
        console.error(`[Email Service Error] Failed sending reschedule email:`, error);
        return;
    }
};

// --- Send Reschedule Request Notification to Admin ---
/**
 * Sends an email notifying the admin about a new reschedule request.
 * @param {string} adminEmail - The admin's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @param {object} oldTimes - The previous schedule times.
 * @returns {Promise<object | void>} Resolves with Nodemailer info object on success, or void on failure.
 */
exports.sendRescheduleRequestNotificationToAdmin = async (adminEmail, bookingDetails, auditoriumDetails, departmentDetails, oldTimes) => {
    try {
        // Input validation
        if (!adminEmail) throw new Error('Admin email missing for reschedule notification');
        
        // Prepare email content
        const partialBookingId = bookingDetails._id.toString().slice(-6);
        const oldStartTimeIST = formatDateTimeIST(oldTimes.startTime);
        const oldEndTimeIST = formatDateTimeIST(oldTimes.endTime);
        const newStartTimeIST = formatDateTimeIST(bookingDetails.startTime);
        const newEndTimeIST = formatDateTimeIST(bookingDetails.endTime);
        const userName = bookingDetails.user?.username || 'N/A';
        const userEmail = bookingDetails.user?.email || 'N/A';

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #f59e0b; text-align: center; margin-bottom: 20px;">New Reschedule Request</h2>
            
            <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;">
                <h3 style="color: #f59e0b; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Event Details</h3>
                <p><strong>Event:</strong> ${bookingDetails.eventName}</p>
                <p><strong>Venue:</strong> ${auditoriumDetails?.name}</p>
                <p><strong>Department:</strong> ${departmentDetails?.name}</p>
                <p><strong>Requester:</strong> ${userName} (${userEmail})</p>
                <p><strong>Booking ID:</strong> ${partialBookingId}</p>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">Schedule Change</h3>
                <p><strong>Current Schedule:</strong><br/>${oldStartTimeIST} - ${oldEndTimeIST}</p>
                <p style="margin-top: 10px;"><strong>Requested New Schedule:</strong><br/>${newStartTimeIST} - ${newEndTimeIST}</p>
            </div>

            <p style="text-align: center; color: #666;">Please review this request in the admin dashboard.</p>
        </div>`;

        const emailSubject = `🔄 Reschedule Request: ${bookingDetails.eventName}`;
        const info = await sendEmail(adminEmail, emailSubject, htmlContent);
        return info;
    } catch (error) {
        console.error(`[Email Service Error] Failed sending admin reschedule notification:`, error);
        return;
    }
};