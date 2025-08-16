import React, { useState } from 'react';
import ProfileCard from '../components/profile/ProfileCard';
import PasswordChangeModal from '../components/profile/PasswordChangeModal';
import FeedbackModal from '../components/profile/FeedbackModal';
import EditProfileModal from '../components/profile/EditProfileModal';

const UserProfile = () => {
  const [modals, setModals] = useState({
    passwordChange: false,
    feedback: false,
    reporting: false,
    editProfile: false
  });

  // Mock user data - replace with actual user data from context/props
  const [userData, setUserData] = useState({
    name: 'John Doe',
    email: 'john.doe@college.edu',
    department: 'Computer Science Engineering',
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
    console.log('Password change data:', passwordData);
    // TODO: Implement password change API call
    alert('Password change functionality will be implemented with backend integration');
    closeModal('passwordChange');
  };

  const handleFeedback = (feedbackData) => {
    console.log('Feedback data:', feedbackData);
    // TODO: Implement feedback submission API call
    alert('Feedback submitted successfully! (Frontend only)');
    closeModal('feedback');
  };

  const handleReporting = (reportData) => {
    console.log('Report data:', reportData);
    // TODO: Implement reporting API call
    alert('Report submitted successfully! (Frontend only)');
    closeModal('reporting');
  };

  const handleEditProfile = (profileData) => {
    console.log('User profile update data:', profileData);
    // TODO: Implement user profile update API call
    setUserData(prevData => ({
      ...prevData,
      ...profileData
    }));
    alert('Profile updated successfully! (Frontend only)');
    closeModal('editProfile');
  };

  const handleProfilePicChange = () => {
    // TODO: Implement profile picture upload
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="w-full max-w-4xl">
          <ProfileCard
            userType="user"
            userData={userData}
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
          userData={userData}
          userType="user"
        />
      </div>
    </div>
  );
};

export default UserProfile;