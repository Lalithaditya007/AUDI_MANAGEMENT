import React, { useState } from 'react';
import { X, MessageSquare, Star, FileText } from 'lucide-react';

const FeedbackModal = ({ isOpen, onClose, onSubmit, type = 'feedback' }) => {
  const [formData, setFormData] = useState({
    rating: 0,
    category: '',
    subject: '',
    message: '',
    anonymous: false
  });
  const [errors, setErrors] = useState({});

  const isReporting = type === 'reporting';
  
  const feedbackCategories = [
    'User Experience',
    'Booking Process',
    'Auditorium Facilities',
    'Staff Support',
    'Website Performance',
    'Other'
  ];

  const reportingCategories = [
    'Technical Issue',
    'Inappropriate Content',
    'Booking Violation',
    'Facility Problem',
    'User Misconduct',
    'Other'
  ];

  const categories = isReporting ? reportingCategories : feedbackCategories;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleRatingClick = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
    if (errors.rating) {
      setErrors(prev => ({
        ...prev,
        rating: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isReporting && formData.rating === 0) {
      newErrors.rating = 'Please provide a rating';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ ...formData, type });
      setFormData({
        rating: 0,
        category: '',
        subject: '',
        message: '',
        anonymous: false
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-white/5 rounded-2xl"></div>
        <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/30 bg-white/5 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center space-x-3">
            {isReporting ? (
              <FileText className="w-6 h-6 text-orange-500" />
            ) : (
              <MessageSquare className="w-6 h-6 text-green-500" />
            )}
            <h2 className="text-xl font-semibold text-white">
              {isReporting ? 'Report Issue' : 'Share Feedback'}
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
          {/* Rating (only for feedback) */}
          {!isReporting && (
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Overall Rating
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    className={`text-2xl transition-colors ${
                      star <= formData.rating
                        ? 'text-yellow-400 hover:text-yellow-300'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>
              {errors.rating && (
                <p className="mt-1 text-sm text-red-500">{errors.rating}</p>
              )}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="" className="bg-white text-gray-900">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category} className="bg-white text-gray-900">
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${
                errors.subject ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={isReporting ? "Brief description of the issue" : "What's this about?"}
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-500">{errors.subject}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              {isReporting ? 'Issue Details' : 'Your Message'}
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white border-gray-300 text-gray-900 placeholder-gray-500 ${
                errors.message ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={
                isReporting 
                  ? "Please provide detailed information about the issue..."
                  : "Share your thoughts, suggestions, or experience..."
              }
            />
            {errors.message && (
              <p className="mt-1 text-sm text-red-500">{errors.message}</p>
            )}
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="anonymous"
              name="anonymous"
              checked={formData.anonymous}
              onChange={handleChange}
              className="w-4 h-4 text-blue-400 border-white/30 rounded focus:ring-blue-400 bg-white/20 backdrop-blur-sm"
            />
            <label htmlFor="anonymous" className="text-sm text-white/90">
              Submit anonymously
            </label>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                isReporting
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isReporting ? 'Submit Report' : 'Send Feedback'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;