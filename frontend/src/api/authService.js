// frontend/src/api/authService.js
import api from "./index";

const authService = {
  /**
   * Set storage method based on remember me setting
   * @param {boolean} rememberMe - Whether to use persistent storage
   * @param {string} key - Storage key
   * @param {string} value - Storage value
   */
  setStorage: (rememberMe, key, value) => {
    if (rememberMe) {
      // Use localStorage for persistent storage (survives browser restart)
      localStorage.setItem(key, value);
      // Remove from sessionStorage if it exists
      sessionStorage.removeItem(key);
    } else {
      // Use sessionStorage for temporary storage (cleared on browser close)
      sessionStorage.setItem(key, value);
      // Remove from localStorage if it exists
      localStorage.removeItem(key);
    }
  },

  /**
   * Get value from either storage method
   * @param {string} key - Storage key
   * @returns {string|null} - Storage value or null
   */
  getStorage: (key) => {
    // Check localStorage first, then sessionStorage
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },

  /**
   * Remove value from both storage methods
   * @param {string} key - Storage key
   */
  removeStorage: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },

  /**
   * Login user with email/password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {boolean} rememberMe - Whether to persist login across browser sessions
   * @returns {Promise} - Promise that resolves to user data and token
   */
  login: async (email, password, rememberMe = false) => {
    try {
      // Create form data format for OAuth2 endpoint
      const formData = new FormData();
      formData.append("username", email); // FastAPI OAuth2 uses 'username' field
      formData.append("password", password);

      // Send login request to backend
      const response = await fetch(`${api.baseURL}/auth/login`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log("🚫 authService - Login failed:", {
          status: response.status,
          errorData: errorData,
          detail: errorData.detail
        });
        
        // Special handling for email verification required
        if (response.status === 403 && errorData.detail?.includes("Email verification required")) {
          console.log("📧 authService - Email verification required detected");
          const verificationError = new Error(errorData.detail);
          verificationError.isVerificationRequired = true;
          verificationError.email = email;
          throw verificationError;
        }
        
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await response.json();
      console.log(data);

      // Save token using appropriate storage method based on rememberMe
      if (data.access_token) {
        authService.setStorage(rememberMe, "token", data.access_token);
        authService.setStorage(rememberMe, "user", JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  /**
   * Sign in with Google ID token (existing users only)
   * @param {string} googleIdToken - Google ID token from Google Sign-In
   * @param {boolean} rememberMe - Whether to persist login across browser sessions
   * @returns {Promise} - Promise that resolves to user data and token
   */
  googleSignIn: async (googleIdToken, rememberMe = true) => {
    try {
      console.log("🔵 Starting Google Sign-In with backend...");

      const response = await fetch(`${api.baseURL}/auth/google/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_token: googleIdToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Google Sign-In API error:", errorData);
        throw new Error(errorData.detail || "Google Sign-In failed");
      }

      const data = await response.json();
      console.log("✅ Google Sign-In successful:", data);

      // Save token using appropriate storage based on rememberMe setting
      if (data.access_token) {
        authService.setStorage(rememberMe, "token", data.access_token);
        authService.setStorage(rememberMe, "user", JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error("❌ Google Sign-In error:", error);
      throw error;
    }
  },

  /**
   * Register with Google ID token (new users only)
   * @param {string} googleIdToken - Google ID token from Google Sign-In
   * @param {boolean} rememberMe - Whether to persist login across browser sessions
   * @returns {Promise} - Promise that resolves to user data and token
   */
  googleRegister: async (googleIdToken, rememberMe = true) => {
    try {
      console.log("🔵 Starting Google Registration with backend...");

      const response = await fetch(`${api.baseURL}/auth/google/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_token: googleIdToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Google Registration API error:", errorData);
        throw new Error(errorData.detail || "Google Registration failed");
      }

      const data = await response.json();
      console.log("✅ Google Registration successful:", data);

      // Save token using appropriate storage based on rememberMe setting
      if (data.access_token) {
        authService.setStorage(rememberMe, "token", data.access_token);
        authService.setStorage(rememberMe, "user", JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error("❌ Google Registration error:", error);
      throw error;
    }
  },

  /**
   * Register new user with email/password
   * @param {Object} userData - User registration data
   * @returns {Promise} - Promise that resolves to registration result
   */
  register: async (userData) => {
    try {
      const response = await fetch(`${api.baseURL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userData.email,
          full_name: userData.fullName, // Adapt field name to match backend
          password: userData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Registration failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  /**
   * Link Google account to current authenticated user
   * @param {string} googleIdToken - Google ID token
   * @returns {Promise} - Promise that resolves to link result
   */
  linkGoogleAccount: async (googleIdToken) => {
    try {
      const token = authService.getStorage("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${api.baseURL}/auth/google/link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_token: googleIdToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to link Google account");
      }

      return await response.json();
    } catch (error) {
      console.error("Link Google account error:", error);
      throw error;
    }
  },

  /**
   * Unlink Google account from current authenticated user
   * @returns {Promise} - Promise that resolves to unlink result
   */
  unlinkGoogleAccount: async () => {
    try {
      const token = authService.getStorage("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${api.baseURL}/auth/google/unlink`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to unlink Google account");
      }

      return await response.json();
    } catch (error) {
      console.error("Unlink Google account error:", error);
      throw error;
    }
  },

  /**
   * Get Google OAuth configuration
   * @returns {Promise} - Promise that resolves to Google config
   */
  getGoogleConfig: async () => {
    try {
      const response = await fetch(`${api.baseURL}/auth/google/config`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to get Google configuration"
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Get Google config error:", error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    authService.removeStorage("token");
    authService.removeStorage("user");

    // Also sign out from Google if they're signed in
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (error) {
        console.warn("Could not disable Google auto-select:", error);
      }
    }
  },

  /**
   * Get current user data
   * @returns {Promise} - Promise that resolves to current user data
   */
  getCurrentUser: async () => {
    try {
      const token = authService.getStorage("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${api.baseURL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          authService.logout();
          throw new Error("Session expired. Please login again.");
        }
        throw new Error("Failed to get user data");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching current user:", error);
      throw error;
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} - True if user is authenticated
   */
  isAuthenticated: () => {
    return authService.getStorage("token") !== null;
  },

  /**
   * Update user notification preferences
   * @param {Object} preferences - Notification preferences object
   * @returns {Promise} - Promise that resolves to updated preferences
   */
  updateNotificationPreferences: async (preferences) => {
    try {
      const token = authService.getStorage("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${api.baseURL}/auth/notification-preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update notification preferences");
      }

      return await response.json();
    } catch (error) {
      console.error("Update notification preferences error:", error);
      throw error;
    }
  },

  /**
   * Change user password
   * @param {Object} passwordData - Password change data
   * @returns {Promise} - Promise that resolves to success message
   */
  changePassword: async (passwordData) => {
    try {
      const token = authService.getStorage("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${api.baseURL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to change password");
      }

      return await response.json();
    } catch (error) {
      console.error("Change password error:", error);
      throw error;
    }
  },

  /**
   * Update user profile (full name)
   * @param {Object} profileData - Profile data object
   * @returns {Promise} - Promise that resolves to updated user data
   */
  updateProfile: async (profileData) => {
    try {
      const token = authService.getStorage("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${api.baseURL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update profile");
      }

      const updatedUser = await response.json();
      
      // Update stored user data
      const currentUser = authService.getStorage("user");
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        const updatedUserData = { ...userData, ...updatedUser };
        authService.setStorage(
          localStorage.getItem("token") ? true : false,
          "user",
          JSON.stringify(updatedUserData)
        );
      }

      return updatedUser;
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  },

  /**
   * Send email verification link
   * @param {string} email - User's email address
   * @returns {Promise} - Promise that resolves to success message
   */
  sendVerificationEmail: async (email) => {
    try {
      const response = await fetch(`${api.baseURL}/auth/send-verification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to send verification email");
      }

      return await response.json();
    } catch (error) {
      console.error("Send verification email error:", error);
      throw error;
    }
  },

  /**
   * Verify email with token
   * @param {string} token - Email verification token
   * @returns {Promise} - Promise that resolves to success message
   */
  verifyEmail: async (token) => {
    try {
      const response = await fetch(`${api.baseURL}/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to verify email");
      }

      return await response.json();
    } catch (error) {
      console.error("Verify email error:", error);
      throw error;
    }
  },

  /**
   * Resend email verification link
   * @param {string} email - User's email address
   * @returns {Promise} - Promise that resolves to success message
   */
  resendVerificationEmail: async (email) => {
    try {
      const response = await fetch(`${api.baseURL}/auth/resend-verification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to resend verification email");
      }

      return await response.json();
    } catch (error) {
      console.error("Resend verification email error:", error);
      throw error;
    }
  },
};

export default authService;
