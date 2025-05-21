import api from "./index";

const authService = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - Promise that resolves to user data and token
   */
  login: async (email, password) => {
    try {
      const data = await api.post("/auth/login", { email, password });
      // Save token to localStorage
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise} - Promise that resolves to registration result
   */
  register: async (userData) => {
    try {
      return await api.post("/auth/register", userData);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem("token");
  },

  /**
   * Get current user data
   * @returns {Promise} - Promise that resolves to current user data
   */
  getCurrentUser: async () => {
    try {
      return await api.get("/auth/me");
    } catch (error) {
      console.error("Error fetching current user:", error);
      throw error;
    }
  },

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise} - Promise that resolves to password reset request result
   */
  requestPasswordReset: async (email) => {
    try {
      return await api.post("/auth/forgot-password", { email });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      throw error;
    }
  },

  /**
   * Reset password
   * @param {string} token - Password reset token
   * @param {string} password - New password
   * @returns {Promise} - Promise that resolves to password reset result
   */
  resetPassword: async (token, password) => {
    try {
      return await api.post("/auth/reset-password", { token, password });
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  },
};

export default authService;
