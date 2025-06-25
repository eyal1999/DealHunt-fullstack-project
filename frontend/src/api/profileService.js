import api from './index.js';

/**
 * Profile picture management service
 */
const profileService = {
  /**
   * Upload a new profile picture
   * @param {File} file - The image file to upload
   * @returns {Promise} Response with the new picture URL
   */
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${api.baseURL}/auth/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Profile picture upload error:', error);
      throw error;
    }
  },

  /**
   * Get full URL for profile picture
   * @param {string} pictureUrl - The relative picture URL from the backend
   * @returns {string} Full URL for the picture
   */
  getProfilePictureUrl: (pictureUrl) => {
    if (!pictureUrl) return null;
    
    // If it's already a full URL (like Google profile pictures), return as is
    if (pictureUrl.startsWith('http')) {
      return pictureUrl;
    }
    
    // For local uploads, prepend the API base URL
    return `${api.baseURL}${pictureUrl}`;
  },

  /**
   * Get default avatar URL
   * @param {string} fullName - User's full name for generating initials
   * @returns {string} Default avatar URL
   */
  getDefaultAvatar: (fullName) => {
    const initials = fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=3b82f6&color=ffffff&size=300`;
  }
};

export default profileService;