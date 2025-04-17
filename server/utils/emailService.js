// server/utils/emailService.js
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { DateTime } = require('luxon'); // For date formatting
require('dotenv').config(); // Ensure environment variables are loaded early

// --- Constants ---
const istTimezone = 'Asia/Kolkata'; // For display formatting
const emailUser = process.env.GMAIL_USER;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;
const redirectUri = 'https://developers.google.com/oauthplayground'; // As configured in Google Cloud Console

// --- Input Validation ---
if (!emailUser || !clientId || !clientSecret || !refreshToken) {
  console.error("[Email FATAL] Missing required environment variables for email service (GMAIL_USER, CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN).");
  // Optionally throw an error to prevent the app from starting without email config
  // throw new Error("Missing required email service environment variables.");
}

// --- OAuth2 Client Setup ---
const Oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
Oauth2Client.setCredentials({ refresh_token: refreshToken });

// --- Helper: Create Nodemailer Transporter ---
/**
 * Creates and configures a Nodemailer transporter using OAuth2.
 * Handles fetching a new access token using the refresh token.
 * @returns {Promise<import("nodemailer").Transporter>} A configured Nodemailer transporter instance.
 * @throws {Error} If transporter creation or authentication fails.
 */
async function createTransporter() {
  try {
    console.log('[Email] Attempting to get new access token...');
    const accessTokenResponse = await Oauth2Client.getAccessToken();
    const accessToken = accessTokenResponse.token;

    if (!accessToken) {
      // This case might indicate a problem with the refresh token or Google API response
      throw new Error("Failed to obtain access token using refresh token. Response did not contain a token.");
    }
    console.log('[Email] Access token obtained successfully.');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: emailUser,
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
        accessToken: accessToken, // Use the newly obtained access token
      },
      // Optional: Connection pooling for potentially better performance/robustness
      pool: true,
      maxConnections: 5,
      maxMessages: 100, // Max messages per connection before recreating
      rateLimit: 10,    // Max 10 messages per second (adjust based on needs/limits)
    });

    // Optional: Verify transporter configuration during setup or periodically
    // try {
    //   await transporter.verify();
    //   console.log("[Email] Transporter verified successfully.");
    // } catch (verifyError) {
    //   console.error("[Email WARN] Transporter verification failed:", verifyError);
    //   // Decide if verification failure should be critical
    // }

    return transporter;

  } catch (error) {
    console.error("[Email FATAL] Error creating or authenticating email transporter:", error.message || error);

    // Provide more specific guidance based on common OAuth errors
    if (error.response?.data?.error === 'invalid_grant') {
      console.error("[Email FATAL] OAUTH ERROR: Invalid grant - Refresh token might be expired, revoked, or invalid.");
      console.error("[Email FATAL] ACTION NEEDED: Re-authenticate via OAuth Playground (or your auth flow) to get a new refresh token and update your .env file.");
    } else if (error.response?.data?.error === 'invalid_client') {
      console.error("[Email FATAL] OAUTH ERROR: Invalid client - Check CLIENT_ID and CLIENT_SECRET in your .env file.");
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      console.error("[Email FATAL] NETWORK ERROR: Could not connect to Google's authentication/SMTP servers. Check network connectivity and firewall rules.");
    } else if (error.message.includes("Failed to obtain access token")) {
       // Logged above, but reiterate potential cause
       console.error("[Email FATAL] Check if refresh token is valid and Google Cloud Project OAuth consent screen is configured correctly.");
    }

    // Rethrow a more specific error to indicate the email service is down
    throw new Error('Failed to initialize email service transporter. Check logs for details.');
  }
}

// --- Helper: Date Formatting ---
/**
 * Consistently formats a JavaScript Date object to a user-friendly string in IST.
 * @param {Date | null | undefined} date - The date object to format.
 * @returns {string} Formatted date string (e.g., "Oct 26, 2023, 9:30 AM") or 'N/A' / 'Invalid Date'.
 */
