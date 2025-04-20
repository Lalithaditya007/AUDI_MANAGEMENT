// server.js
require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Required for path operations, keep it
const multer = require('multer'); // Keep for error handling check below

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const auditoriumRoutes = require('./routes/auditoriumRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

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

// --- REMOVED: Serve Static Files from 'uploads' ---
// Images are now served directly from Azure Blob Storage via URL
// console.log("Local '/uploads' directory static serving is disabled (using Azure Blob Storage).");
// --- END REMOVAL ---


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
    await connectDB();
    // Return the server instance from app.listen() for graceful shutdown
    const server = app.listen(PORT, () => {
        console.log(`-------------------------------------------------------`);
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        console.log(`API base URL: http://localhost:${PORT}/api`);
        console.log(`-------------------------------------------------------`);
    });
    return server; // Return the instance
};


// --- Global Error Handler (Last Middleware) ---
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? (err.statusCode || 500) : res.statusCode;

    console.error("--- UNHANDLED ERROR ---");
    console.error("Message:", err.message);
    console.error("Status Code:", statusCode);
    console.error("Stack:", process.env.NODE_ENV === 'production' ? 'omitted' : err.stack);

    // Handle Multer specific errors
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: `File Upload Error: ${err.code} - ${err.message}` });
    }
    // Handle specific custom errors like file filter errors or Azure errors passed up
    else if (err.message?.includes('Invalid file type') || err.message?.includes('Azure') || err.message?.includes('Server configuration error')) {
        // Provide more specific feedback for known error types
        return res.status(statusCode < 500 ? statusCode : 400).json({ // Use 400 for client-side type errors, 500 for server config
            success: false,
            message: err.message
        });
    }
    // For any other generic errors
    else {
        return res.status(statusCode).json({
            success: false,
            message: err.message || 'An unexpected server error occurred.'
        });
    }
});


// --- Graceful Shutdown ---
let httpServer; // Declare variable to hold server instance

(async () => {
    httpServer = await startServer(); // Assign the returned server instance
})(); // Immediately invoke the async function

const shutdown = async (signal) => {
    console.log(`${signal} signal received: Closing HTTP server & DB connection...`);
    if (httpServer) {
        httpServer.close(async () => { // Use the stored server instance
            console.log('HTTP server closed.');
            await mongoose.connection.close();
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    } else {
        // Fallback if server hasn't started yet
        await mongoose.connection.close();
        console.log('MongoDB connection closed (server might not have been fully started).');
        process.exit(0);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// --- Handle Unhandled Promise Rejections ---
process.on('unhandledRejection', (err, promise) => {
    console.error(`Unhandled Rejection at: ${promise}, reason: ${err.message}`);
    console.error(err.stack);
    // Attempt graceful shutdown before exiting
    shutdown('unhandledRejection').then(() => process.exit(1));
});