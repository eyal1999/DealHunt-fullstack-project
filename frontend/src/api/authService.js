// frontend/src/api/authService.js
import api from "./index";

const authService = {
  /**
   * Login user with email/password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - Promise that resolves to user data and token
   */
  login: async (email, password) => {
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
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await response.json();
      console.log(data);

      // Save token to localStorage
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
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
   * @returns {Promise} - Promise that resolves to user data and token
   */
  googleSignIn: async (googleIdToken) => {
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

      // Save token to localStorage (same as regular login)
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
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
   * @returns {Promise} - Promise that resolves to user data and token
   */
  googleRegister: async (googleIdToken) => {
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

      // Save token to localStorage (same as regular registration)
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
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
      const token = localStorage.getItem("token");

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
      const token = localStorage.getItem("token");

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
    localStorage.removeItem("token");
    localStorage.removeItem("user");

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
      const token = localStorage.getItem("token");

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
    return localStorage.getItem("token") !== null;
  },
};

export default authService;
