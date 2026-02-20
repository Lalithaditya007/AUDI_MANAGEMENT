import React, { useState, useEffect } from 'react';
import { X, User, Building, Phone } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, onSubmit, userData, userType }) => {
  const [formData, setFormData] = useState({
    firstName: userData?.profile?.firstName || userData?.name?.split(' ')[0] || '',
    lastName: userData?.profile?.lastName || userData?.name?.split(' ').slice(1).join(' ') || '',
    department: userData?.profile?.department || userData?.department || '',
    contact: userData?.profile?.contact || userData?.contact || '',
    bio: userData?.profile?.bio || '',
    position: userData?.profile?.position || ''
  });
  const [initialForm, setInitialForm] = useState(null);

  // Sync form fields with userData when modal opens or userData changes
  useEffect(() => {
    if (isOpen) {
      const snapshot = {
        firstName: userData?.profile?.firstName || userData?.name?.split(' ')[0] || '',
        lastName: userData?.profile?.lastName || userData?.name?.split(' ').slice(1).join(' ') || '',
        department: userData?.profile?.department || userData?.department || '',
        contact: userData?.profile?.contact || userData?.contact || '',
        bio: userData?.profile?.bio || '',
        position: userData?.profile?.position || ''
      };
      setFormData(snapshot);
      setInitialForm(snapshot);
      setErrors({});
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
    if (initialForm) {
      setFormData(initialForm);
      setErrors({});
    }
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white rounded-b-2xl">
          {/* Personal Information */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Personal Information</h3>
              <p className="text-xs text-gray-500">Update your basic details.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter first name"
                  />
                </div>
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter last name"
                  />
                </div>
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>
          </div>

          {/* Contact & Role */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact & Role</h3>
              <p className="text-xs text-gray-500">Your department, position, and contact number.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 ${errors.department ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Department"
                  />
                </div>
                {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
              </div>
              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position/Title</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 border-gray-300"
                    placeholder="Position or title"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 ${errors.contact ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
                {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Bio</h3>
                <p className="text-xs text-gray-500">A short introduction (max 500 characters).</p>
              </div>
              <span className="text-xs text-gray-400">{formData.bio.length}/500</span>
            </div>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 resize-none ${errors.bio ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Tell us a bit about yourself..."
            />
            {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Save Changes
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
