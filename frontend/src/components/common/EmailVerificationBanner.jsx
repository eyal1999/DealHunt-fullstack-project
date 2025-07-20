import React, { useState } from 'react';
import authService from '../../api/authService';

const EmailVerificationBanner = ({ user, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if user is verified, doesn't have email, or is dismissed
  if (!user || user.email_verified || dismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      const response = await authService.resendVerificationEmail(user.email);
      alert(response.message || 'Verification email sent successfully!');
    } catch (error) {
      alert(error.message || 'Failed to resend verification email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Email Verification Required
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Please verify your email address to access all features. Check your inbox for a verification link.
            </p>
          </div>
          
          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              className="bg-yellow-100 px-3 py-1 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Resend Email'}
            </button>
            
            <button
              onClick={handleDismiss}
              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 focus:outline-none focus:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={handleDismiss}
              className="inline-flex bg-yellow-50 rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;