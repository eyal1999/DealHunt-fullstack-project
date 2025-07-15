import React from "react";
import { Link } from "react-router-dom";

const PrivacyPolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="prose max-w-none">
          <p className="mb-4">
            At DealHunt, we are committed to protecting your privacy and ensuring
            the security of your personal information. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our price comparison service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            1. Information We Collect
          </h2>
          
          <h3 className="text-lg font-medium mt-4 mb-2">1.1 Personal Information</h3>
          <p className="mb-4">
            When you create an account, we may collect:
          </p>
          <ul className="list-disc list-inside mb-4 ml-4">
            <li>Name and email address</li>
            <li>Profile picture (optional)</li>
            <li>Password (encrypted and stored securely)</li>
            <li>Account preferences and settings</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2">1.2 Usage Information</h3>
          <p className="mb-4">
            We automatically collect information about how you use DealHunt:
          </p>
          <ul className="list-disc list-inside mb-4 ml-4">
            <li>Search queries and browsing history</li>
            <li>Products viewed and wishlist items</li>
            <li>Device information (browser type, operating system)</li>
            <li>IP address and general location information</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2">1.3 Third-Party Information</h3>
          <p className="mb-4">
            When you use Google Sign-In, we receive basic profile information
            from Google as permitted by your Google account settings.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            2. How We Use Your Information
          </h2>
          <p className="mb-4">We use your information to:</p>
          <ul className="list-disc list-inside mb-4 ml-4">
            <li>Provide and improve our price comparison services</li>
            <li>Personalize your experience and recommendations</li>
            <li>Maintain your wishlist and account preferences</li>
            <li>Send you price alerts and notifications (if enabled)</li>
            <li>Analyze usage patterns to improve our service</li>
            <li>Ensure security and prevent fraud</li>
            <li>Communicate with you about service updates</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            3. Information Sharing and Disclosure
          </h2>
          <p className="mb-4">
            We do not sell, trade, or rent your personal information to third
            parties. We may share your information only in the following
            circumstances:
          </p>
          <ul className="list-disc list-inside mb-4 ml-4">
            <li>
              <strong>Affiliate Partners:</strong> When you click on product
              links, we may share anonymous usage data with AliExpress, eBay,
              and other partner platforms for commission tracking purposes.
            </li>
            <li>
              <strong>Service Providers:</strong> We may share information with
              trusted third-party service providers who assist us in operating
              our website and conducting our business.
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may disclose information
              if required by law or in good faith belief that such disclosure
              is necessary to comply with legal process.
            </li>
            <li>
              <strong>Business Transfers:</strong> In the event of a merger,
              acquisition, or sale of assets, your information may be
              transferred as part of that transaction.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Security</h2>
          <p className="mb-4">
            We implement appropriate technical and organizational security
            measures to protect your personal information against unauthorized
            access, alteration, disclosure, or destruction. These measures
            include:
          </p>
          <ul className="list-disc list-inside mb-4 ml-4">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication and access controls</li>
            <li>Regular security assessments and updates</li>
            <li>Limited access to personal information on a need-to-know basis</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Your Rights</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc list-inside mb-4 ml-4">
            <li>
              <strong>Access:</strong> Request a copy of the personal
              information we hold about you
            </li>
            <li>
              <strong>Correction:</strong> Request correction of inaccurate or
              incomplete information
            </li>
            <li>
              <strong>Deletion:</strong> Request deletion of your personal
              information (subject to certain limitations)
            </li>
            <li>
              <strong>Portability:</strong> Request transfer of your
              information in a machine-readable format
            </li>
            <li>
              <strong>Objection:</strong> Object to certain processing of your
              information
            </li>
            <li>
              <strong>Restriction:</strong> Request restriction of processing
              under certain circumstances
            </li>
          </ul>
          <p className="mb-4">
            To exercise these rights, please contact us using the information
            provided at the end of this policy.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">6. Cookies and Tracking</h2>
          <p className="mb-4">
            We use cookies and similar tracking technologies to enhance your
            experience. You can control cookie settings through your browser
            preferences. Note that disabling cookies may affect the
            functionality of our service.
          </p>
          
          <h3 className="text-lg font-medium mt-4 mb-2">Types of Cookies We Use:</h3>
          <ul className="list-disc list-inside mb-4 ml-4">
            <li>
              <strong>Essential Cookies:</strong> Required for basic website
              functionality
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Help us understand how you
              use our service
            </li>
            <li>
              <strong>Preference Cookies:</strong> Remember your settings and
              preferences
            </li>
            <li>
              <strong>Marketing Cookies:</strong> Used to provide relevant
              recommendations
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Third-Party Links</h2>
          <p className="mb-4">
            Our service contains links to third-party websites (AliExpress,
            eBay, etc.). We are not responsible for the privacy practices of
            these external sites. We encourage you to review their privacy
            policies before providing any personal information.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">8. Children's Privacy</h2>
          <p className="mb-4">
            Our service is not intended for children under 13 years of age. We
            do not knowingly collect personal information from children under
            13. If we become aware that we have collected such information, we
            will take steps to delete it promptly.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">9. International Transfers</h2>
          <p className="mb-4">
            Your information may be transferred to and processed in countries
            other than your country of residence. We ensure appropriate
            safeguards are in place to protect your information in accordance
            with applicable data protection laws.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">10. Data Retention</h2>
          <p className="mb-4">
            We retain your personal information for as long as necessary to
            provide our services and fulfill the purposes outlined in this
            privacy policy, unless a longer retention period is required or
            permitted by law. When we no longer need your information, we will
            securely delete or anonymize it.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">
            11. Changes to This Privacy Policy
          </h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time to reflect
            changes in our practices or for other operational, legal, or
            regulatory reasons. We will notify you of any material changes by
            posting the updated policy on our website and updating the "Last
            updated" date below.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">12. Contact Us</h2>
          <p className="mb-4">
            If you have any questions, concerns, or requests regarding this
            Privacy Policy or our data practices, please contact us at:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p><strong>Email:</strong> privacy@dealhunt.com</p>
            <p><strong>Address:</strong> DealHunt Privacy Team</p>
            <p>123 Technology Street</p>
            <p>Digital City, DC 12345</p>
          </div>

          <h2 className="text-xl font-semibold mt-6 mb-3">13. Legal Basis for Processing (EU Users)</h2>
          <p className="mb-4">
            For users in the European Union, our legal basis for processing
            your personal information includes:
          </p>
          <ul className="list-disc list-inside mb-4 ml-4">
            <li>
              <strong>Consent:</strong> When you provide explicit consent for
              specific processing activities
            </li>
            <li>
              <strong>Contract:</strong> When processing is necessary to provide
              our services to you
            </li>
            <li>
              <strong>Legitimate Interests:</strong> When we have legitimate
              business interests that do not override your rights
            </li>
            <li>
              <strong>Legal Obligation:</strong> When required by applicable law
            </li>
          </ul>

          <p className="mt-8 text-sm text-gray-600">
            Last updated: December 15, 2024
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/terms"
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Terms & Conditions
          </Link>
          <Link
            to="/"
            className="bg-primary text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;