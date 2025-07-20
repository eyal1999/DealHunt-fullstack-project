// frontend/src/contexts/AuthContext.jsx
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

  // Load user data from storage on initial render
  useEffect(() => {
    const loadUser = async () => {
      const token = authService.getStorage("token");
      const userData = authService.getStorage("user");

      if (token && userData) {
        try {
          // Set user from storage initially
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

  // Regular email/password login function
  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null);
      setLoading(true);

      console.log("🔵 AuthContext - Login attempt for:", email);
      const data = await authService.login(email, password, rememberMe);

      setCurrentUser(data.user);
      return { success: true };
    } catch (err) {
      console.log("❌ AuthContext - Login error caught:", err);
      console.log("  - Error message:", err.message);
      console.log("  - Is verification required?", err.isVerificationRequired);
      
      setError(err.message || "Login failed");
      
      // Pass verification required information if available
      const errorResult = { 
        success: false, 
        error: err.message,
        isVerificationRequired: err.isVerificationRequired || false,
        email: err.email
      };
      
      return errorResult;
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In function (existing users only)
  const googleSignIn = async (googleIdToken, rememberMe = true) => {
    try {
      setError(null);
      setLoading(true);

      console.log("🔵 AuthContext: Starting Google Sign-In...");

      const data = await authService.googleSignIn(googleIdToken, rememberMe);

      console.log("✅ AuthContext: Google Sign-In successful", data);
      setCurrentUser(data.user);

      return { success: true, user: data.user };
    } catch (err) {
      console.error("❌ AuthContext: Google Sign-In failed", err);
      setError(err.message || "Google Sign-In failed");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Google Register function (new users only)
  const googleRegister = async (googleIdToken, rememberMe = true) => {
    try {
      setError(null);
      setLoading(true);

      console.log("🔵 AuthContext: Starting Google Registration...");

      const data = await authService.googleRegister(googleIdToken, rememberMe);

      console.log("✅ AuthContext: Google Registration successful", data);
      setCurrentUser(data.user);

      return { success: true, user: data.user };
    } catch (err) {
      console.error("❌ AuthContext: Google Registration failed", err);
      setError(err.message || "Google Registration failed");
      return { success: false, error: err.message };
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

  // Link Google account to existing user
  const linkGoogleAccount = async (googleIdToken) => {
    try {
      setError(null);
      setLoading(true);

      await authService.linkGoogleAccount(googleIdToken);

      // Refresh user data to show linked Google account
      const refreshedUser = await authService.getCurrentUser();
      setCurrentUser(refreshedUser);

      return { success: true };
    } catch (err) {
      setError(err.message || "Failed to link Google account");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Unlink Google account from current user
  const unlinkGoogleAccount = async () => {
    try {
      setError(null);
      setLoading(true);

      await authService.unlinkGoogleAccount();

      // Refresh user data to show unlinked Google account
      const refreshedUser = await authService.getCurrentUser();
      setCurrentUser(refreshedUser);

      return { success: true };
    } catch (err) {
      setError(err.message || "Failed to unlink Google account");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    setError(null);
  };

  // Clear error function
  const clearError = () => {
    console.log("🧹 AuthContext - clearError called, current error:", error);
    console.trace("clearError call stack");
    setError(null);
  };

  // Check if user has Google account linked
  const hasGoogleLinked = () => {
    return (
      currentUser?.auth_provider === "google" ||
      currentUser?.auth_provider === "both"
    );
  };

  // Check if user can unlink Google (has password set)
  const canUnlinkGoogle = () => {
    return currentUser?.auth_provider === "both";
  };

  // Value object to be provided by context
  const value = {
    currentUser,
    loading,
    error,

    // Authentication methods
    login,
    googleSignIn,
    googleRegister,
    register,
    logout,

    // Google account management
    linkGoogleAccount,
    unlinkGoogleAccount,

    // Helper functions
    clearError,
    hasGoogleLinked,
    canUnlinkGoogle,

    // Status checks
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
