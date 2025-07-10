// frontend/src/components/auth/GoogleSignInButton.jsx
import React, { useEffect, useState, useRef } from "react";

/**
 * Google Sign-In Button Component - Simplified Version
 *
 * This component handles the Google OAuth flow using the renderButton approach
 */
const GoogleSignInButton = ({
  onSuccess,
  onError,
  buttonText = "Continue with Google",
  disabled = false,
  loadingText, // Allow custom loading text
}) => {
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [debugInfo, setDebugInfo] = useState("Initializing...");
  const googleButtonRef = useRef(null);
  const isLoadingRef = useRef(false);

  // Keep isLoadingRef in sync with isLoading state
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Derive loading text from button text if not provided
  const getLoadingText = () => {
    if (loadingText) return loadingText;
    
    // Smart detection based on button text
    if (buttonText.toLowerCase().includes('sign up') || buttonText.toLowerCase().includes('register')) {
      return "Signing up...";
    } else if (buttonText.toLowerCase().includes('sign in') || buttonText.toLowerCase().includes('login')) {
      return "Signing in...";
    } else {
      return "Loading...";
    }
  };

  /**
   * Load Google Sign-In SDK and configuration
   */
  useEffect(() => {
    const loadGoogleSDK = async () => {
      try {
        setDebugInfo("Fetching Google configuration...");

        // Get the Google Client ID from our backend
        const configResponse = await fetch(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:8001"
          }/auth/google/config`
        );

        if (!configResponse.ok) {
          const errorText = await configResponse.text();
          throw new Error(
            `Failed to get Google configuration: ${configResponse.status} - ${errorText}`
          );
        }

        const config = await configResponse.json();
        console.log("🔵 Google Config received:", config);

        if (!config.google_client_id) {
          throw new Error("No Google Client ID in configuration");
        }

        setGoogleClientId(config.google_client_id);
        setDebugInfo("Loading Google SDK...");

        // Check if Google SDK is already loaded
        if (
          window.google &&
          window.google.accounts &&
          window.google.accounts.id
        ) {
          console.log("✅ Google SDK already loaded");
          initializeGoogleSignIn(config.google_client_id);
          return;
        }

        // Load Google Sign-In SDK
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;

        script.onload = () => {
          console.log("✅ Google SDK script loaded");
          setDebugInfo("Initializing Google SDK...");

          // Wait a bit for the SDK to be fully available
          setTimeout(() => {
            if (
              window.google &&
              window.google.accounts &&
              window.google.accounts.id
            ) {
              initializeGoogleSignIn(config.google_client_id);
            } else {
              console.error("❌ Google SDK not available after script load");
              setLoadingError("Google SDK failed to initialize");
              setDebugInfo("Google SDK initialization failed");
            }
          }, 100);
        };

        script.onerror = () => {
          console.error("❌ Failed to load Google SDK script");
          setLoadingError("Failed to load Google SDK");
          setDebugInfo("Failed to load Google SDK");
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error("❌ Error in loadGoogleSDK:", error);
        setLoadingError(error.message);
        setDebugInfo(`Error: ${error.message}`);
        onError?.(error.message);
      }
    };

    loadGoogleSDK();
  }, [onError]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (window.googleAuthTimeout) {
        clearTimeout(window.googleAuthTimeout);
        window.googleAuthTimeout = null;
      }
    };
  }, []);

  /**
   * Initialize Google Sign-In and render the button
   */
  const initializeGoogleSignIn = (clientId) => {
    try {
      console.log("🔵 Initializing Google Sign-In with client ID:", clientId);

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      console.log("✅ Google Sign-In initialized successfully");
      setIsGoogleLoaded(true);
      setDebugInfo("Ready");
      setLoadingError(null);

      // Render the actual Google button in a hidden div
      if (googleButtonRef.current) {
        // Clear any existing content
        googleButtonRef.current.innerHTML = '';
        
        // Render Google's button
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          width: 300,
          logo_alignment: 'left'
        });

        console.log("✅ Google button rendered");
      }
    } catch (error) {
      console.error("❌ Error initializing Google Sign-In:", error);
      setLoadingError("Failed to initialize Google Sign-In");
      setDebugInfo(`Initialization error: ${error.message}`);
      onError?.(error.message);
    }
  };

  /**
   * Handle the response from Google Sign-In
   */
  const handleGoogleResponse = (response) => {
    try {
      console.log("🔵 Google response received:", response);
      
      // Clear the cancellation timeout since we got a response
      if (window.googleAuthTimeout) {
        clearTimeout(window.googleAuthTimeout);
        window.googleAuthTimeout = null;
      }
      
      setIsLoading(false);

      if (response.credential) {
        console.log("✅ Google Sign-In successful");
        onSuccess(response.credential);
      } else {
        throw new Error("No credential received from Google");
      }
    } catch (error) {
      console.error("❌ Google response error:", error);
      onError?.(error.message);
      setIsLoading(false);
    }
  };

  /**
   * Handle custom button click - trigger the hidden Google button
   */
  const handleSignInClick = () => {
    if (!isGoogleLoaded || !googleButtonRef.current) {
      console.error("❌ Google Sign-In not ready");
      onError?.("Google Sign-In not loaded yet. Please wait and try again.");
      return;
    }

    try {
      setIsLoading(true);
      console.log("🔵 Triggering Google Sign-In...");

      // Clear any existing timeout
      if (window.googleAuthTimeout) {
        clearTimeout(window.googleAuthTimeout);
        window.googleAuthTimeout = null;
      }

      // Set up popup close detection
      const startTime = Date.now();
      
      // Set a reasonable timeout to detect if user cancels/closes popup
      const cancelTimeout = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        // Only show cancel message if enough time has passed (user likely closed popup)
        if (elapsed < 2000) {
          console.log("⚠️ Google Sign-In popup closed quickly - user likely cancelled");
          setIsLoading(false);
          // Don't show error for quick cancellation - it's user choice
        } else {
          console.log("⚠️ Google Sign-In timeout - taking too long");
          setIsLoading(false);
          onError?.("Google Sign-In is taking too long. Please try again.");
        }
      }, 60000); // 60 seconds timeout (more generous)

      // Store the timeout reference so we can clear it if auth succeeds
      window.googleAuthTimeout = cancelTimeout;

      // Additional popup focus detection (best practice)
      const checkPopupClosed = () => {
        // This detects when user returns focus to main window (popup closed)
        const focusHandler = () => {
          setTimeout(() => {
            if (isLoadingRef.current && Date.now() - startTime > 1000) {
              console.log("⚠️ Focus returned to main window - popup likely closed");
              setIsLoading(false);
              if (window.googleAuthTimeout) {
                clearTimeout(window.googleAuthTimeout);
                window.googleAuthTimeout = null;
              }
            }
          }, 500); // Small delay to allow for successful auth completion
        };
        
        window.addEventListener('focus', focusHandler, { once: true });
      };

      // Start popup detection
      checkPopupClosed();

      // Find and click the actual Google button
      const googleButton = googleButtonRef.current.querySelector('[role="button"]');
      if (googleButton) {
        googleButton.click();
        console.log("✅ Google button clicked");
      } else {
        console.error("❌ Google button not found");
        clearTimeout(cancelTimeout);
        setIsLoading(false);
        onError?.("Google button not ready. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error triggering Google Sign-In:", error);
      onError?.(error.message);
      setIsLoading(false);
    }
  };

  // Show error state if there's a loading error
  if (loadingError) {
    return (
      <div className="w-full">
        <button
          disabled
          className="w-full flex items-center justify-center px-4 py-3 border border-red-300 rounded-lg
                     text-red-700 bg-red-50 opacity-50 cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Google Sign-In Unavailable</span>
        </button>
        <p className="text-xs text-red-600 mt-2 text-center">{loadingError}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hidden Google button - this is the real Google button */}
      <div 
        ref={googleButtonRef} 
        style={{ 
          position: 'absolute',
          left: '-9999px',
          visibility: 'hidden',
          pointerEvents: 'none'
        }}
      />

      {/* Main Google Sign-In button */}
      <button
        onClick={handleSignInClick}
        disabled={disabled || !isGoogleLoaded || isLoading}
        className={`
          w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg
          text-gray-700 bg-white hover:bg-gray-50 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
          transition-colors duration-200
          ${
            disabled || !isGoogleLoaded || isLoading
              ? "opacity-50 cursor-not-allowed"
              : "hover:shadow-md"
          }
        `}
      >
        {isLoading ? (
          // Loading state during sign-in process
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-3"></div>
            <span>{getLoadingText()}</span>
          </>
        ) : !isGoogleLoaded ? (
          // Loading state while SDK loads
          <>
            <div className="animate-pulse h-5 w-5 bg-gray-300 rounded mr-3"></div>
            <span className="text-gray-500">Loading...</span>
          </>
        ) : (
          // Ready state - show the normal button
          <>
            {/* Google Logo SVG */}
            <svg
              className="w-5 h-5 mr-3"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
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
            <span className="font-medium">{buttonText}</span>
          </>
        )}
      </button>

    </div>
  );
};

export default GoogleSignInButton;
