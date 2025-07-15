// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = {
  baseURL: API_BASE_URL,
  
  /**
   * Custom fetch wrapper with authentication and error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise} - Promise that resolves to JSON response
   */
  fetch: async (endpoint, options = {}) => {
    // Prepare headers
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add auth token if available (check both localStorage and sessionStorage)
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Prepare fetch options
    const fetchOptions = {
      ...options,
      headers,
    };

    try {
      // Make the API request
      const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

      // Handle unauthorized
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        
        // Only redirect to login if we're not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized");
      }

      // Parse JSON response
      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        const error = new Error(data.detail || "API Error");
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Log errors
      console.error(`API Error (${endpoint}):`, error);

      // Pass the error up
      throw error;
    }
  },

  // Helper methods
  get: (endpoint, params = {}) => {
    // Build URL with query parameters
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    // Make GET request - use full URL string
    return api.fetch(url.toString().replace(API_BASE_URL, ''), { method: "GET" });
  },

  post: (endpoint, data = {}) => {
    return api.fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put: (endpoint, data = {}) => {
    return api.fetch(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: (endpoint) => {
    return api.fetch(endpoint, { method: "DELETE" });
  },
};

export default api;