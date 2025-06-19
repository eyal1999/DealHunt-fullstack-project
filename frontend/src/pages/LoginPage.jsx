import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, error: authError } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Get the redirect information from location state
  const from = location.state?.from || "/";
  const redirectMessage = location.state?.message;
  const redirectAction = location.state?.action;
  const productTitle = location.state?.productTitle;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

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

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Login form submitted"); // Debug log

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      console.log("Attempting login..."); // Debug log

      // Use the auth context to log in
      const success = await login(formData.email, formData.password);

      console.log("Login result:", success); // Debug log

      if (!success) {
        console.log("Login failed:", authError); // Debug log
        setErrors({ general: authError || "Invalid email or password" });
      }
      // No need to navigate here - the useEffect will handle it
    } catch (err) {
      console.error("Login error:", err); // Debug log
      setErrors({ general: err.message || "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = () => {
    // In a real app, implement OAuth login with Google
    // For now, we'll keep the simulation
    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);

      // In a real app, this would be handled by an OAuth flow
      // For demo purposes, simulate successful login
      const mockUser = {
        id: "123",
        fullName: "Google User",
        email: "google.user@example.com",
      };

      localStorage.setItem("token", "mock-google-jwt-token");
      localStorage.setItem("user", JSON.stringify(mockUser));

      // This will refresh the page and useEffect will handle the redirect
      window.location.reload();
    }, 1000);
  };

  // Generate contextual messages based on redirect reason
  const getContextualMessage = () => {
    if (redirectAction === "add_to_wishlist" && productTitle) {
      return {
        type: "info",
        title: "Login Required",
        message: `Please log in to add "${productTitle}" to your wishlist. You'll be redirected back to the product page after logging in.`,
      };
    }

    if (redirectMessage) {
      return {
        type: "info",
        title: "Authentication Required",
        message: redirectMessage,
      };
    }

    if (location.state?.message) {
      return {
        type: "success",
        title: "Success",
        message: location.state.message,
      };
    }

    return null;
  };

  const contextualMessage = getContextualMessage();

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
        <p className="text-gray-600">Sign in to your DealHunt account</p>
      </div>

      {/* Display contextual message based on redirect reason */}
      {contextualMessage && (
        <div
          className={`px-4 py-3 rounded mb-4 border ${
            contextualMessage.type === "success"
              ? "bg-green-100 border-green-400 text-green-700"
              : contextualMessage.type === "info"
              ? "bg-blue-100 border-blue-400 text-blue-700"
              : "bg-yellow-100 border-yellow-400 text-yellow-700"
          }`}
        >
          <div className="flex items-start">
            <span className="mr-2 mt-0.5">
              {contextualMessage.type === "success"
                ? "✅"
                : contextualMessage.type === "info"
                ? "ℹ️"
                : "⚠️"}
            </span>
            <div>
              <div className="font-medium">{contextualMessage.title}</div>
              <div className="text-sm mt-1">{contextualMessage.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Display general errors */}
      {errors.general && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-gray-700 mb-1">
            Password
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
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">Remember me</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-primary hover:text-blue-700"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded font-medium transition-colors ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-primary hover:bg-blue-700"
          } text-white`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Signing in...
            </div>
          ) : (
            "Sign In"
          )}
        </button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full border border-gray-300 py-3 px-4 rounded font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Register Link */}
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-primary hover:text-blue-700 font-medium"
          >
            Sign up here
          </Link>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
