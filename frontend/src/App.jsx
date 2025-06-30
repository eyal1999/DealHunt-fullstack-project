import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import SearchResultsPage from "./pages/SearchResultsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import WishlistPage from "./pages/WishlistPage";
import TermsPage from "./pages/TermsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import InstallBanner from "./components/pwa/InstallBanner";
import { useEffect } from "react";
import { initPageAnimations } from "./utils/scrollReveal";

// Loading component for initial auth check
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4 mx-auto"></div>
      <p className="text-gray-600">Loading DealHunt...</p>
    </div>
  </div>
);

// Main app component that uses auth context
const AppContent = () => {
  const { loading } = useAuth();

  // Initialize common page animations
  useEffect(() => {
    initPageAnimations();
  }, []);

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Public routes */}
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchResultsPage />} />
          <Route
            path="product/:marketplace/:id"
            element={
              <ErrorBoundary>
                <ProductDetailPage />
              </ErrorBoundary>
            }
          />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route
            path="forgot-password"
            element={<ForgotPasswordPage />}
          />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="profile" element={<ProfilePage />} />
            <Route path="wishlist" element={<WishlistPage />} />
          </Route>
        </Route>
      </Routes>
      
      {/* PWA Install Banner */}
      <InstallBanner />
    </BrowserRouter>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
