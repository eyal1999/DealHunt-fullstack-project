// frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { initRegisterPageAnimations } from "../utils/scrollReveal";

const RegisterPage = () => {
  const navigate = useNavigate();
  const {
    register,
    googleRegister,
    isAuthenticated,
    error: authError,
    clearError,
  } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Initialize register page animations
  useEffect(() => {
    initRegisterPageAnimations();
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

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Terms acceptance
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission for email/password registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    clearError();

    // Prepare user data for registration
    const userData = {
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
    };

    // Call register function from auth context
    const result = await register(userData);

    setIsLoading(false);

    if (result.success) {
      // Redirect to login page with success message
      navigate("/login", {
        state: {
          message:
            "Registration successful! Please sign in with your new account.",
        },
      });
    }
    // Error handling is done through the auth context
  };

  // Handle Google Registration success (creates new account only)
  const handleGoogleSuccess = async (googleIdToken) => {
    setIsGoogleLoading(true);
    clearError();

    console.log("🔵 RegisterPage: Google Registration initiated");

    const result = await googleRegister(googleIdToken, true); // Default to persistent for registration

    setIsGoogleLoading(false);

    if (result.success) {
      console.log("✅ RegisterPage: Google Registration successful, redirecting...");
      // Redirect to home page after successful Google registration
      navigate("/", { replace: true });
    } else {
      console.error("❌ RegisterPage: Google Registration failed:", result.error);
    }
  };

  // Handle Google Registration error
  const handleGoogleError = (error) => {
    console.error("❌ RegisterPage: Google Registration error:", error);
    setIsGoogleLoading(false);
    // The error will be shown through the auth context
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="register-header">
          <h2 className="register-title mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="register-subtitle mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Google Registration Button */}
          <div className="google-signup-section">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              buttonText="Sign up with Google"
              loadingText="Creating account..."
              disabled={isLoading || isGoogleLoading}
            />
            <p className="mt-2 text-xs text-gray-500 text-center">
              Quick and secure - no password needed
            </p>
          </div>

          {/* Divider */}
          <div className="register-divider relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Or sign up with email
              </span>
            </div>
          </div>

          {/* Error Display */}
          {authError && (
            <div className="register-error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {authError}
            </div>
          )}

          {/* Registration Form */}
          <form className="register-form space-y-6" onSubmit={handleSubmit}>
            <div className="form-field">
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                value={formData.fullName}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.fullName ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

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
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Create a password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="form-field">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.confirmPassword ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label
                htmlFor="acceptTerms"
                className="ml-2 block text-sm text-gray-900"
              >
                I agree to the{" "}
                <Link to="/terms" className="text-primary hover:text-blue-500">
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-primary hover:text-blue-500"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-red-600">{errors.acceptTerms}</p>
            )}

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
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>
            </div>
          </form>

          {/* Sign in link */}
          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-blue-500"
              >
                Sign in here
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
