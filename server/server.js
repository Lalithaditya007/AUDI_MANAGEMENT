// server.js
require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const auditoriumRoutes = require('./routes/auditoriumRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

// --- Service Imports ---
const { startReminderScheduler } = require('./services/reminderScheduler'); // <-- ADDED Import

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

// --- Essential Middleware ---
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  optionsSuccessStatus: 200,
  credentials: true
}));
app.use(express.json());

// --- Mount API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/auditoriums', auditoriumRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/departments', departmentRoutes);

// --- Root Route (Simple Check) ---
app.get('/api', (req, res) => {
    res.status(200).json({ message: 'Auditorium Management API is active!' });
});

// --- Database Connection ---
const connectDB = async () => {
    if (!MONGODB_URI) {
        console.error('FATAL ERROR: MONGODB_URI is not defined in .env file.');
        process.exit(1);
    }
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB connected successfully.');
    }
    catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};


// --- Start Server Function ---
const startServer = async () => {
    await connectDB(); // Ensure DB connection first

    // --- Start the Reminder Scheduler AFTER DB connection ---
    startReminderScheduler(); // <-- ADDED Scheduler Start
    // ----------------------------------------------------

    // Start listening for HTTP requests
    const server = app.listen(PORT, () => {
        console.log(`-------------------------------------------------------`);
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        console.log(`API base URL: http://localhost:${PORT}/api`);
        console.log(`-------------------------------------------------------`);
    });
    return server; // Return the instance for graceful shutdown
};


// --- Global Error Handler (Last Middleware) ---
app.use((err, req, res, next) => {
    // ... (keep existing implementation) ...
    const statusCode = res.statusCode === 200 ? (err.statusCode || 500) : res.statusCode;
    console.error("--- UNHANDLED ERROR ---"); console.error("Message:", err.message); console.error("Status Code:", statusCode); console.error("Stack:", process.env.NODE_ENV === 'production' ? 'omitted' : err.stack);
    if (err instanceof multer.MulterError) { return res.status(400).json({ success: false, message: `File Upload Error: ${err.code} - ${err.message}` }); }
    else if (err.message?.includes('Invalid file type') || err.message?.includes('Azure') || err.message?.includes('Server configuration error')) { return res.status(statusCode < 500 ? statusCode : 400).json({ success: false, message: err.message }); }
    else { return res.status(statusCode).json({ success: false, message: err.message || 'An unexpected server error occurred.' }); }
});


// --- Graceful Shutdown ---
let httpServer;
(async () => { httpServer = await startServer(); })();

const shutdown = async (signal) => {
    // ... (keep existing implementation) ...
     console.log(`${signal} signal received: Closing HTTP server & DB connection...`); if (httpServer) { httpServer.close(async () => { console.log('HTTP server closed.'); await mongoose.connection.close(); console.log('MongoDB connection closed.'); process.exit(0); }); } else { await mongoose.connection.close(); console.log('MongoDB connection closed (server might not have been fully started).'); process.exit(0); }
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// --- Handle Unhandled Promise Rejections ---
process.on('unhandledRejection', (err, promise) => {
    // ... (keep existing implementation) ...
    console.error(`Unhandled Rejection at: ${promise}, reason: ${err.message}`); console.error(err.stack); shutdown('unhandledRejection').then(() => process.exit(1));
});