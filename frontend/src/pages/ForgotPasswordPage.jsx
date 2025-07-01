import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/index";
// Note: Scroll reveal animations disabled as they were hiding content

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // No scroll reveal animations - they were causing content to be hidden

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
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md min-h-96">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Forgot Password
        </h1>
        <p className="text-gray-600">
          Enter your email address to receive password reset instructions
        </p>
      </div>
      
      {errors.general && (
        <div className="forgot-error bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {errors.general}
        </div>
      )}

      {isSubmitted ? (
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-12 h-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 7.89a1 1 0 001.42 0L21 7M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email!</h2>
          <div className="space-y-4">
            <p className="text-gray-700">
              We have successfully sent a password reset link to:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 font-semibold">{email}</p>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Check your email inbox for a message from DealHunt</p>
              <p>• Click the reset link in the email</p>
              <p>• The link will expire in 1 hour for security</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link
              to="/login"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
            >
              Return to Login
            </Link>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setEmail("");
                setErrors({});
              }}
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Try Different Email
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
            } text-white`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Sending...
              </div>
            ) : (
              'Send Reset Link'
            )}
          </button>
          
          <div className="text-center mt-4">
            <Link to="/login" className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
