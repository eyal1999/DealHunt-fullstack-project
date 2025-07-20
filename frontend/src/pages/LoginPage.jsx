// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { useAutoWishlist } from "../hooks/useAutoWishlist";
import { initLoginPageAnimations } from "../utils/scrollReveal";
import authService from "../api/authService";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    googleSignIn,
    isAuthenticated,
    error: authError,
    clearError,
  } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);
  const emailForResend = useRef("");

  // Get the redirect information from location state
  const from = location.state?.from || "/";
  const [redirectMessage, setRedirectMessage] = useState(location.state?.message);
  const redirectAction = location.state?.action;
  const productTitle = location.state?.productTitle;

  // Enable auto-wishlist functionality
  useAutoWishlist();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Clear errors only when component mounts
  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove clearError from dependencies to prevent clearing on every render
  
  // Clear registration message when verification error appears
  useEffect(() => {
    if (authError && authError.includes("Email verification required")) {
      setRedirectMessage(null);
      setShowVerificationWarning(true);
    }
  }, [authError]);

  // Initialize login page animations
  useEffect(() => {
    initLoginPageAnimations();
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle regular email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setShowVerificationWarning(false);
    clearError();

    // Store email for potential resend (survives component re-mounting)
    sessionStorage.setItem('loginEmail', formData.email);
    emailForResend.current = formData.email;
    
    const result = await login(formData.email, formData.password, formData.rememberMe);

    setIsLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else if (result.isVerificationRequired) {
      setShowVerificationWarning(true);
      setRedirectMessage(null);
    }
    // Error handling is done through the auth context
  };

  // Handle Google Sign-In success
  const handleGoogleSuccess = async (googleIdToken) => {
    setIsGoogleLoading(true);
    clearError();

    console.log("🔵 LoginPage: Google Sign-In initiated");

    const result = await googleSignIn(googleIdToken, formData.rememberMe);

    setIsGoogleLoading(false);

    if (result.success) {
      console.log("✅ LoginPage: Google Sign-In successful, redirecting...");
      navigate(from, { replace: true });
    } else {
      console.error("❌ LoginPage: Google Sign-In failed:", result.error);
    }
  };

  // Handle Google Sign-In error
  const handleGoogleError = (error) => {
    console.error("❌ LoginPage: Google Sign-In error:", error);
    setIsGoogleLoading(false);
    // The error will be shown through the auth context
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="login-header">
          <h2 className="login-title mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>

          {/* Show redirect messages */}
          {redirectMessage && (
            <div className="login-message mt-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
              {redirectMessage}
            </div>
          )}

          {redirectAction && (
            <div className="login-message mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              Please sign in to {redirectAction}
              {productTitle && (
                <span className="font-medium"> "{productTitle}"</span>
              )}
            </div>
          )}

          <p className="login-subtitle mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Google Sign-In Button */}
          <div className="google-signin-section">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              buttonText="Sign in with Google"
              loadingText="Signing in..."
              disabled={isLoading || isGoogleLoading}
            />
          </div>

          {/* Divider */}
          <div className="login-divider relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Error Display */}
          {authError && !authError.includes("Email verification required") && (
            <div className="login-error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {authError}
            </div>
          )}
          
          {/* Email Verification Required */}
          {showVerificationWarning && (
            <div className="verification-required bg-yellow-50 border border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">Email Verification Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please verify your email address before logging in. Check your inbox for the verification link.
                  </p>
                  <p className="text-sm text-yellow-700 mt-2">
                    Didn't receive the email? Check your spam folder or click below to resend.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const emailToUse = emailForResend.current || formData.email || sessionStorage.getItem('loginEmail');
                        
                        if (!emailToUse) {
                          alert('No email address available. Please try logging in again.');
                          return;
                        }
                        
                        const response = await authService.resendVerificationEmail(emailToUse);
                        alert(response.message || 'Verification email sent!');
                      } catch (error) {
                        alert(error.message || 'Failed to resend verification email');
                      }
                    }}
                    className="mt-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm font-medium px-4 py-2 rounded border border-yellow-300 transition-colors"
                  >
                    Resend Verification Email
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email/Password Form */}
          <form className="login-form space-y-6" onSubmit={handleSubmit}>
            <div className="form-field">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="form-field">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="form-options flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div className="submit-button">
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                  isLoading || isGoogleLoading
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>

          {/* Sign up link */}
          <div className="text-center">
            <span className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-medium text-primary hover:text-blue-500"
              >
                Sign up here
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
