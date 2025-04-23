const cron = require('node-cron');
const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const Booking = require('../models/Booking'); // Adjust path if needed
const { sendPendingReminderEmailToAdmin } = require('../utils/emailService'); // Adjust path if needed

const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Get admin email from env
let CRON_SCHEDULE = process.env.REMINDER_CRON_SCHEDULE || '0 3 * * *'; // Use let to allow modification if invalid
const REMINDER_DAYS_BEFORE = parseInt(process.env.REMINDER_DAYS_BEFORE || '2', 10); // Parse env var or default to 2

/**
 * Finds pending bookings starting within REMINDER_DAYS_BEFORE days and sends reminders.
 */
/**
 * Finds pending bookings starting within REMINDER_DAYS_BEFORE days and sends reminders.
 */
const checkAndSendReminders = async () => {
    if (!ADMIN_EMAIL) {
        console.warn('[Scheduler] No ADMIN_EMAIL configured. Skipping pending booking reminders.');
        return;
    }

    console.log(`[Scheduler] Running pending booking reminder check at ${new Date().toISOString()}...`);

    try {
        // Calculate the target date range
        const now = DateTime.now();
        const targetStartOfDay = now.plus({ days: REMINDER_DAYS_BEFORE }).startOf('day').toUTC();
        const targetEndOfDay = now.plus({ days: REMINDER_DAYS_BEFORE }).endOf('day').toUTC();

        console.log(`[Scheduler] Target reminder window (UTC): ${targetStartOfDay.toISO()} - ${targetEndOfDay.toISO()}`);

        // Fetch eligible bookings
        const pendingBookings = await Booking.find({
            status: 'pending',
            reminderSent: { $ne: true }, // Find if not explicitly true
            startTime: {
                $gte: targetStartOfDay.toJSDate(),
                $lt: targetEndOfDay.toJSDate()
            }
        }).populate('user', 'username email')
          .populate('auditorium', 'name location')
          .populate('department', 'name');

        console.log(`[Scheduler] Found ${pendingBookings.length} pending bookings matching criteria (status=pending, reminderSent!=true, startTime in range).`);

        if (pendingBookings.length === 0) {
            console.log('[Scheduler] No bookings require reminders currently.');
            return; // Nothing to do
        }

        // Process reminders concurrently
        console.log('[Scheduler] Starting processing loop for found bookings...');
        const results = await Promise.allSettled(
            pendingBookings.map(async (booking) => {
                const bookingIdStr = booking._id.toString(); // Use string ID for logging consistency
                console.log(`[Scheduler] Processing booking ID: ${bookingIdStr} (${booking.eventName})`);

                // Double-check if already sent (extremely rare race condition guard)
                if (booking.reminderSent === true) {
                     console.warn(`[Scheduler] Skipping booking ID: ${bookingIdStr} - reminderSent flag was already true (unexpected).`);
                     return { id: bookingIdStr, status: 'skipped_already_sent' };
                }

                try {
                    // --- Attempt to Send Email ---
                    console.log(`[Scheduler] Attempting to send reminder email for booking ID: ${bookingIdStr}...`);
                    await sendPendingReminderEmailToAdmin(
                        ADMIN_EMAIL,
                        booking,
                        booking.auditorium,
                        booking.department
                    );
                    console.log(`[Scheduler] Reminder email call completed (check email service logs for actual send status) for booking ID: ${bookingIdStr}`);

                    // --- Attempt to Update Database ---
                    console.log(`[Scheduler] Attempting to mark reminderSent=true for booking ID: ${bookingIdStr}...`);
                    await Booking.findByIdAndUpdate(bookingIdStr, { reminderSent: true });
                    console.log(`[Scheduler] Successfully marked reminderSent=true for booking ID: ${bookingIdStr}`);
                    return { id: bookingIdStr, status: 'success' };

                } catch (processingError) {
                    // Catch errors from either email sending OR database update
                    console.error(`[Scheduler] ERROR processing booking ID ${bookingIdStr}:`, processingError.message || processingError);

                    // --- Attempt to mark as sent even on error to prevent spam ---
                    // This is a design choice: prioritize not spamming over ensuring email was sent if errors occur.
                    try {
                        console.warn(`[Scheduler] Attempting to mark reminderSent=true for booking ID ${bookingIdStr} despite previous error...`);
                        await Booking.findByIdAndUpdate(bookingIdStr, { reminderSent: true });
                        console.warn(`[Scheduler] Marked reminderSent=true for booking ID ${bookingIdStr} after processing error.`);
                    } catch(updateError) {
                        // This is more critical - failed to send AND failed to mark as sent
                        console.error(`[Scheduler] CRITICAL FAILURE: Failed to mark reminderSent=true for booking ${bookingIdStr} after processing error:`, updateError);
                    }
                    return { id: bookingIdStr, status: 'processing_error', error: processingError.message };
                }
            })
        );

        // Log final outcomes
        console.log('[Scheduler] Finished processing loop. Results:');
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                console.log(`  - Booking ID ${result.value.id}: Status ${result.value.status}${result.value.error ? ` (Error: ${result.value.error})` : ''}`);
            } else {
                console.error(`  - Unexpected Promise Rejection:`, result.reason);
            }
        });

    } catch (error) {
        console.error('[Scheduler] CRITICAL Error during main reminder check job:', error);
    } finally {
        console.log('[Scheduler] Reminder check job finished execution.');
    }
};

/**
 * Starts the cron job for sending pending booking reminders.
 */
const startReminderScheduler = () => {
    if (!cron.validate(CRON_SCHEDULE)) {
        console.error(`[Scheduler] Invalid CRON_SCHEDULE format: "${CRON_SCHEDULE}". Defaulting to daily at 3 AM.`);
        CRON_SCHEDULE = '0 3 * * *';
    }
    console.log(`[Scheduler] Initializing pending booking reminder job with schedule: ${CRON_SCHEDULE}`);
    cron.schedule(CRON_SCHEDULE, checkAndSendReminders, {
        scheduled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    // Optional: Run once on startup
    // console.log('[Scheduler] Running initial reminder check on startup...');
    // checkAndSendReminders();
};

module.exports = { startReminderScheduler };