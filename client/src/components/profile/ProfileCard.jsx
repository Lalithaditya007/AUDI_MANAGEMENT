import React, { useState } from 'react';
import { User, Mail, Phone, Building, Camera, FileText, MessageSquare, Key, Edit } from 'lucide-react';

const ProfileCard = ({ 
  userType = 'user', 
  userData = {
    name: 'John Doe',
    email: 'john@example.com',
    department: 'Computer Science',
    contact: '+91 9876543210',
    profilePic: null
  },
  onPasswordChange,
  onFeedback,
  onReporting,
  onProfilePicChange,
  onEditProfile
}) => {
  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl"></div>
      {/* Content */}
      <div className="relative z-10 p-6">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 mb-8">
        {/* Profile Picture */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden border-4 border-white/50 shadow-lg">
            {userData.profilePic ? (
              <img 
                src={userData.profilePic} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-gray-600" />
            )}
          </div>
          <button 
            onClick={onProfilePicChange}
            className="absolute bottom-0 right-0 bg-white/90 hover:bg-white backdrop-blur-sm text-gray-700 hover:text-gray-900 p-2 rounded-full shadow-lg transition-colors border border-gray-200"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* User Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{userData.name}</h1>
          <p className="text-lg text-gray-600 mb-1 capitalize">{userType}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Mail className="w-4 h-4" />
              <span>{userData.email}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Building className="w-4 h-4" />
              <span>{userData.department}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Phone className="w-4 h-4" />
              <span>{userData.contact}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Section */}
      <div className="mb-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Profile Details</h2>
          <button
            onClick={onEditProfile}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <p className="text-lg text-gray-900">{userData.name}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <p className="text-lg text-gray-900">{userData.email}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <p className="text-lg text-gray-900">{userData.department}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <p className="text-lg text-gray-900">{userData.contact}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div>
        {/* Section Header */}
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Actions</h2>
        
        {/* Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Change Password */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-3">
              <Key className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Update your account password for security</p>
            <button 
              onClick={onPasswordChange}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Change Password
            </button>
          </div>

          {/* Feedback */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-3">
              <MessageSquare className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Feedback</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Share your experience and suggestions</p>
            <button 
              onClick={onFeedback}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Give Feedback
            </button>
          </div>

          {/* Reporting */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-3">
              <FileText className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-800">Reporting</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Report issues or violations</p>
            <button 
              onClick={onReporting}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Report Issue
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ProfileCard;