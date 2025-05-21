import React, { createContext, useState, useContext, useEffect } from "react";
import { authService } from "../api/apiServices";

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data from localStorage on initial render
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        try {
          // Set user from localStorage initially
          setCurrentUser(JSON.parse(userData));
          
          // Then verify token validity by calling the API
          const freshUserData = await authService.getCurrentUser();
          setCurrentUser(freshUserData);
        } catch (err) {
          console.error("Failed to load user:", err);
          // Clear invalid auth data
          authService.logout();
          setCurrentUser(null);
        }
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const data = await authService.login(email, password);
      
      setCurrentUser(data.user);
      return true;
    } catch (err) {
      setError(err.message || "Login failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);

      await authService.register(userData);
      return { success: true };
    } catch (err) {
      setError(err.message || "Registration failed");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Value object to be provided by context
  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;