require('dotenv').config();

const app = require('../server/app');
const { connectDB } = require('../server/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('Vercel API bootstrap error:', err.message);
    return res.status(500).json({ success: false, message: 'Server startup error.' });
  }
};
