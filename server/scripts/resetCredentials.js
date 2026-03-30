const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const User = require('../models/User');

const getArg = (name) => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
};

const hasFlag = (name) => process.argv.includes(name);

const isEmail = (value) => typeof value === 'string' && value.includes('@');

const findByIdentifier = async (identifier) => {
  if (!identifier) return null;
  if (isEmail(identifier)) {
    return User.findOne({ email: identifier.toLowerCase() }).select('+password');
  }
  return User.findOne({ username: identifier }).select('+password');
};

const listUsers = async () => {
  const users = await User.find({}, 'username email role createdAt').sort({ role: 1, username: 1 });
  if (!users.length) {
    console.log('No users found in database.');
    return;
  }

  console.log('\nUsers in database:\n');
  users.forEach((u) => {
    console.log(`- role=${u.role} | username=${u.username} | email=${u.email} | id=${u._id}`);
  });
};

const resetPassword = async ({ identifier, expectedRole, newPassword }) => {
  if (!identifier || !newPassword) return;

  const user = await findByIdentifier(identifier);
  if (!user) {
    throw new Error(`User not found: ${identifier}`);
  }

  if (expectedRole && user.role !== expectedRole) {
    throw new Error(`Role mismatch for ${identifier}. Expected ${expectedRole}, got ${user.role}.`);
  }

  user.password = newPassword;
  await user.save();
  console.log(`Password reset successful for ${user.role}: ${user.username} (${user.email})`);
};

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in server/.env');
  }

  await mongoose.connect(mongoUri);

  const listOnly = hasFlag('--list');
  const adminIdentifier = getArg('--admin-identifier');
  const adminPassword = getArg('--admin-password');
  const userIdentifier = getArg('--user-identifier');
  const userPassword = getArg('--user-password');

  if (listOnly) {
    await listUsers();
    return;
  }

  if (!adminIdentifier && !userIdentifier) {
    console.log('Nothing to reset. Use --list or provide reset arguments.');
    console.log('Example:');
    console.log('node scripts/resetCredentials.js --admin-identifier admin@college.edu --admin-password NewAdmin123 --user-identifier user@college.edu --user-password NewUser123');
    return;
  }

  await resetPassword({
    identifier: adminIdentifier,
    expectedRole: 'admin',
    newPassword: adminPassword,
  });

  await resetPassword({
    identifier: userIdentifier,
    expectedRole: 'user',
    newPassword: userPassword,
  });
};

run()
  .catch((err) => {
    console.error('Credential reset failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (e) {
      // no-op
    }
  });
