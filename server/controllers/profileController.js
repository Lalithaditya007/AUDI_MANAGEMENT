const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Report = require('../models/Report');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const { sendFeedbackNotificationToAdmin, sendReportNotificationToAdmin } = require('../utils/emailService');

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        console.log('=== GET PROFILE REQUEST ===');
        console.log('User ID from token:', req.user?.id);
        console.log('User role from token:', req.user?.role);
        
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            console.log('❌ User not found with ID:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('✅ User found:', {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            hasProfile: !!user.profile
        });
        
        console.log('📋 Profile data:', user.profile);

        res.status(200).json({
            success: true,
            data: user
        });
        
        console.log('✅ Profile data sent successfully');
    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile'
        });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        console.log('=== UPDATE PROFILE REQUEST ===');
        console.log('User ID from token:', req.user?.id);
        console.log('Request body:', req.body);
        
        const {
            firstName,
            lastName,
            department,
            contact,
            bio,
            position
        } = req.body;

        const user = await User.findById(req.user.id);
        
        if (!user) {
            console.log('❌ User not found with ID:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('✅ User found for update:', user.email);
        console.log('📝 Current profile:', user.profile);

        // Update profile fields
        if (firstName !== undefined) {
            user.profile.firstName = firstName;
            console.log('Updated firstName:', firstName);
        }
        if (lastName !== undefined) {
            user.profile.lastName = lastName;
            console.log('Updated lastName:', lastName);
        }
        if (department !== undefined) {
            user.profile.department = department;
            console.log('Updated department:', department);
        }
        if (contact !== undefined) {
            user.profile.contact = contact;
            console.log('Updated contact:', contact);
        }
        if (bio !== undefined) {
            user.profile.bio = bio;
            console.log('Updated bio:', bio);
        }
        if (position !== undefined) {
            user.profile.position = position;
            console.log('Updated position:', position);
        }

        console.log('💾 Saving updated profile...');
        await user.save();
        console.log('✅ Profile saved successfully');

        // Return updated user without password
        const updatedUser = await User.findById(req.user.id).select('-password');
        console.log('📋 Updated profile data:', updatedUser.profile);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
        
        console.log('✅ Update profile response sent');
    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating profile'
        });
    }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete old profile picture if exists
        if (user.profile.profilePicture) {
            try {
                const oldFilePath = path.join(__dirname, '..', user.profile.profilePicture);
                await fs.unlink(oldFilePath);
            } catch (error) {
                console.log('Old profile picture not found or could not be deleted:', error.message);
            }
        }

        // Update profile picture path
        user.profile.profilePicture = `/uploads/profiles/${req.file.filename}`;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            profilePicture: user.profile.profilePicture
        });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while uploading profile picture'
        });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        console.log('Password change request received');
        console.log('Request body:', req.body);
        console.log('User ID from token:', req.user?.id);
        
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Please provide current password, new password, and confirmation'
            });
        }

        if (newPassword !== confirmPassword) {
            console.log('Validation failed: Passwords do not match');
            return res.status(400).json({
                success: false,
                message: 'New password and confirmation do not match'
            });
        }

        if (newPassword.length < 6) {
            console.log('Validation failed: Password too short');
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Get user with password
        console.log('Finding user with ID:', req.user.id);
        const user = await User.findById(req.user.id).select('+password');
        
        if (!user) {
            console.log('User not found with ID:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('User found:', user.email);

        // Check current password
        console.log('Checking current password...');
        const isCurrentPasswordCorrect = await user.matchPassword(currentPassword);
        console.log('Current password check result:', isCurrentPasswordCorrect);
        
        if (!isCurrentPasswordCorrect) {
            console.log('Current password is incorrect');
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        console.log('Updating password...');
        user.password = newPassword;
        await user.save();
        console.log('Password updated successfully');

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while changing password'
        });
    }
};

// Submit feedback
exports.submitFeedback = async (req, res) => {
    try {
        console.log('=== SUBMIT FEEDBACK REQUEST ===');
        console.log('User ID from token:', req.user?.id);
        console.log('Request body:', req.body);
        console.log('Files:', req.files);
        
        const {
            category,        // Frontend sends 'category', map to type
            subject,
            message,
            rating,
            anonymous
        } = req.body;

        // Map frontend category names to backend enum values
        const feedbackCategoryMapping = {
            'User Experience': 'feedback',
            'Booking Process': 'feedback',
            'Auditorium Facilities': 'suggestion',
            'Staff Support': 'feedback',
            'Website Performance': 'complaint',
            'Other': 'feedback'
        };

        // Map frontend field names to backend field names
        const type = feedbackCategoryMapping[category] || 'feedback';

        console.log('Frontend category:', category);
        console.log('Mapped type:', type);

        // Validation
        if (!subject || !message) {
            console.log('❌ Missing required fields - subject or message');
            return res.status(400).json({
                success: false,
                message: 'Subject and message are required'
            });
        }

        console.log('✅ Required fields validated');

        // Handle file attachments if any
        const attachments = [];
        if (req.files && req.files.length > 0) {
            console.log('📎 Processing', req.files.length, 'file attachments');
            req.files.forEach(file => {
                attachments.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    path: file.path,
                    size: file.size,
                    mimetype: file.mimetype
                });
            });
            console.log('Processed attachments:', attachments);
        }

        console.log('💾 Creating feedback record...');
        const feedback = await Feedback.create({
            user: req.user.id,
            type: type,
            subject,
            message,
            rating: rating || null,
            attachments
        });
        console.log('✅ Feedback created with ID:', feedback._id);

        console.log('📋 Populating user data...');
        await feedback.populate('user', 'username email profile.firstName profile.lastName');
        console.log('✅ User data populated');

        // Send email notification to admin
        try {
            console.log('📧 Sending feedback notification to admin...');
            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail) {
                await sendFeedbackNotificationToAdmin(adminEmail, feedback);
                console.log('✅ Admin notification sent successfully');
            } else {
                console.warn('⚠️ ADMIN_EMAIL not configured, skipping notification');
            }
        } catch (emailError) {
            console.error('❌ Failed to send admin notification:', emailError.message);
            // Don't fail the request if email fails, just log it
        }

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback
        });
        
        console.log('✅ Submit feedback response sent');
    } catch (error) {
        console.error('❌ Submit feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting feedback'
        });
    }
};

