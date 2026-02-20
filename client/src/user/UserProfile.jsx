import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProfileCard from '../components/profile/ProfileCard';
import ProfileStats from '../components/profile/ProfileStats';
import ProfileActivity from '../components/profile/ProfileActivity';
import PasswordChangeModal from '../components/profile/PasswordChangeModal';
import FeedbackModal from '../components/profile/FeedbackModal';
import EditProfileModal from '../components/profile/EditProfileModal';
import { profileAPI } from '../services/profileAPI';

const UserProfile = () => {
  const [modals, setModals] = useState({
    passwordChange: false,
    feedback: false,
    reporting: false,
    editProfile: false
  });

  // User data state - replace with actual user data from API
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myBookings, setMyBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, pending: 0, cancelled: 0 });

  // Toast notification function
  const showToast = (type, message) => {
    toast[type](message, {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  // Load user profile data
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      if (response.success) {
        setUserData(response.data);
      } else {
        setError('Failed to load profile data');
      }
      // Also try to load user's bookings for stats from booking history endpoint
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001';
          const res = await fetch(`${apiBase}/api/bookings/mybookings`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
          const data = await res.json();
          if (res.ok && data.success && Array.isArray(data.data)) {
            setMyBookings(data.data);
          }
        }
      } catch (e) {
        // Non-blocking for profile
        console.warn('Failed loading user bookings for stats:', e);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError(error.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Derive stats when bookings change
  useEffect(() => {
    if (!Array.isArray(myBookings)) return;
    const now = new Date();
    let total = myBookings.length;
    let pending = 0, cancelled = 0, upcoming = 0;
    for (const b of myBookings) {
      if (b.status === 'pending') pending++;
      if (b.status === 'cancelled') cancelled++;
      if (b.status === 'approved' && b.startTime && new Date(b.startTime) > now) upcoming++;
    }
    setStats({ total, upcoming, pending, cancelled });
  }, [myBookings]);

  const openModal = (modalType) => {
    setModals(prev => ({
      ...prev,
      [modalType]: true
    }));
  };

  const closeModal = (modalType) => {
    setModals(prev => ({
      ...prev,
      [modalType]: false
    }));
  };

  const handlePasswordChange = async (passwordData) => {
    try {
      const response = await profileAPI.changePassword(passwordData);
      if (response.success) {
        showToast('success', 'Password changed successfully!');
        closeModal('passwordChange');
        return { success: true };
      }
      // Map generic failure to field errors if possible
      return {
        success: false,
        errors: {
          currentPassword: response.message || 'Failed to change password'
        }
      };
    } catch (error) {
      // Try to infer specific errors
      const msg = error.message || 'Error changing password';
      let fieldErrors = {};
      if (/incorrect/i.test(msg)) {
        fieldErrors.currentPassword = 'Current password is incorrect';
      } else if (/match/i.test(msg)) {
        fieldErrors.confirmPassword = 'Passwords do not match';
      } else if (/least\s*6/i.test(msg)) {
        fieldErrors.newPassword = 'Password must be at least 6 characters';
      } else {
        fieldErrors.currentPassword = msg;
      }
      return { success: false, errors: fieldErrors };
    }
  };

  const handleFeedback = async (feedbackData) => {
    try {
      const response = await profileAPI.submitFeedback(feedbackData);
      if (response.success) {
        showToast('success', 'Feedback submitted successfully!');
        closeModal('feedback');
      } else {
        showToast('error', response.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      showToast('error', error.message || 'Error submitting feedback');
    }
  };

  const handleReporting = async (reportData) => {
    try {
      const response = await profileAPI.submitReport(reportData);
      if (response.success) {
        showToast('success', 'Report submitted successfully!');
        closeModal('reporting');
      } else {
        showToast('error', response.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Report submission error:', error);
      showToast('error', error.message || 'Error submitting report');
    }
  };

  const handleEditProfile = async (profileData) => {
    try {
      const response = await profileAPI.updateProfile(profileData);
      if (response.success) {
        setUserData(response.data);
        showToast('success', 'Profile updated successfully!');
        closeModal('editProfile');
      } else {
        showToast('error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showToast('error', error.message || 'Error updating profile');
    }
  };

  const handleProfilePicChange = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const response = await profileAPI.uploadProfilePicture(file);
          if (response.success) {
            // Reload profile to get updated data
            await loadUserProfile();
            showToast('success', 'Profile picture uploaded successfully!');
          } else {
            showToast('error', response.message || 'Failed to upload profile picture');
          }
        } catch (error) {
          console.error('Profile picture upload error:', error);
          showToast('error', error.message || 'Error uploading profile picture');
        }
      }
    };
    input.click();
  };

  // Inline edit handler for per-field quick updates (called with newValue from inline input)
  const handleInlineEdit = async (field, newValue) => {
    try {
      const trimmed = (newValue || '').trim();
      if (!trimmed) {
        showToast('error', 'Value cannot be empty');
        return false;
      }

      // Map field to payload accepted by backend
      let payload = {};
      if (field === 'name') {
        const parts = trimmed.split(/\s+/);
        payload.firstName = parts[0] || '';
        payload.lastName = parts.slice(1).join(' ') || '';
      } else if (field === 'department') {
        payload.department = trimmed;
      } else if (field === 'contact') {
        payload.contact = trimmed;
      } else if (field === 'email') {
        // Backend doesn't support updating email here; show toast and keep editor open
        showToast('error', 'Email changes are not supported here. Use the Edit Profile form.');
        return false;
      } else {
        showToast('error', 'Unsupported field');
        return false;
      }

      const response = await profileAPI.updateProfile(payload);
      if (response.success) {
        setUserData(response.data);
        showToast('success', 'Updated successfully');
        return true;
      } else {
        showToast('error', response.message || 'Failed to update');
        return false;
      }
    } catch (error) {
      console.error('Inline update error:', error);
      showToast('error', error.message || 'Error updating');
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-red-50 to-red-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex flex-col items-stretch w-full max-w-6xl">
        {/* Page Header */}
        <div className="w-full max-w-5xl mx-auto mb-8">
          <div className="rounded-2xl bg-gradient-to-r from-red-700 to-red-800 text-white p-6 md:p-8 shadow-lg ring-1 ring-black/10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-red-100/90">Account</p>
                <h1 className="text-2xl md:text-3xl font-semibold">My Profile</h1>
                <p className="text-red-100 mt-1">Manage your account settings and preferences</p>
              </div>
              {userData?.email && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-red-50 border border-white/20">
                  {userData.email}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="w-full max-w-4xl mb-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
              <button 
                onClick={loadUserProfile}
                className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Profile Card */}
        {!loading && !error && userData && (
          <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* Stats Strip */}
            <ProfileStats stats={stats} />

            {/* Profile Card */}
            <ProfileCard
              userType="user"
              userData={{
                name: userData.profile?.fullName || `${userData.profile?.firstName || ''} ${userData.profile?.lastName || ''}`.trim() || userData.username,
                email: userData.email,
                department: userData.profile?.department || 'Not specified',
                contact: userData.profile?.contact || 'Not provided',
                profilePic: userData.profile?.profilePicture ? `http://localhost:5001${userData.profile.profilePicture}` : null,
                bio: userData.profile?.bio || '',
                position: userData.profile?.position || userData.role
              }}
              onPasswordChange={() => openModal('passwordChange')}
              onFeedback={() => openModal('feedback')}
              onReporting={() => openModal('reporting')}
              onProfilePicChange={handleProfilePicChange}
              onEditProfile={() => openModal('editProfile')}
              onInlineEdit={handleInlineEdit}
            />

            {/* Recent Activity */}
            <ProfileActivity items={myBookings.slice(0, 5)} />
          </div>
        )}

        {/* Modals */}
        {userData && (
          <>
            <PasswordChangeModal
              isOpen={modals.passwordChange}
              onClose={() => closeModal('passwordChange')}
              onSubmit={handlePasswordChange}
            />

            <FeedbackModal
              isOpen={modals.feedback}
              onClose={() => closeModal('feedback')}
              onSubmit={handleFeedback}
              type="feedback"
            />

            <FeedbackModal
              isOpen={modals.reporting}
              onClose={() => closeModal('reporting')}
              onSubmit={handleReporting}
              type="reporting"
            />

            <EditProfileModal
              isOpen={modals.editProfile}
              onClose={() => closeModal('editProfile')}
              onSubmit={handleEditProfile}
              userData={userData}
              userType="user"
            />
          </>
        )}

        {/* Toast Container */}
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </div>
  );
};

export default UserProfile;