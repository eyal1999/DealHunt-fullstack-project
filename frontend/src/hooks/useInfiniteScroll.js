// frontend/src/hooks/useInfiniteScroll.js
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for implementing infinite scrolling functionality
 *
 * How it works:
 * 1. Tracks scroll position and detects when user is near bottom
 * 2. Triggers fetchMore function when threshold is reached
 * 3. Manages loading states and prevents duplicate API calls
 * 4. Handles errors and provides retry functionality
 *
 * @param {Function} fetchMore - Function to fetch next page of data
 * @param {Object} options - Configuration options
 * @returns {Object} Hook state and functions
 */
export const useInfiniteScroll = (fetchMore, options = {}) => {
  const {
    threshold = 200, // Distance from bottom to trigger load (pixels)
    enabled = true, // Whether infinite scroll is enabled
    hasMore = true, // Whether there are more items to load
    rootMargin = "200px", // Intersection observer root margin
  } = options;

  // State management for infinite scrolling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref to track if we're currently fetching to prevent duplicate calls
  const fetchingRef = useRef(false);

  // Ref for the target element that triggers loading when visible
  const targetRef = useRef(null);

  /**
   * Function to handle fetching more data
   * Uses useCallback to memoize the function and prevent unnecessary re-renders
   */
  const handleFetchMore = useCallback(async () => {
    // Prevent multiple simultaneous fetch calls
    if (fetchingRef.current || !enabled || !hasMore) {
      return;
    }

    try {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      // Call the provided fetchMore function
      await fetchMore();
    } catch (err) {
      console.error("Error fetching more data:", err);
      setError(err.message || "Failed to load more items");
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [fetchMore, enabled, hasMore]);

  /**
   * Set up Intersection Observer for efficient scroll detection
   * This is more performant than listening to scroll events
   */
  useEffect(() => {
    const target = targetRef.current;
    if (!target || !enabled || !hasMore) return;

    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        // Check if the target element is visible
        const [entry] = entries;
        if (entry.isIntersecting) {
          handleFetchMore();
        }
      },
      {
        // rootMargin allows triggering before element is fully visible
        rootMargin,
        threshold: 0.1, // Trigger when 10% of element is visible
      }
    );

    observer.observe(target);

    // Cleanup function to disconnect observer
    return () => {
      observer.disconnect();
    };
  }, [handleFetchMore, enabled, hasMore, rootMargin]);

  /**
   * Fallback scroll listener for better browser compatibility
   * This runs in addition to Intersection Observer
   */
  useEffect(() => {
    if (!enabled || !hasMore) return;

    const handleScroll = () => {
      // Calculate how close we are to the bottom
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Trigger fetch when within threshold distance from bottom
      if (distanceFromBottom < threshold && !fetchingRef.current) {
        handleFetchMore();
      }
    };

    // Add scroll listener with throttling for performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", throttledScroll);
    };
  }, [handleFetchMore, threshold, enabled, hasMore]);

  /**
   * Function to retry failed requests
   */
  const retry = useCallback(() => {
    setError(null);
    handleFetchMore();
  }, [handleFetchMore]);

  // Return hook state and functions
  return {
    isLoading, // Boolean: whether we're currently loading more data
    error, // String: error message if something went wrong
    targetRef, // Ref: attach this to element that should trigger loading
    retry, // Function: retry loading after an error
  };
};