function formatDateTimeIST(date) {
  if (!date) return 'N/A'; // Handle null or undefined dates gracefully

  try {
    // Ensure the input is a valid Date object before passing to Luxon
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('Input is not a valid Date object');
    }
    // Example format: "Oct 26, 2023, 9:30 AM IST" (or similar based on locale)
    const formatOptions = { ...DateTime.DATETIME_MED_WITH_WEEKDAY, timeZone: istTimezone }; // More descriptive format
    return DateTime.fromJSDate(date)
      .setZone(istTimezone)
      .toLocaleString(formatOptions);
  } catch (e) {
    console.warn(`[Date Format Error] Could not format date value: ${date}. Error: ${e.message}`);
    return 'Invalid Date'; // Return an indicator for problematic dates
  }
}

// Add this function to replace the missing sendEmail from mailer.js
/**
 * Sends an email using the configured transporter
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 * @returns {Promise<object>} Nodemailer info object
 */
async function sendEmail(to, subject, html) {
  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: `"Auditorium Booking System" <${emailUser}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] To: ${to} | Subject: ${subject} | Msg ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[Email Error] Failed to send email:', error.message || error);
    throw error; // Re-throw to handle in calling function
  }
}

// --- Send Booking Request Confirmation Email ---
/**
 * Sends an email confirming that a booking request has been submitted.
 * @param {string} userEmail - The recipient's email address.
 * @param {object} booking - The populated Booking document.
 * @param {object} auditorium - The populated Auditorium document.
 * @param {object} department - The populated Department document.
 * @returns {Promise<object | void>} Nodemailer info object on success, or void on failure.
 */
exports.sendBookingRequestEmail = async (userEmail, booking, auditorium, department) => {
    try {
        const partialBookingId = booking._id.toString().slice(-6);
        const startTimeIST = DateTime.fromJSDate(booking.startTime)
            .setZone(istTimezone)
            .toFormat("EEE, dd MMM, yyyy, h:mm a");
        
        const endTimeIST = DateTime.fromJSDate(booking.endTime)
            .setZone(istTimezone)
            .toFormat("EEE, dd MMM, yyyy, h:mm a");

        const status = 'PENDING';
        
        const mailOptions = {
            from: `"Auditorium Management" <${emailUser}>`,
            to: userEmail,
            subject: `📝 Auditorium Booking Request Received`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <p>Dear ${booking.user.username || 'Valued User'},</p>
                    
                    <p>Your request to book an auditorium has been received and is currently under review.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0;">
                        <h3 style="color: #444; margin-top: 0;">Event Details</h3>
                        <ul style="list-style: none; padding-left: 0;">
                            <li><strong>Event:</strong> ${booking.eventName}</li>
                            <li><strong>Venue:</strong> ${auditorium.name}</li>
                            <li><strong>Department:</strong> ${department.name}</li>
                            <li><strong>Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</li>
                        </ul>
                    </div>

                    <p>Our administrative team will review your request and notify you of their decision shortly. Please note that all bookings are subject to availability and approval.</p>

                    <p>For any queries regarding your booking request, please contact the administration office.</p>

                    <p style="margin-top: 30px;">Best regards,<br>Auditorium Management Team</p>
                </div>
            `
        };

        const info = await sendEmail(userEmail, mailOptions.subject, mailOptions.html);
        console.log(`[Email Sent] Booking request confirmation to: ${userEmail} | Booking ID: ${booking._id}`);
        return info;

    } catch (error) {
        console.error(`[Email Error] Failed to send booking request email to ${userEmail}:`, error);
        // Don't throw - we don't want email failures to break the booking process
    }
};

// --- Send Booking Approval Email ---
/**
 * Sends an email notifying the user their booking request has been approved.
 * @param {string} userEmail - The recipient's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @returns {Promise<object | void>} Nodemailer info object on success, or void on failure.
 */
