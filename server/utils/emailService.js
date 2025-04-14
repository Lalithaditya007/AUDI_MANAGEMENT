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


// --- Send Booking Request Confirmation Email ---
/**
 * Sends an email confirming that a booking request has been submitted.
 * @param {string} userEmail - The recipient's email address.
 * @param {object} bookingDetails - The populated Booking document.
 * @param {object} auditoriumDetails - The populated Auditorium document.
 * @param {object} departmentDetails - The populated Department document.
 * @returns {Promise<object | void>} Nodemailer info object on success, or void on failure.
 */
exports.sendBookingRequestEmail = async (userEmail, bookingDetails, auditoriumDetails, departmentDetails) => {
  try {
    // --- Input Validation ---
    if (!userEmail) throw new Error('Recipient email is missing for request email.');
    if (!bookingDetails?._id) throw new Error('Booking details (with _id) missing for request email.');
    if (!auditoriumDetails?.name) throw new Error('Auditorium details (with name) missing for request email.');
    if (!departmentDetails?.name) throw new Error('Department details (with name) missing for request email.');

    const transporter = await createTransporter(); // Get a configured transporter instance
    const partialBookingId = bookingDetails._id.toString().slice(-6); // For subject/reference

    // --- Prepare Email Content ---
    const startTimeIST = formatDateTimeIST(bookingDetails.startTime);
    const endTimeIST = formatDateTimeIST(bookingDetails.endTime);
    const auditoriumName = auditoriumDetails.name || 'N/A';
    const auditoriumLocation = auditoriumDetails.location || 'N/A';
    const departmentName = departmentDetails.name || 'N/A';
    const eventName = bookingDetails.eventName || 'N/A';
    const description = bookingDetails.description || 'N/A';
    const status = bookingDetails.status?.toUpperCase() || 'PENDING';

    const mailOptions = {
      from: `"Auditorium Booking System" <${emailUser}>`, // Sender display name and address
      to: userEmail,
      subject: `[Pending] Auditorium Booking Request Submitted (#${partialBookingId})`,
      // --- Plain Text Version ---
      text: `Hi there,\n\n` +
            `Your request to book "${auditoriumName}" for the event "${eventName}" ` +
            `(Department: ${departmentName}) has been submitted successfully and is pending administrator approval.\n\n` +
            `Booking Details:\n` +
            `--------------------\n` +
            `ID: ...${partialBookingId}\n` +
            `Event: ${eventName}\n` +
            `Description: ${description}\n` +
            `Auditorium: ${auditoriumName} (${auditoriumLocation})\n` +
            `Department: ${departmentName}\n` +
            `Start Time: ${startTimeIST}\n` + // IST implied by context or add (IST)
            `End Time: ${endTimeIST}\n` +     // IST implied by context or add (IST)
            `Status: ${status}\n` +
            `--------------------\n\n` +
            `You will receive another email once your request is reviewed (approved or rejected).\n\n` +
            `Thanks,\nThe Auditorium Management Team`,
      // --- HTML Version ---
      html: `
        <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.6; color: #333;">
          <p>Hi there,</p>
          <p>Your request to book <strong>${auditoriumName}</strong> for the event "<strong>${eventName}</strong>" (Department: <strong>${departmentName}</strong>) has been submitted successfully and is now <strong>${status}</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 18px; font-weight: bold;">Booking Details:</p>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>ID:</strong> ...${partialBookingId}</li>
            <li><strong>Event:</strong> ${eventName}</li>
            <li><strong>Description:</strong> ${description}</li>
            <li><strong>Auditorium:</strong> ${auditoriumName} (${auditoriumLocation})</li>
            <li><strong>Department:</strong> ${departmentName}</li>
            <li><strong>Start Time:</strong> ${startTimeIST}</li>
            <li><strong>End Time:</strong> ${endTimeIST}</li>
            <li><strong>Status:</strong> <span style="font-weight: bold; color: #ffc107;">${status}</span></li>
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p>You will receive another email once your request is reviewed by the administrator (approved or rejected).</p>
          <p>Thanks,<br>The Auditorium Management Team</p>
        </div>
      `,
    };

    // --- Send Email ---
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Booking request confirmation to: ${userEmail} | Booking ID: ${bookingDetails._id} | Msg ID: ${info.messageId}`);
    return info; // Return mail info (messageId, etc.)

  } catch (error) {
    // Log detailed error but don't crash the primary operation (e.g., booking creation)
    console.error(`[Email Error] Failed sending booking request confirmation to ${userEmail} for booking ${bookingDetails?._id}:`, error.message || error);
    // Depending on requirements, you might want to log this error to a more persistent store
    // return; // Indicate failure without throwing
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
      from: `"Auditorium Booking System" <${emailUser}>`,
      to: userEmail,
      subject: `✅ APPROVED: Auditorium Booking (#${partialBookingId})`,
      // --- Plain Text Version ---
      text: `Hi there,\n\n` +
            `Good news! Your booking request for "${eventName}" ` +
            `(Department: ${departmentName}) in the "${auditoriumName}" has been APPROVED.\n\n` +
            `Approved Booking Details:\n` +
            `--------------------\n` +
            `ID: ...${partialBookingId}\n` +
            `Event: ${eventName}\n` +
            `Auditorium: ${auditoriumName} (${auditoriumLocation})\n` +
            `Department: ${departmentName}\n` +
            `Start Time: ${startTimeIST}\n` +
            `End Time: ${endTimeIST}\n` +
            `Status: ${status}\n` +
            `--------------------\n\n` +
            `Please ensure you adhere to all auditorium usage policies.\n\n` +
            `Thanks,\nThe Auditorium Management Team`,
      // --- HTML Version ---
      html: `
        <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.6; color: #333;">
          <p style="color: #28a745; font-weight: bold;">Hi there,</p>
          <p>Good news! Your booking request for the event "<strong>${eventName}</strong>" (Department: <strong>${departmentName}</strong>) in the <strong>${auditoriumName}</strong> has been <strong style="color: #28a745;">${status}</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 18px; font-weight: bold;">Approved Booking Details:</p>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>ID:</strong> ...${partialBookingId}</li>
            <li><strong>Event:</strong> ${eventName}</li>
            <li><strong>Auditorium:</strong> ${auditoriumName} (${auditoriumLocation})</li>
            <li><strong>Department:</strong> ${departmentName}</li>
            <li><strong>Start Time:</strong> ${startTimeIST}</li>
            <li><strong>End Time:</strong> ${endTimeIST}</li>
            <li><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">${status}</span></li>
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p>Please ensure you adhere to all auditorium usage policies.</p>
          <p>Thanks,<br>The Auditorium Management Team</p>
        </div>
      `,
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
    // auditoriumLocation might not be needed for rejection, but keep if useful
    // const auditoriumLocation = auditoriumDetails.location || 'N/A';
    const departmentName = departmentDetails.name || 'N/A';
    const eventName = bookingDetails.eventName || 'N/A';
    const status = 'REJECTED';
    const reason = rejectionReason.trim(); // Ensure trimmed reason

    const mailOptions = {
      from: `"Auditorium Booking System" <${emailUser}>`,
      to: userEmail,
      subject: `❌ REJECTED: Auditorium Booking Request (#${partialBookingId})`,
      // --- Plain Text Version ---
      text: `Hi there,\n\n` +
            `Unfortunately, your booking request for "${eventName}" ` +
            `(Department: ${departmentName}) in the "${auditoriumName}" has been REJECTED.\n\n` +
            `Reason for Rejection:\n${reason}\n\n` +
            `Rejected Request Details:\n` +
            `--------------------\n` +
            `ID: ...${partialBookingId}\n` +
            `Event: ${eventName}\n` +
            `Auditorium: ${auditoriumName}\n` +
            `Department: ${departmentName}\n` +
            `Requested Start: ${startTimeIST}\n` +
            `Requested End: ${endTimeIST}\n` +
            `Status: ${status}\n` +
            `--------------------\n\n` +
            `Please contact the administration if you have further questions or wish to discuss alternative options.\n\n` +
            `Thanks,\nThe Auditorium Management Team`,
      // --- HTML Version ---
      html: `
        <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.6; color: #333;">
          <p style="color: #dc3545; font-weight: bold;">Hi there,</p>
          <p>Unfortunately, your booking request for the event "<strong>${eventName}</strong>" (Department: <strong>${departmentName}</strong>) in the <strong>${auditoriumName}</strong> has been <strong style="color: #dc3545;">${status}</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 18px; font-weight: bold;">Reason for Rejection:</p>
          <blockquote style="margin: 10px 0 20px 10px; padding: 10px 15px; border-left: 4px solid #ffc107; background-color: #fffbe4; font-style: italic;">
            ${reason}
          </blockquote>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 18px; font-weight: bold;">Rejected Request Details:</p>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>ID:</strong> ...${partialBookingId}</li>
            <li><strong>Event:</strong> ${eventName}</li>
            <li><strong>Auditorium:</strong> ${auditoriumName}</li>
            <li><strong>Department:</strong> ${departmentName}</li>
            <li><strong>Requested Start:</strong> ${startTimeIST}</li>
            <li><strong>Requested End:</strong> ${endTimeIST}</li>
            <li><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">${status}</span></li>
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p>Please contact the administration if you have further questions or wish to discuss alternative options.</p>
          <p>Thanks,<br>The Auditorium Management Team</p>
        </div>
      `,
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
