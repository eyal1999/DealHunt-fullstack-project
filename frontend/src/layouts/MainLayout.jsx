import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import EmailVerificationBanner from "../components/common/EmailVerificationBanner";
import { useAuth } from "../contexts/AuthContext";

const MainLayout = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <div className="navbar">
        <Navbar />
      </div>

      {/* Email verification banner */}
      {user && (
        <div className="container mx-auto px-4 pt-4">
          <EmailVerificationBanner user={user} />
        </div>
      )}

      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="footer bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-600">
            © {new Date().getFullYear()} DealHunt. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
