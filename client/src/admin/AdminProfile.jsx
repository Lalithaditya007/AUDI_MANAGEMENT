import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProfileCard from '../components/profile/ProfileCard';
import PasswordChangeModal from '../components/profile/PasswordChangeModal';
import FeedbackModal from '../components/profile/FeedbackModal';
import EditProfileModal from '../components/profile/EditProfileModal';
import { profileAPI } from '../services/profileAPI';

const AdminProfile = () => {
  const [modals, setModals] = useState({
    passwordChange: false,
    feedback: false,
    reporting: false,
    editProfile: false
  });

  // Admin data state - replace with actual admin data from API
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Load admin profile data
  useEffect(() => {
    loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      if (response.success) {
        setAdminData(response.data);
      } else {
        setError('Failed to load profile data');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError(error.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

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
      console.log('Admin password change request data:', passwordData);
      const response = await profileAPI.changePassword(passwordData);
      console.log('Admin password change response:', response);
      if (response.success) {
        showToast('success', 'Password changed successfully!');
        closeModal('passwordChange');
      } else {
        console.error('Admin password change failed:', response);
        showToast('error', response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Admin password change error:', error);
      showToast('error', error.message || 'Error changing password');
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
        setAdminData(response.data);
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
            await loadAdminProfile();
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

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 flex flex-col items-center">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Profile</h1>
          <p className="text-gray-600">Manage your administrative account settings</p>
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
                onClick={loadAdminProfile}
                className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Profile Card */}
        {!loading && !error && adminData && (
          <div className="w-full max-w-4xl">
            <ProfileCard
              userType="admin"
              userData={{
                name: adminData.profile?.fullName || `${adminData.profile?.firstName || ''} ${adminData.profile?.lastName || ''}`.trim() || adminData.username,
                email: adminData.email,
                department: adminData.profile?.department || 'Administration',
                contact: adminData.profile?.contact || 'Not provided',
                profilePic: adminData.profile?.profilePicture ? `http://localhost:5001${adminData.profile.profilePicture}` : null,
                bio: adminData.profile?.bio || '',
                position: adminData.profile?.position || adminData.role
              }}
              onPasswordChange={() => openModal('passwordChange')}
              onFeedback={() => openModal('feedback')}
              onReporting={() => openModal('reporting')}
              onProfilePicChange={handleProfilePicChange}
              onEditProfile={() => openModal('editProfile')}
            />
          </div>
        )}

        {/* Modals */}
        {adminData && (
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
              userData={adminData}
              userType="admin"
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

export default AdminProfile;