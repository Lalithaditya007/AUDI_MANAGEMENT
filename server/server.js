require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const { connectDB } = require('./config/db');
const { startReminderScheduler } = require('./services/reminderScheduler');

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();
  console.log('MongoDB connected successfully.');

  startReminderScheduler();

  const server = app.listen(PORT, () => {
    console.log('-------------------------------------------------------');
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`API base URL: http://localhost:${PORT}/api`);
    console.log('-------------------------------------------------------');
  });

  return server;
};

let httpServer;
(async () => {
  try {
    httpServer = await startServer();
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();

const shutdown = async (signal) => {
  console.log(`${signal} signal received: Closing HTTP server & DB connection...`);

  if (httpServer) {
    httpServer.close(async () => {
      console.log('HTTP server closed.');
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
    return;
  }

  await mongoose.connection.close();
  console.log('MongoDB connection closed (server might not have been fully started).');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection at: ${promise}, reason: ${err.message}`);
  console.error(err.stack);
  shutdown('unhandledRejection').then(() => process.exit(1));
});
