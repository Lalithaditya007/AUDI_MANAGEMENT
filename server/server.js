// server.js
require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Required for serving static files
const multer = require('multer'); // Need multer instance for error handling check below

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const auditoriumRoutes = require('./routes/auditoriumRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const departmentRoutes = require('./routes/departmentRoutes'); // <-- ADDED: Import department routes

// Adjust paths if your routes are elsewhere

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5001; // Use port from env or default
const MONGODB_URI = process.env.MONGODB_URI; // Get MongoDB URI from env

// --- Essential Middleware ---
// Enable CORS for your frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Allow frontend dev server
  optionsSuccessStatus: 200,
  credentials: true // Good practice if dealing with authentication tokens/cookies
}));

// Parse incoming JSON request bodies
app.use(express.json());
// Note: We DO NOT use express.urlencoded({ extended: false }) globally if using multer,
// as multer needs the raw multipart data. It's applied per-route.

// --- BEGIN: Serve Static Files from 'uploads' (STEP 14 Add-on) ---
// This makes files inside the 'uploads' directory accessible via URLs starting with '/uploads'
// Example: http://localhost:5001/uploads/booking-userid-timestamp-random.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Use 'uploads' relative to server.js directory
console.log(`Serving static files from '${path.join(__dirname, 'uploads')}' at '/uploads' path.`);
// --- END: Serve Static Files ---


// --- Mount API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/auditoriums', auditoriumRoutes);
app.use('/api/bookings', bookingRoutes); // This now includes the POST route with multer
app.use('/api/departments', departmentRoutes); // <-- ADDED: Mount department routes


// --- Root Route (Simple Check) ---
app.get('/api', (req, res) => { // Added /api prefix for consistency
    res.status(200).json({ message: 'Auditorium Management API is active!' });
});


// --- Database Connection ---
const connectDB = async () => {
    if (!MONGODB_URI) {
        console.error('FATAL ERROR: MONGODB_URI is not defined in .env file.');
        process.exit(1);
    }
    try {
        await mongoose.connect(MONGODB_URI); // Removed deprecated options
        console.log('MongoDB connected successfully.');
    }
    catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1); // Exit on connection failure
    }
};


// --- Start Server Function ---
const startServer = async () => {
    await connectDB(); // Ensure DB connection before listening
    app.listen(PORT, () => {
        console.log(`-------------------------------------------------------`);
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        console.log(`API base URL: http://localhost:${PORT}/api`);
        console.log(`-------------------------------------------------------`);
    });
};


// --- Global Error Handler (Last Middleware) ---
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? (err.statusCode || 500) : res.statusCode; // Use error's status code if available

    console.error("--- UNHANDLED ERROR ---");
    console.error("Message:", err.message);
    console.error("Status Code:", statusCode);
    // Avoid leaking stack trace in production
    console.error("Stack:", process.env.NODE_ENV === 'production' ? 'omitted' : err.stack);

     // Handle Multer specific errors more granularly
    if (err instanceof multer.MulterError) {
        // e.g., A Multer error occurred when uploading.
        return res.status(400).json({ success: false, message: `File Upload Error: ${err.code} - ${err.message}` });
    } else if (err) { // Check for other errors
         // Handle specific custom errors like file filter errors
         if (err.message?.includes('Only images allowed') || err.message?.includes('Upload rejected')) {
            return res.status(400).json({ success: false, message: err.message });
         }
        // For any other generic errors
         return res.status(statusCode).json({
             success: false,
             message: err.message || 'An unexpected server error occurred.'
             // stack: process.env.NODE_ENV === 'production' ? null : err.stack, // Optionally include stack in dev
         });
    }
    // If no error was passed, but somehow we ended here.
    // Although this shouldn't typically happen if routes/middleware are correct.
    res.status(500).json({ success: false, message: 'Reached error handler without an error.' });
});


// --- Graceful Shutdown ---
// Renaming the 'server' variable for the listener to avoid conflict if declared elsewhere.
const httpServer = startServer(); // Call startServer and potentially store the server instance if needed for closing

process.on('SIGINT', async () => { // For Ctrl+C
    console.log('SIGINT signal received: Closing HTTP server & DB connection...');
    // You might need to store the server instance from app.listen to close it gracefully
    // Example: const httpServer = app.listen(...); then httpServer.close() here.
    // If startServer() returns the listener, use that. Assuming it doesn't currently:
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
});

process.on('SIGTERM', async () => { // For termination signals (e.g., from Docker, systemctl)
     console.log('SIGTERM signal received: Closing HTTP server & DB connection...');
     // Similar graceful close as SIGINT
     await mongoose.connection.close();
     console.log('MongoDB connection closed.');
     process.exit(0);
 });

// --- Handle Unhandled Promise Rejections ---
process.on('unhandledRejection', (err, promise) => {
    console.error(`Unhandled Rejection at: ${promise}, reason: ${err.message}`);
    console.error(err.stack);
    // It's often recommended to exit gracefully after an unhandled rejection
    // as the application state might be unpredictable.
    process.exit(1); // Exit immediately or attempt graceful shutdown
});