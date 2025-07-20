import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/index";
import BackButton from "../components/common/BackButton";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // Get token from URL
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
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

    // Password validation
    if (!formData.password) {
      newErrors.password = "New password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Token validation
    if (!token) {
      newErrors.general = "Invalid or expired password reset link";
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
      await api.post('/auth/reset-password', {
        token,
        new_password: formData.password
      });
      setIsSuccess(true);
      
      // After success, redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login", {
          state: {
            message:
              "Your password has been reset successfully. Please log in with your new password.",
          },
        });
      }, 3000);
    } catch (error) {
      setErrors({ general: error.data?.detail || 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Back Button */}
      <div className="mb-4">
        <BackButton />
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Reset Password
        </h1>
        <p className="text-gray-600">
          {isSuccess
            ? "Your password has been reset successfully"
            : "Create a new password for your account"}
        </p>
      </div>

      {errors.general && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errors.general}
        </div>
      )}

      {isSuccess ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
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
          <h2 className="text-xl font-semibold mb-2">
            Password Reset Successful
          </h2>
          <p className="text-gray-600 mb-6">
            Your password has been reset successfully. You will be redirected to
            the login page shortly.
          </p>
          <div className="flex justify-center">
            <Link
              to="/login"
              className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Login
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-md p-6"
        >
          {/* New Password Field */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-gray-700 mb-1"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-primary text-white py-3 rounded font-medium ${
              isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {isLoading ? (
              <div className="flex justify-center items-center">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Resetting Password...
              </div>
            ) : (
              "Reset Password"
            )}
          </button>

          <div className="text-center mt-4">
            <Link to="/login" className="text-primary hover:underline text-sm">
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ResetPasswordPage;