exports.sendBookingApprovalEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
  try {
    // --- Input Validation ---
    if (!userEmail) throw new Error('Recipient email is missing for approval email.');
    if (!bookingDetails?._id) throw new Error('Booking details (with _id) missing for approval email.');
    if (!auditoriumDetails?.name) throw new Error('Auditorium details (with name) missing for approval email.');
    if (!departmentDetails?.name) throw new Error('Department details (with name) missing for approval email.');

    const transporter = await createTransporter();
    const partialBookingId = bookingDetails._id.toString().slice(-6);

    // --- Prepare Email Content ---
    const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
    const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
    const auditoriumName = auditoriumDetails.name || 'N/A';
    const auditoriumLocation = auditoriumDetails.location || 'N/A';
    const departmentName = departmentDetails.name || 'N/A';
    const eventName = bookingDetails.eventName || 'N/A';
    const status = 'APPROVED'; // Explicitly set for clarity

    const mailOptions = {
      subject: `✅ Auditorium Booking Approved`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <p>Dear ${bookingDetails.user?.username || 'Valued User'},</p>
            
            <p>We are pleased to inform you that your auditorium booking request has been <strong style="color: #28a745;">approved</strong>.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0;">
                <h3 style="color: #444; margin-top: 0;">Event Details</h3>
                <ul style="list-style: none; padding-left: 0;">
                    <li><strong>Event:</strong> ${eventName}</li>
                    <li><strong>Venue:</strong> ${auditoriumName} (${auditoriumLocation})</li>
                    <li><strong>Department:</strong> ${departmentName}</li>
                    <li><strong>Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</li>
                </ul>
            </div>

            <p>Please ensure to:</p>
            <ul>
                <li>Arrive at least 15 minutes before your scheduled time</li>
                <li>Follow all auditorium usage guidelines</li>
                <li>Contact administration for any technical requirements</li>
            </ul>

            <p style="margin-top: 30px;">Best regards,<br>Auditorium Management Team</p>
        </div>
      `
    };

    // --- Send Email ---
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Booking approval notification to: ${userEmail} | Booking ID: ${bookingDetails._id} | Msg ID: ${info.messageId}`);
    return info;

  } catch (error) {
    console.error(`[Email Error] Failed sending booking approval email to ${userEmail} for booking ${bookingDetails?._id}:`, error.message || error);
    // return; // Indicate failure without throwing
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
 * @returns {Promise<object | void>} Nodemailer info object on success, or void on failure.
 */
exports.sendBookingRejectionEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails, rejectionReason) => {
  try {
    // --- Input Validation ---
    if (!userEmail) throw new Error('Recipient email is missing for rejection email.');
    if (!bookingDetails?._id) throw new Error('Booking details (with _id) missing for rejection email.');
    if (!auditoriumDetails?.name) throw new Error('Auditorium details (with name) missing for rejection email.');
    if (!departmentDetails?.name) throw new Error('Department details (with name) missing for rejection email.');
    if (!rejectionReason || !rejectionReason.trim()) throw new Error('Rejection reason is missing or empty for rejection email.');

    const transporter = await createTransporter();
    const partialBookingId = bookingDetails._id.toString().slice(-6);

    // --- Prepare Email Content ---
    const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
    const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
    const auditoriumName = auditoriumDetails.name || 'N/A';
    const departmentName = departmentDetails.name || 'N/A';
    const eventName = bookingDetails.eventName || 'N/A';
    const status = 'REJECTED';
    const reason = rejectionReason.trim(); // Ensure trimmed reason

    const mailOptions = {
      subject: `Auditorium Booking Request Update`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <p>Dear ${bookingDetails.user?.username || 'Valued User'},</p>
            
            <p>We regret to inform you that we are unable to accommodate your auditorium booking request at this time.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0;">
                <h3 style="color: #444; margin-top: 0;">Event Details</h3>
                <ul style="list-style: none; padding-left: 0;">
                    <li><strong>Event:</strong> ${eventName}</li>
                    <li><strong>Venue:</strong> ${auditoriumName}</li>
                    <li><strong>Department:</strong> ${departmentName}</li>
                    <li><strong>Requested Date & Time:</strong> ${startTimeIST} - ${endTimeIST}</li>
                </ul>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="color: #856404; margin: 0;"><strong>Reason:</strong> ${reason}</p>
            </div>

            <p>You are welcome to submit a new booking request for an alternative date or time. If you have any questions, please don't hesitate to contact the administration office.</p>

            <p style="margin-top: 30px;">Best regards,<br>Auditorium Management Team</p>
        </div>
      `
    };

    // --- Send Email ---
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Booking rejection notification to: ${userEmail} | Booking ID: ${bookingDetails._id} | Msg ID: ${info.messageId}`);
    return info;

  } catch (error) {
    console.error(`[Email Error] Failed sending booking rejection email to ${userEmail} for booking ${bookingDetails?._id}:`, error.message || error);
    // return; // Indicate failure without throwing
  }
};

