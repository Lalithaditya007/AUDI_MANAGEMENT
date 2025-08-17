import React, { useState, useEffect } from 'react';
import { X, User, Mail, Building, Phone } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, onSubmit, userData, userType }) => {
  const [formData, setFormData] = useState({
    firstName: userData?.profile?.firstName || userData?.name?.split(' ')[0] || '',
    lastName: userData?.profile?.lastName || userData?.name?.split(' ').slice(1).join(' ') || '',
    department: userData?.profile?.department || userData?.department || '',
    contact: userData?.profile?.contact || userData?.contact || '',
    bio: userData?.profile?.bio || '',
    position: userData?.profile?.position || ''
  });

  // Sync form fields with userData when modal opens or userData changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        firstName: userData?.profile?.firstName || userData?.name?.split(' ')[0] || '',
        lastName: userData?.profile?.lastName || userData?.name?.split(' ').slice(1).join(' ') || '',
        department: userData?.profile?.department || userData?.department || '',
        contact: userData?.profile?.contact || userData?.contact || '',
        bio: userData?.profile?.bio || '',
        position: userData?.profile?.position || ''
      });
    }
  }, [isOpen, userData]);

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.contact)) {
      newErrors.contact = 'Contact number format is invalid';
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: userData?.profile?.firstName || userData?.name?.split(' ')[0] || '',
      lastName: userData?.profile?.lastName || userData?.name?.split(' ').slice(1).join(' ') || '',
      department: userData?.profile?.department || userData?.department || '',
      contact: userData?.profile?.contact || userData?.contact || '',
      bio: userData?.profile?.bio || '',
      position: userData?.profile?.position || ''
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 relative">
        <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50/80 to-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <User className="w-7 h-7 text-blue-600" />
            <h2 className="text-2xl font-bold text-[#82181A] tracking-tight">
              Edit {userType === 'admin' ? 'Admin' : 'User'} Profile
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white rounded-b-2xl">
          {/* First Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2 text-blue-500" />
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`w-full px-2 py-1.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your first name"
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`w-full px-2 py-1.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your last name"
            />
            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              <Building className="w-4 h-4 inline mr-2" />
              Department
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={`w-full px-2 py-1.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm ${
                errors.department ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your department"
            />
            {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              <Building className="w-4 h-4 inline mr-2" />
              Position/Title
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-2 py-1.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm"
              placeholder="Enter your position or title"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Contact Number
            </label>
            <input
              type="tel"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className={`w-full px-2 py-1.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm ${
                errors.contact ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your contact number"
            />
            {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact}</p>}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Bio (Optional)
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              maxLength={500}
              className={`w-full px-2 py-1.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm resize-none ${
                errors.bio ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Tell us a bit about yourself..."
            />
            <div className="flex justify-between text-sm text-white/60 mt-1">
              <span>{errors.bio && <span className="text-red-500">{errors.bio}</span>}</span>
              <span>{formData.bio.length}/500</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-3 gap-4 pt-6">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Save
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