// Submit report
exports.submitReport = async (req, res) => {
    try {
        console.log('=== SUBMIT REPORT REQUEST ===');
        console.log('User ID from token:', req.user?.id);
        console.log('Request body:', req.body);
        console.log('Files:', req.files);
        
        const {
            category,        // Frontend sends 'category', map to reportType
            subject,
            message,         // Frontend sends 'message', map to description
            severity,
            reportedUser,
            relatedBooking,
            relatedAuditorium,
            anonymous
        } = req.body;

        // Map frontend category names to backend enum values
        const categoryMapping = {
            'Technical Issue': 'technical_issue',
            'Inappropriate Content': 'inappropriate_content',
            'Booking Violation': 'policy_violation',
            'Facility Problem': 'technical_issue',
            'User Misconduct': 'harassment',
            'Other': 'other'
        };

        // Map frontend field names to backend field names
        const reportType = categoryMapping[category] || 'other';
        const description = message;

        console.log('Frontend category:', category);
        console.log('Mapped reportType:', reportType);

        // Validation
        if (!reportType || !subject || !description) {
            console.log('❌ Missing required fields - reportType, subject, or description');
            console.log('Received - reportType:', reportType, 'subject:', subject, 'description:', description);
            return res.status(400).json({
                success: false,
                message: 'Report type, subject, and description are required'
            });
        }

        console.log('✅ Required fields validated');
        console.log('Mapped fields - reportType:', reportType, 'description:', description);

        // Handle evidence files if any
        const evidence = [];
        if (req.files && req.files.length > 0) {
            console.log('📎 Processing', req.files.length, 'evidence files');
            req.files.forEach(file => {
                evidence.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    path: file.path,
                    size: file.size,
                    mimetype: file.mimetype,
                    description: file.description || ''
                });
            });
            console.log('Processed evidence:', evidence);
        }

        console.log('📝 Preparing report data...');
        const reportData = {
            reporter: req.user.id,
            reportType,
            subject,
            description,
            severity: severity || 'medium',
            evidence
        };

        // Add optional references
        if (reportedUser) {
            reportData.reportedUser = reportedUser;
            console.log('Added reportedUser:', reportedUser);
        }
        if (relatedBooking) {
            reportData.relatedBooking = relatedBooking;
            console.log('Added relatedBooking:', relatedBooking);
        }
        if (relatedAuditorium) {
            reportData.relatedAuditorium = relatedAuditorium;
            console.log('Added relatedAuditorium:', relatedAuditorium);
        }

        console.log('💾 Creating report record...');
        const report = await Report.create(reportData);
        console.log('✅ Report created with ID:', report._id);

        console.log('📋 Populating reporter data...');
        await report.populate('reporter', 'username email profile.firstName profile.lastName');
        console.log('✅ Reporter data populated');

        // Send email notification to admin
        try {
            console.log('📧 Sending report notification to admin...');
            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail) {
                await sendReportNotificationToAdmin(adminEmail, report);
                console.log('✅ Admin notification sent successfully');
            } else {
                console.warn('⚠️ ADMIN_EMAIL not configured, skipping notification');
            }
        } catch (emailError) {
            console.error('❌ Failed to send admin notification:', emailError.message);
            // Don't fail the request if email fails, just log it
        }

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            data: report
        });
        
        console.log('✅ Submit report response sent');
    } catch (error) {
        console.error('❌ Submit report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while submitting report'
        });
    }
};

// Get user's feedback history
exports.getFeedbackHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const feedbacks = await Feedback.find({ user: req.user.id })
            .populate('user', 'username email profile.firstName profile.lastName')
            .populate('adminResponse.respondedBy', 'username profile.firstName profile.lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Feedback.countDocuments({ user: req.user.id });

        res.status(200).json({
            success: true,
            data: feedbacks,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get feedback history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching feedback history'
        });
    }
};

// Get user's report history
exports.getReportHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const reports = await Report.find({ reporter: req.user.id })
            .populate('reporter', 'username email profile.firstName profile.lastName')
            .populate('reportedUser', 'username profile.firstName profile.lastName')
            .populate('relatedBooking', 'eventName eventDate')
            .populate('relatedAuditorium', 'name')
            .populate('resolution.resolvedBy', 'username profile.firstName profile.lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Report.countDocuments({ reporter: req.user.id });

        res.status(200).json({
            success: true,
            data: reports,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get report history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching report history'
        });
    }
};

// Delete profile picture
exports.deleteProfilePicture = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.profile.profilePicture) {
            return res.status(400).json({
                success: false,
                message: 'No profile picture to delete'
            });
        }

        // Delete file from filesystem
        try {
            const filePath = path.join(__dirname, '..', user.profile.profilePicture);
            await fs.unlink(filePath);
        } catch (error) {
            console.log('Profile picture file not found or could not be deleted:', error.message);
        }

        // Remove from database
        user.profile.profilePicture = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile picture deleted successfully'
        });
    } catch (error) {
        console.error('Delete profile picture error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting profile picture'
        });
    }
};
