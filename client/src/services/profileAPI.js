// API base configuration
const API_BASE_URL = 'http://localhost:5001/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken'); // Changed from 'token' to 'authToken'
};

// Create auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json'
  };
};

// Create multipart headers
const getMultipartHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': token ? `Bearer ${token}` : ''
    // Don't set Content-Type for multipart requests, let the browser set it
  };
};

// Profile API calls
export const profileAPI = {
  // Get user profile
  getProfile: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch profile');
      }
      
      return data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }
      
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await fetch(`${API_BASE_URL}/profile/upload-picture`, {
        method: 'POST',
        headers: getMultipartHeaders(),
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload profile picture');
      }
      
      return data;
    } catch (error) {
      console.error('Upload profile picture error:', error);
      throw error;
    }
  },

  // Delete profile picture
  deleteProfilePicture: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/delete-picture`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete profile picture');
      }
      
      return data;
    } catch (error) {
      console.error('Delete profile picture error:', error);
      throw error;
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/change-password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(passwordData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }
      
      return data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  // Submit feedback
  submitFeedback: async (feedbackData, attachments = []) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.keys(feedbackData).forEach(key => {
        if (feedbackData[key] !== undefined && feedbackData[key] !== null) {
          formData.append(key, feedbackData[key]);
        }
      });
      
      // Add attachments
      attachments.forEach(file => {
        formData.append('attachments', file);
      });
      
      const response = await fetch(`${API_BASE_URL}/profile/feedback`, {
        method: 'POST',
        headers: getMultipartHeaders(),
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }
      
      return data;
    } catch (error) {
      console.error('Submit feedback error:', error);
      throw error;
    }
  },

  // Submit report
  submitReport: async (reportData, evidence = []) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.keys(reportData).forEach(key => {
        if (reportData[key] !== undefined && reportData[key] !== null) {
          formData.append(key, reportData[key]);
        }
      });
      
      // Add evidence files
      evidence.forEach(file => {
        formData.append('evidence', file);
      });
      
      const response = await fetch(`${API_BASE_URL}/profile/report`, {
        method: 'POST',
        headers: getMultipartHeaders(),
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit report');
      }
      
      return data;
    } catch (error) {
      console.error('Submit report error:', error);
      throw error;
    }
  },

  // Get feedback history
  getFeedbackHistory: async (page = 1, limit = 10) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/feedback-history?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch feedback history');
      }
      
      return data;
    } catch (error) {
      console.error('Get feedback history error:', error);
      throw error;
    }
  },

  // Get report history
  getReportHistory: async (page = 1, limit = 10) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/report-history?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch report history');
      }
      
      return data;
    } catch (error) {
      console.error('Get report history error:', error);
      throw error;
    }
  }
};

// Admin Profile API calls
export const adminProfileAPI = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/profile/dashboard-stats`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch dashboard stats');
      }
      
      return data;
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  },

  // Get all feedback
  getAllFeedback: async (page = 1, limit = 10, filters = {}) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      
      const response = await fetch(`${API_BASE_URL}/admin/profile/feedback?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch feedback');
      }
      
      return data;
    } catch (error) {
      console.error('Get all feedback error:', error);
      throw error;
    }
  },

  // Respond to feedback
  respondToFeedback: async (feedbackId, responseData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/profile/feedback/${feedbackId}/respond`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(responseData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to respond to feedback');
      }
      
      return data;
    } catch (error) {
      console.error('Respond to feedback error:', error);
      throw error;
    }
  },

  // Get all reports
  getAllReports: async (page = 1, limit = 10, filters = {}) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      
      const response = await fetch(`${API_BASE_URL}/admin/profile/reports?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch reports');
      }
      
      return data;
    } catch (error) {
      console.error('Get all reports error:', error);
      throw error;
    }
  },

  // Resolve report
  resolveReport: async (reportId, resolutionData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/profile/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(resolutionData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to resolve report');
      }
      
      return data;
    } catch (error) {
      console.error('Resolve report error:', error);
      throw error;
    }
  }
};
