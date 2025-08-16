import React, { useState } from 'react';
import ProfileCard from '../components/profile/ProfileCard';
import PasswordChangeModal from '../components/profile/PasswordChangeModal';
import FeedbackModal from '../components/profile/FeedbackModal';

const AdminProfile = () => {
  const [modals, setModals] = useState({
    passwordChange: false,
    feedback: false,
    reporting: false
  });

  // Mock admin data - replace with actual admin data from context/props
  const adminData = {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@college.edu',
    department: 'Administration',
    contact: '+91 9876543210',
    profilePic: null // Will be null if no profile picture is uploaded
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

  const handlePasswordChange = (passwordData) => {
    console.log('Admin password change data:', passwordData);
    // TODO: Implement admin password change API call
    alert('Password change functionality will be implemented with backend integration');
    closeModal('passwordChange');
  };

  const handleFeedback = (feedbackData) => {
    console.log('Admin feedback data:', feedbackData);
    // TODO: Implement admin feedback submission API call
    alert('Feedback submitted successfully! (Frontend only)');
    closeModal('feedback');
  };

  const handleReporting = (reportData) => {
    console.log('Admin report data:', reportData);
    // TODO: Implement admin reporting API call
    alert('Report submitted successfully! (Frontend only)');
    closeModal('reporting');
  };

  const handleProfilePicChange = () => {
    // TODO: Implement admin profile picture upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        console.log('Selected file:', file);
        // TODO: Upload file and update profile picture
        alert('Profile picture upload will be implemented with backend integration');
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="container mx-auto px-4 flex flex-col items-center">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 mt-20">Admin Profile</h1>
          <p className="text-gray-600">Manage your administrative account settings</p>
        </div>

        {/* Profile Card */}
        <div className="w-full max-w-4xl">
          <ProfileCard
            userType="admin"
            userData={adminData}
            onPasswordChange={() => openModal('passwordChange')}
            onFeedback={() => openModal('feedback')}
            onReporting={() => openModal('reporting')}
            onProfilePicChange={handleProfilePicChange}
          />
        </div>

        {/* Admin-specific Information */}
        <div className="mt-8 w-full max-w-4xl relative">
          {/* Glassmorphism background */}
          <div className="absolute inset-0 bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl"></div>
          {/* Content */}
          <div className="relative z-10 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Admin Privileges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-medium text-blue-800 mb-2">User Management</h3>
                <p className="text-sm text-gray-600">Create, edit, and manage user accounts</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-medium text-green-800 mb-2">Booking Management</h3>
                <p className="text-sm text-gray-600">Approve, reject, and modify bookings</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-medium text-purple-800 mb-2">System Control</h3>
                <p className="text-sm text-gray-600">Access to system settings and configurations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
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
      </div>
    </div>
  );
};

export default AdminProfile;