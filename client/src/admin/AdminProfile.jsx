import React, { useState } from 'react';
import ProfileCard from '../components/profile/ProfileCard';
import PasswordChangeModal from '../components/profile/PasswordChangeModal';
import FeedbackModal from '../components/profile/FeedbackModal';
import EditProfileModal from '../components/profile/EditProfileModal';

const AdminProfile = () => {
  const [modals, setModals] = useState({
    passwordChange: false,
    feedback: false,
    reporting: false,
    editProfile: false
  });

  // Mock admin data - replace with actual admin data from context/props
  const [adminData, setAdminData] = useState({
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@college.edu',
    department: 'Administration',
    contact: '+91 9876543210',
    profilePic: null // Will be null if no profile picture is uploaded
  });

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

  const handleEditProfile = (profileData) => {
    console.log('Admin profile update data:', profileData);
    // TODO: Implement admin profile update API call
    setAdminData(prevData => ({
      ...prevData,
      ...profileData
    }));
    alert('Profile updated successfully! (Frontend only)');
    closeModal('editProfile');
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
    <div className="min-h-screen bg-white py-8">
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
            onEditProfile={() => openModal('editProfile')}
          />
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

        <EditProfileModal
          isOpen={modals.editProfile}
          onClose={() => closeModal('editProfile')}
          onSubmit={handleEditProfile}
          userData={adminData}
          userType="admin"
        />
      </div>
    </div>
  );
};

export default AdminProfile;