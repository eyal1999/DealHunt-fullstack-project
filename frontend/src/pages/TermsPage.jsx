import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const TermsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if user came from registration page
  const fromRegistration = location.state?.fromRegistration;
  const savedFormData = location.state?.formData;

  // Handle back navigation
  const handleBackNavigation = () => {
    if (fromRegistration && savedFormData) {
      // Go back to registration with preserved form data
      navigate('/register', {
        state: { formData: savedFormData }
      });
    } else {
      // Default to home page
      navigate('/');
    }
  };

  // Handle navigation to privacy policy with state preservation
  const handlePrivacyNavigation = () => {
    if (fromRegistration && savedFormData) {
      navigate('/privacy', {
        state: { 
          formData: savedFormData,
          fromRegistration: true 
        }
      });
    } else {
      navigate('/privacy');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="prose max-w-none">
          <p className="mb-4">
            Welcome to DealHunt. By accessing or using our service, you agree to
            be bound by these Terms and Conditions.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            1. Acceptance of Terms
          </h2>
          <p className="mb-4">
            By accessing and using DealHunt, you accept and agree to be bound by
            the terms and provisions of this agreement. If you do not agree to
            abide by these terms, please do not use our service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            2. Description of Service
          </h2>
          <p className="mb-4">
            DealHunt is a price comparison service that helps users find the
            best deals across multiple e-commerce platforms, including but not
            limited to AliExpress and eBay. We provide links to these
            third-party websites and do not sell products directly.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. User Accounts</h2>
          <p className="mb-4">
            Some features of DealHunt may require user registration. You agree
            to provide accurate and complete information when creating an
            account and to update your information to keep it accurate and
            current. You are responsible for maintaining the confidentiality of
            your account password and for all activities that occur under your
            account.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Privacy Policy</h2>
          <p className="mb-4">
            Your use of DealHunt is also governed by our Privacy Policy, which
            can be found{" "}
            <button 
              onClick={handlePrivacyNavigation}
              className="text-primary hover:underline"
            >
              here
            </button>
            .
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. User Conduct</h2>
          <p className="mb-4">
            You agree not to use DealHunt for any unlawful purpose or in any way
            that could damage, disable, overburden, or impair our service. You
            also agree not to attempt to gain unauthorized access to any part of
            DealHunt, other accounts, computer systems, or networks connected to
            DealHunt.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            6. Third-Party Websites
          </h2>
          <p className="mb-4">
            DealHunt may contain links to third-party websites. These links are
            provided solely as a convenience to you and not as an endorsement by
            DealHunt of the content on such third-party websites. We are not
            responsible for the content of linked third-party sites and do not
            make any representations regarding their content or accuracy.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            7. Disclaimer of Warranties
          </h2>
          <p className="mb-4">
            DealHunt is provided on an "as is" and "as available" basis. We make
            no warranties, expressed or implied, and hereby disclaim all
            warranties, including without limitation, implied warranties of
            merchantability, fitness for a particular purpose, or
            non-infringement.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            8. Limitation of Liability
          </h2>
          <p className="mb-4">
            In no event shall DealHunt be liable for any indirect, incidental,
            special, consequential, or punitive damages arising out of or
            related to your use of our service, including but not limited to,
            damages for loss of profits, goodwill, use, data, or other
            intangible losses.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            9. Changes to Terms
          </h2>
          <p className="mb-4">
            We reserve the right to modify these Terms and Conditions at any
            time. We will notify users of any changes by posting the new Terms
            and Conditions on this page and updating the "Last updated" date at
            the bottom of this page.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">10. Governing Law</h2>
          <p className="mb-4">
            These Terms shall be governed by and construed in accordance with
            the laws of [Your Country], without regard to its conflict of law
            provisions.
          </p>

          <p className="mt-8 text-sm text-gray-600">
            Last updated: May 13, 2025
          </p>
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={handleBackNavigation}
            className="bg-primary text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            {fromRegistration ? 'Back to Registration' : 'Back to Home'}
          </button>
          
          {fromRegistration && (
            <button
              onClick={handlePrivacyNavigation}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              View Privacy Policy
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
