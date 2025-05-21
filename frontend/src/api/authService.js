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
      // Create form data format for OAuth2 endpoint
      const formData = new FormData();
      formData.append("username", email); // FastAPI OAuth2 uses 'username' field
      formData.append("password", password);

      // Send login request to backend
      const response = await fetch(`${api.baseURL}/auth/login`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      console.log(data)
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
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise} - Promise that resolves to registration result
   */
  register: async (userData) => {
    try {
      const response = await fetch(`${api.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userData.email,
          full_name: userData.fullName, // Adapt field name to match backend
          password: userData.password
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }
      
      return await response.json();
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
    localStorage.removeItem("user");
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
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
  }
};

export default authService;