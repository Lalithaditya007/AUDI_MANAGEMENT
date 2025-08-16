import React, { useState } from 'react';
import { X, User, Mail, Building, Phone } from 'lucide-react';

const EditProfileModal = ({ isOpen, onClose, onSubmit, userData, userType }) => {
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    email: userData?.email || '',
    department: userData?.department || '',
    contact: userData?.contact || ''
  });

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

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email format is invalid';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.contact)) {
      newErrors.contact = 'Contact number format is invalid';
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
      name: userData?.name || '',
      email: userData?.email || '',
      department: userData?.department || '',
      contact: userData?.contact || ''
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-white/5 rounded-2xl"></div>
        <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/30 bg-white/5 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <User className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">
              Edit {userType === 'admin' ? 'Admin' : 'User'} Profile
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white/5 backdrop-blur-sm rounded-b-2xl">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email address"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${
                errors.department ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your department"
            />
            {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
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
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${
                errors.contact ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your contact number"
            />
            {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact}</p>}
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
