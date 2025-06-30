import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/index";
import { initForgotPasswordPageAnimations } from "../utils/scrollReveal";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Initialize forgot password page animations
  useEffect(() => {
    initForgotPasswordPageAnimations();
  }, []);

  // Handle email input change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);

    // Clear error when field is edited
    if (errors.email) {
      setErrors({});
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setIsSubmitted(true);
    } catch (error) {
      setErrors({ general: error.data?.detail || 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="forgot-header text-center mb-8">
        <h1 className="forgot-title text-3xl font-bold text-gray-800 mb-2">
          Forgot Password
        </h1>
        <p className="forgot-subtitle text-gray-600">
          {isSubmitted
            ? "Check your email for password reset instructions"
            : "Enter your email address to receive password reset instructions"}
        </p>
      </div>

      {errors.general && (
        <div className="forgot-error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errors.general}
        </div>
      )}

      {isSubmitted ? (
        <div className="success-message bg-white rounded-lg shadow-md p-6 text-center">
          <svg
            className="w-16 h-16 text-green-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Email Sent</h2>
          <p className="text-gray-600 mb-6">
            We've sent a password reset link to <strong>{email}</strong>. Please
            check your email and follow the instructions to reset your password.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            If you don't receive the email within a few minutes, please check
            your spam folder or try again.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/login"
              className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="forgot-form bg-white rounded-lg shadow-md p-6"
        >
          <div className="form-field mb-4">
            <label htmlFor="email" className="block text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`submit-button w-full bg-primary text-white py-3 rounded font-medium ${
              isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {isLoading ? (
              <div className="flex justify-center items-center">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Sending...
              </div>
            ) : (
              "Send Reset Link"
            )}
          </button>

          <div className="back-link text-center mt-4">
            <Link to="/login" className="text-primary hover:underline text-sm">
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
