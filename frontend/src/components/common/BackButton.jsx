import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

const BackButton = ({ 
  fallbackPath = '/', 
  fallbackLabel = 'Back',
  className = '',
  showIcon = true 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine back navigation context
  const getBackNavigation = () => {
    const currentPath = location.pathname;
    const state = location.state;
    
    // Special case: If we have explicit navigation state with form data (Terms/Privacy from registration)
    if (state?.fromRegistration && state?.formData) {
      return {
        path: '/register',
        label: 'Back to Registration',
        useState: true
      };
    }

    // Special case: Authentication pages should go to login
    if (currentPath.includes('/forgot-password') || currentPath.includes('/reset-password')) {
      return {
        path: '/login',
        label: 'Back to Login',
        useState: false
      };
    }

    // For all other cases, use browser history
    return {
      path: -1,
      label: getContextAwareLabel(currentPath),
      useState: false
    };
  };

  // Get context-aware label based on current page
  const getContextAwareLabel = (currentPath) => {
    if (currentPath.includes('/product/')) {
      // Try to determine where we came from
      if (document.referrer.includes('/search')) {
        return 'Back to Search Results';
      }
      if (document.referrer.includes('/categories')) {
        return 'Back to Categories';
      }
      return 'Back';
    }
    
    if (currentPath.includes('/search')) {
      if (document.referrer.includes('/categories')) {
        return 'Back to Categories';
      }
      return 'Back';
    }

    if (currentPath.includes('/profile') || currentPath.includes('/wishlist')) {
      return 'Back';
    }

    return 'Back';
  };

  const handleBack = () => {
    const navigation = getBackNavigation();
    
    if (navigation.path === -1) {
      // Use browser back
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(fallbackPath);
      }
    } else if (navigation.useState) {
      // Navigate with state preservation (Terms/Privacy back to registration)
      navigate(navigation.path, {
        state: { formData: location.state.formData }
      });
    } else {
      // Regular navigation
      navigate(navigation.path);
    }
  };

  const { label } = getBackNavigation();

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200 ${className}`}
    >
      {showIcon && (
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
      )}
      {label}
    </button>
  );
};

export default BackButton;