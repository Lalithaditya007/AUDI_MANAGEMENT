require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');

const authRoutes = require('./routes/auth');
const auditoriumRoutes = require('./routes/auditoriumRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

const app = express();

const configuredOrigin = process.env.FRONTEND_URL;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isConfigured = configuredOrigin ? origin === configuredOrigin : false;
    const isVercelPreview = /^https:\/\/.+\.vercel\.app$/.test(origin);

    if (isLocalhost || isConfigured || isVercelPreview) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  optionsSuccessStatus: 200,
  credentials: true,
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/auditoriums', auditoriumRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/departments', departmentRoutes);

app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Auditorium Management API is active!' });
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? (err.statusCode || 500) : res.statusCode;
  console.error('--- UNHANDLED ERROR ---');
  console.error('Message:', err.message);
  console.error('Status Code:', statusCode);
  console.error('Stack:', process.env.NODE_ENV === 'production' ? 'omitted' : err.stack);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `File Upload Error: ${err.code} - ${err.message}` });
  }

  if (
    err.message?.includes('Invalid file type')
    || err.message?.includes('Azure')
    || err.message?.includes('Cloudinary')
    || err.message?.includes('Server configuration error')
  ) {
    return res.status(statusCode < 500 ? statusCode : 400).json({ success: false, message: err.message });
  }

  return res.status(statusCode).json({ success: false, message: err.message || 'An unexpected server error occurred.' });
});

module.exports = app;