// --- Send Booking Request Notification to Admin ---
/**
 * Sends an email notifying the admin about a new booking request.
 * @param {string} adminEmail - The admin's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @returns {Promise<object | void>} Nodemailer info object on success, or void on failure.
 */
exports.sendBookingRequestNotificationToAdmin = async (adminEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
  try {
    // --- Input Validation ---
    if (!adminEmail) throw new Error('Admin email is missing');
    if (!bookingDetails?._id) throw new Error('Booking details missing');
    if (!auditoriumDetails?.name) throw new Error('Auditorium details missing');
    if (!departmentDetails?.name) throw new Error('Department details missing');

    const transporter = await createTransporter();
    const partialBookingId = bookingDetails._id.toString().slice(-6);

    // --- Prepare Email Content ---
    const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
    const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
    const auditoriumName = auditoriumDetails.name;
    const departmentName = departmentDetails.name;
    const eventName = bookingDetails.eventName;
    const userEmail = bookingDetails.user?.email || 'N/A';
    const userName = bookingDetails.user?.username || 'N/A';

    const mailOptions = {
      from: `"Auditorium Management System" <${emailUser}>`,
      to: adminEmail,
      subject: `🔔 New Booking Request: ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 24px;">New Booking Request</h1>
            <p style="color: #666; margin-top: 5px;">A new auditorium booking request requires your review</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0;">
            <h2 style="color: #444; margin-top: 0; font-size: 18px;">Event Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; width: 140px;"><strong>Event Name:</strong></td>
                <td style="padding: 8px 0;">${eventName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Description:</strong></td>
                <td style="padding: 8px 0;">${bookingDetails.description || 'No description provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Venue:</strong></td>
                <td style="padding: 8px 0;">${auditoriumName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Department:</strong></td>
                <td style="padding: 8px 0;">${departmentName}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 15px 0;">
            <h2 style="color: #444; margin-top: 0; font-size: 18px;">Schedule</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; width: 140px;"><strong>Start Time:</strong></td>
                <td style="padding: 8px 0;">${startTimeIST}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>End Time:</strong></td>
                <td style="padding: 8px 0;">${endTimeIST}</td>
              </tr>
            </table>
          </div>

          <div style="background: #e8eaf6; padding: 20px; border-radius: 5px; margin: 15px 0;">
            <h2 style="color: #444; margin-top: 0; font-size: 18px;">Requester Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; width: 140px;"><strong>Name:</strong></td>
                <td style="padding: 8px 0;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Email:</strong></td>
                <td style="padding: 8px 0;">${userEmail}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666;">Please login to the admin dashboard to review this request.</p>
            <p style="margin-top: 20px; font-size: 14px; color: #888;">
              This is an automated message from the Auditorium Management System.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Booking request notification to admin: ${adminEmail} | Booking ID: ${bookingDetails._id} | Msg ID: ${info.messageId}`);
    return info;

  } catch (error) {
    console.error(`[Email Error] Failed sending booking request notification to admin ${adminEmail} for booking ${bookingDetails?._id}:`, error.message || error);
    // return; // Indicate failure without throwing
  }
};
