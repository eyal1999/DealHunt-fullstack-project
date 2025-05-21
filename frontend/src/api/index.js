// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Custom fetch wrapper with authentication and error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise} - Promise that resolves to JSON response
 */
const apiFetch = async (endpoint, options = {}) => {
  // Prepare headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add auth token if available
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Prepare fetch options
  const fetchOptions = {
    ...options,
    headers,
  };

  // Handle timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
  fetchOptions.signal = controller.signal;

  try {
    // Make the API request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

    // Clear timeout
    clearTimeout(timeoutId);

    // Handle unauthorized
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
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
    // Handle fetch errors
    if (error.name === "AbortError") {
      throw new Error("Request timeout");
    }

    // Log errors
    console.error(`API Error (${endpoint}):`, error);

    // Pass the error up
    throw error;
  }
};

/**
 * API helper functions
 */
const api = {
  get: (endpoint, params = {}) => {
    // Build URL with query parameters
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    // Make GET request
    return apiFetch(url.pathname + url.search, { method: "GET" });
  },

  post: (endpoint, data = {}) => {
    return apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put: (endpoint, data = {}) => {
    return apiFetch(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: (endpoint) => {
    return apiFetch(endpoint, { method: "DELETE" });
  },
};

export default api;
