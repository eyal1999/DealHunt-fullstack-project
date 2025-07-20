import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import profileService from "../api/profileService";
import { authService } from "../api/apiServices";
import { initProfilePageAnimations } from "../utils/scrollReveal";
import BackButton from "../components/common/BackButton";

const ProfilePage = () => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("profile"); // 'profile' or 'security'
  const [profileData, setProfileData] = useState({
    fullName: currentUser?.full_name || "",
    email: currentUser?.email || "",
  });

  // Update profile data when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        fullName: currentUser.full_name || "",
        email: currentUser.email || "",
      });
    }
  }, [currentUser]);

  const fileInputRef = useRef(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize profile page animations
  useEffect(() => {
    initProfilePageAnimations();
  }, []);

  // Get profile picture URL (preview or current)
  const getProfilePictureUrl = () => {
    // Show preview if available
    if (previewImage) {
      return previewImage;
    }
    
    // Show current user picture
    if (currentUser?.picture_url) {
      return profileService.getProfilePictureUrl(currentUser.picture_url);
    }
    
    // Show default avatar
    return profileService.getDefaultAvatar(currentUser?.full_name || 'User');
  };

  // Handle profile form input changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value,
    });

    // Clear errors when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }

    // Clear success message when any field is changed
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  // Handle password form input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });

    // Clear errors when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }

    // Clear success message when any field is changed
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  // Validate profile form
  const validateProfileForm = () => {
    const newErrors = {};

    if (!profileData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate password form
  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "New password must be at least 8 characters";
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (!validateProfileForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Upload profile picture if one was selected
      if (selectedFile) {
        setIsUploadingPicture(true);
        await profileService.uploadProfilePicture(selectedFile);
        setSelectedFile(null);
        setPreviewImage(null);
        setIsUploadingPicture(false);
      }

      // Update profile data (full name)
      if (profileData.fullName !== currentUser?.full_name) {
        await authService.updateProfile({
          full_name: profileData.fullName
        });
      }

      setSuccessMessage("Profile updated successfully!");
      
      // Force auth context to refresh user data if image was uploaded
      if (selectedFile) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Reload to refresh user data from updated storage
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      setErrors({ general: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      // Call the real API to change password
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccessMessage("Password updated successfully");

      // Reset password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Password update error:", error);
      setErrors({
        submit: error.message || "Failed to update password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile picture selection (preview only)
  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ profilePicture: 'Please select a valid image file' });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ profilePicture: 'Image size must be less than 5MB' });
      return;
    }

    // Clear errors and create preview
    setErrors({});
    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Clear success message when new file is selected
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  // Trigger file input click
  const handleChangePhotoClick = () => {
    fileInputRef.current?.click();
  };

  // Cancel photo selection
  const handleCancelPhotoSelection = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <div className="mb-4">
        <BackButton />
      </div>
      
      <h1 className="profile-header text-3xl font-bold mb-6">My Account</h1>

      {errors.general && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errors.general}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      <div className="profile-card bg-white rounded-lg shadow-md overflow-hidden">
        {/* Tabs */}
        <div className="profile-tabs flex border-b">
          <button
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "profile"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            Profile Information
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "security"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("security")}
          >
            Security
          </button>
        </div>

        <div className="profile-content p-6">
          {/* Profile Information */}
          {activeTab === "profile" && (
            <div>
              <div className="profile-picture-section flex flex-col sm:flex-row items-start sm:items-center mb-6">
                <div className="mb-4 sm:mb-0 sm:mr-6">
                  <div className="profile-picture w-24 h-24 rounded-full overflow-hidden bg-gray-200 relative">
                    <img
                      src={getProfilePictureUrl()}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = profileService.getDefaultAvatar(currentUser?.full_name || 'User');
                      }}
                    />
                    {isUploadingPicture && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-xs">Uploading...</div>
                      </div>
                    )}
                    {previewImage && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">
                    {currentUser?.full_name || currentUser?.fullName}
                  </h2>
                  <p className="text-gray-600 mb-3">{currentUser?.email}</p>
                  <div>
                    <button 
                      onClick={handleChangePhotoClick}
                      disabled={isUploadingPicture}
                      className="text-primary text-sm hover:underline disabled:opacity-50"
                    >
                      {selectedFile ? 'Choose different photo' : 'Change profile photo'}
                    </button>
                    {selectedFile && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          📁 {selectedFile.name} selected
                        </p>
                        <button
                          type="button"
                          onClick={handleCancelPhotoSelection}
                          className="text-red-500 text-xs hover:underline mt-1"
                        >
                          Cancel selection
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                  </div>
                  {errors.profilePicture && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.profilePicture}
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={handleProfileUpdate}>
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={profileData.fullName}
                      onChange={handleProfileChange}
                      className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.fullName ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileData.email}
                      readOnly
                      disabled
                      className="w-full p-3 border rounded border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-gray-500 text-sm mt-1">
                      Email address cannot be changed
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading || isUploadingPicture}
                      className={`bg-primary text-white px-6 py-2 rounded font-medium ${
                        isLoading || isUploadingPicture
                          ? "opacity-70 cursor-not-allowed"
                          : "hover:bg-blue-700"
                      }`}
                    >
                      {isUploadingPicture ? "Uploading image..." : isLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>
              <form onSubmit={handlePasswordUpdate}>
                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.currentPassword
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.currentPassword && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.newPassword
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.newPassword && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.confirmPassword
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Submit error */}
                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {errors.submit}
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`bg-primary text-white px-6 py-2 rounded font-medium ${
                        isLoading
                          ? "opacity-70 cursor-not-allowed"
                          : "hover:bg-blue-700"
                      }`}
                    >
                      {isLoading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Removed "Account Actions" section with "Logout from all devices" button */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
