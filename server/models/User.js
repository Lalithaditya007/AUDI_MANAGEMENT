const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        match: [ // Basic email format validation
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6, 
        select: false, 
    },
    role: {
        type: String,
        enum: ['user', 'admin'], // Allowed roles
        default: 'user', // Default role is 'user'
    },
    // Profile fields
    profile: {
        firstName: {
            type: String,
            trim: true,
            default: '',
        },
        lastName: {
            type: String,
            trim: true,
            default: '',
        },
        fullName: {
            type: String,
            trim: true,
            default: '',
        },
        department: {
            type: String,
            trim: true,
            default: '',
        },
        contact: {
            type: String,
            trim: true,
            default: '',
        },
        profilePicture: {
            type: String,
            default: null,
        },
        bio: {
            type: String,
            maxlength: 500,
            default: '',
        },
        position: {
            type: String,
            trim: true,
            default: '',
        },
    },
    // Timestamps
    createdAt: { // Keep track of when the user registered
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Pre-save middleware to update timestamps and handle profile data
UserSchema.pre('save', async function(next){
    // Update the updatedAt field
    this.updatedAt = new Date();
    
    // Generate fullName from firstName and lastName if they exist
    if (this.profile.firstName || this.profile.lastName) {
        this.profile.fullName = `${this.profile.firstName} ${this.profile.lastName}`.trim();
    }
    
    // Handle password hashing
    if(!this.isModified('password')) return next(); // If password is not modified, skip hashing
    try{
        const salt = await bcrypt.genSalt(10); 
        this.password = await bcrypt.hash(this.password, salt); 
        next();
    }catch(err){
        next(err);
    }
})

UserSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

module.exports = mongoose.model('User', UserSchema);