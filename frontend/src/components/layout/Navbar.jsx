import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import DealHuntLogo from "../../assets/DEALHUNT_LOGO.png";
import profileService from "../../api/profileService";
import SearchDropdown from "../search/SearchDropdown";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  // Get profile picture URL
  const getProfilePictureUrl = () => {
    if (currentUser?.picture_url) {
      return profileService.getProfilePictureUrl(currentUser.picture_url);
    }
    return profileService.getDefaultAvatar(currentUser?.full_name || 'User');
  };

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  // Handle search submission
  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setSearchQuery("");
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsDropdownOpen(false); // Close dropdown when logging out
  };

  // Handle dropdown hover with proper timing
  const handleDropdownMouseEnter = () => {
    // Clear any existing timeout
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setIsDropdownOpen(true);
  };

  const handleDropdownMouseLeave = () => {
    // Set a delay before hiding the dropdown
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 150); // 150ms delay - enough time to move mouse to dropdown
  };

  return (
    <nav className="bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src={DealHuntLogo}
                alt="DealHunt Logo"
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Search Bar - Hide on mobile */}
          <div className="hidden md:flex flex-1 px-4 max-w-xl mx-4">
            <SearchDropdown
              searchQuery={searchQuery}
              onSearch={handleSearch}
              onQueryChange={setSearchQuery}
              placeholder="Search for products..."
              className="w-full"
            />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <>
                <Link
                  to="/wishlist"
                  className="text-primary hover:text-primary-dark"
                >
                  Wishlist
                </Link>
                <div 
                  className="relative"
                  onMouseEnter={handleDropdownMouseEnter}
                  onMouseLeave={handleDropdownMouseLeave}
                >
                  <button className="flex items-center text-primary hover:text-primary-dark focus:outline-none">
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 border-2 border-primary">
                      <img
                        src={getProfilePictureUrl()}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = profileService.getDefaultAvatar(currentUser?.full_name || 'User');
                        }}
                      />
                    </div>
                    <span className="mr-1">
                      {currentUser["full_name"].split(" ")[0]}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-[9999] border border-gray-200">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-primary hover:text-primary-dark"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-500 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Search - Visible only on mobile */}
        <div className="md:hidden pb-4">
          <SearchDropdown
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onQueryChange={setSearchQuery}
            placeholder="Search for products..."
            className="w-full"
          />
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-3">
              {currentUser ? (
                <>
                  <Link
                    to="/wishlist"
                    className="text-primary hover:text-primary-dark"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Wishlist
                  </Link>
                  <Link
                    to="/profile"
                    className="text-primary hover:text-primary-dark"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="text-primary hover:text-primary-dark text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-primary hover:text-primary-dark"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-primary hover:text-primary-dark"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
