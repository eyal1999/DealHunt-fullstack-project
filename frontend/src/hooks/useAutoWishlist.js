// frontend/src/hooks/useAutoWishlist.js
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { wishlistService } from "../api/apiServices";

/**
 * Custom hook to handle automatic wishlist actions after login
 */
export const useAutoWishlist = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();

  useEffect(() => {
    const handleAutoWishlistAction = async () => {
      // Check if user just logged in and there's a pending wishlist action
      if (!isAuthenticated || !currentUser) {
        return;
      }

      // Check for pending wishlist data in sessionStorage (persistent across navigation)
      const pendingWishlistData = sessionStorage.getItem('pendingWishlistAdd');
      
      if (!pendingWishlistData) {
        return;
      }

      try {
        const productData = JSON.parse(pendingWishlistData);
        
        console.log("🔵 Found pending wishlist action, auto-adding product:", productData);

        // Add the product to wishlist automatically
        await wishlistService.addToWishlist(productData);

        console.log("✅ Product automatically added to wishlist after login");

        // Show success message with better UX
        const successBanner = document.createElement('div');
        successBanner.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
        successBanner.innerHTML = `
          <div class="flex items-center">
            <span class="mr-2">✅</span>
            <span>"${productData.title}" has been added to your wishlist!</span>
          </div>
        `;
        document.body.appendChild(successBanner);
        
        // Remove the banner after 4 seconds
        setTimeout(() => {
          if (document.body.contains(successBanner)) {
            document.body.removeChild(successBanner);
          }
        }, 4000);

        // Clear the sessionStorage to prevent re-execution
        sessionStorage.removeItem('pendingWishlistAdd');

      } catch (error) {
        console.error("❌ Failed to auto-add product to wishlist:", error);
        
        // Show error message with better UX
        const errorBanner = document.createElement('div');
        errorBanner.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
        errorBanner.innerHTML = `
          <div class="flex items-center">
            <span class="mr-2">❌</span>
            <span>Failed to add "${productData.title}" to your wishlist. Please try again.</span>
          </div>
        `;
        document.body.appendChild(errorBanner);
        
        // Remove the banner after 5 seconds
        setTimeout(() => {
          if (document.body.contains(errorBanner)) {
            document.body.removeChild(errorBanner);
          }
        }, 5000);
        
        // Clear the sessionStorage anyway to prevent infinite retries
        sessionStorage.removeItem('pendingWishlistAdd');
      }
    };

    // Only run this effect when user becomes authenticated
    if (isAuthenticated) {
      // Small delay to ensure auth context is fully updated
      const timeoutId = setTimeout(handleAutoWishlistAction, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, currentUser]);

  return null; // This hook doesn't return anything
};

export default useAutoWishlist;