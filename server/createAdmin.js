require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdminUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists:', existingAdmin.email);
            // Update the admin's profile with some sample data
            existingAdmin.profile = {
                firstName: 'Admin',
                lastName: 'User',
                fullName: 'Admin User',
                department: 'Administration',
                contact: '+91 9876543210',
                bio: 'System Administrator for Auditorium Management',
                position: 'Administrator'
            };
            await existingAdmin.save();
            console.log('Admin profile updated with sample data');
            process.exit(0);
        }

        // Create new admin user
        const adminUser = await User.create({
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            profile: {
                firstName: 'Admin',
                lastName: 'User',
                fullName: 'Admin User',
                department: 'Administration',
                contact: '+91 9876543210',
                bio: 'System Administrator for Auditorium Management',
                position: 'Administrator'
            }
        });

        console.log('Admin user created successfully!');
        console.log('Username: admin');
        console.log('Email: admin@example.com');
        console.log('Password: admin123');
        console.log('Role: admin');

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

createAdminUser();
