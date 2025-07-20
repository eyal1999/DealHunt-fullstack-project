import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { getImageUrl, getFallbackImageUrl } from '../../utils/simpleImageProxy';

// Zoom Control Component
const ZoomControl = ({ 
  zoomLevel, 
  onZoomChange, 
  minZoom = 1.5, 
  maxZoom = 5.0, 
  step = 0.1 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  
  // Calculate percentage for slider position
  const percentage = ((zoomLevel - minZoom) / (maxZoom - minZoom)) * 100;
  
  // Handle move calculation
  const handleMove = useCallback((e) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const relativeX = x - rect.left;
    const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
    const newZoom = minZoom + (percentage / 100) * (maxZoom - minZoom);
    
    onZoomChange(Math.round(newZoom * 10) / 10); // Round to 1 decimal place
  }, [minZoom, maxZoom, onZoomChange]);
  
  // Handle slider drag
  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleMove(e);
  };
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !sliderRef.current) return;
    handleMove(e);
  }, [isDragging, handleMove]);
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle touch events
  const handleTouchStart = (e) => {
    setIsDragging(true);
    handleMove(e);
  };
  
  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e);
  }, [isDragging, handleMove]);
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  };
  
  // Handle increment/decrement buttons
  const handleIncrement = () => {
    const newZoom = Math.min(maxZoom, zoomLevel + step);
    onZoomChange(Math.round(newZoom * 10) / 10);
  };
  
  const handleDecrement = () => {
    const newZoom = Math.max(minZoom, zoomLevel - step);
    onZoomChange(Math.round(newZoom * 10) / 10);
  };
  
  // Add global mouse/touch listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove]);
  
  return (
    <div className="zoom-control-container flex items-center gap-3 bg-black bg-opacity-70 backdrop-blur-sm rounded-full px-4 py-3 select-none">
      {/* Minus Button */}
      <button
        onClick={handleDecrement}
        disabled={zoomLevel <= minZoom}
        className={`zoom-button w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          zoomLevel <= minZoom
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
        }`}
        title="Decrease zoom"
      >
        <MinusIcon className="w-5 h-5" />
      </button>
      
      {/* Slider Container */}
      <div className="zoom-slider-wrapper relative flex items-center">
        {/* Zoom Level Display */}
        <span className="text-white text-sm font-medium mr-3 min-w-[3rem] text-center">
          {zoomLevel.toFixed(1)}x
        </span>
        
        {/* Slider Track */}
        <div
          ref={sliderRef}
          className="zoom-slider relative w-32 h-2 bg-white bg-opacity-20 rounded-full cursor-pointer overflow-hidden"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Progress Fill */}
          <div
            className="absolute left-0 top-0 h-full bg-white bg-opacity-70 rounded-full pointer-events-none transition-all duration-100"
            style={{ width: `${percentage}%` }}
          />
          
          {/* Slider Thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-100 ${
              isDragging ? 'scale-125' : 'scale-100'
            }`}
            style={{ left: `calc(${percentage}% - 8px)` }}
          >
            {/* Inner dot for better visibility */}
            <div className="absolute inset-1 bg-gray-800 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Plus Button */}
      <button
        onClick={handleIncrement}
        disabled={zoomLevel >= maxZoom}
        className={`zoom-button w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          zoomLevel >= maxZoom
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
        }`}
        title="Increase zoom"
      >
        <PlusIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

// Image Magnifier Component
const ImageMagnifier = ({ 
  src, 
  alt, 
  magnifierSize = 150, 
  zoomLevel = 2.5,
  className = "",
  onLoad,
  onError
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [imagePos, setImagePos] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  
  const imgRef = useRef(null);
  const magnifierRef = useRef(null);

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTouch('ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle mouse move over image
  const handleMouseMove = useCallback((e) => {
    // Skip magnifier on mobile/touch devices for better performance
    if (!imgRef.current || !isImageLoaded || isMobile || isTouch) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if mouse is within image bounds
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      setShowMagnifier(true);
      
      // Calculate magnifier position (centered on cursor)
      const magnifierX = e.clientX - magnifierSize / 2;
      const magnifierY = e.clientY - magnifierSize / 2;
      
      setMagnifierPos({ x: magnifierX, y: magnifierY });
      
      // Calculate the position on the original image for background positioning
      const imgX = (x / rect.width) * 100;
      const imgY = (y / rect.height) * 100;
      
      setImagePos({ x: imgX, y: imgY });
    } else {
      setShowMagnifier(false);
    }
  }, [magnifierSize, isImageLoaded, isMobile, isTouch]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setShowMagnifier(false);
  }, []);

  // Handle touch events for mobile magnifier
  const handleTouchStart = useCallback((e) => {
    if (!imgRef.current || !isImageLoaded || !isMobile) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const rect = imgRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Check if touch is within image bounds
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      setShowMagnifier(true);
      
      // Calculate magnifier position (offset from touch to avoid finger blocking)
      const magnifierX = touch.clientX - magnifierSize / 2;
      const magnifierY = touch.clientY - magnifierSize - 50; // Offset above finger
      
      setMagnifierPos({ x: magnifierX, y: magnifierY });
      
      // Calculate the position on the original image for background positioning
      const imgX = (x / rect.width) * 100;
      const imgY = (y / rect.height) * 100;
      
      setImagePos({ x: imgX, y: imgY });
    }
  }, [magnifierSize, isImageLoaded, isMobile]);

  const handleTouchMove = useCallback((e) => {
    if (!imgRef.current || !isImageLoaded || !isMobile || !showMagnifier) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const rect = imgRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Check if touch is within image bounds
    if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
      // Calculate magnifier position (offset from touch to avoid finger blocking)
      const magnifierX = touch.clientX - magnifierSize / 2;
      const magnifierY = touch.clientY - magnifierSize - 50; // Offset above finger
      
      setMagnifierPos({ x: magnifierX, y: magnifierY });
      
      // Calculate the position on the original image for background positioning
      const imgX = (x / rect.width) * 100;
      const imgY = (y / rect.height) * 100;
      
      setImagePos({ x: imgX, y: imgY });
    } else {
      setShowMagnifier(false);
    }
  }, [magnifierSize, isImageLoaded, isMobile, showMagnifier]);

  const handleTouchEnd = useCallback(() => {
    if (isMobile) {
      setShowMagnifier(false);
    }
  }, [isMobile]);

  // Handle image load
  const handleImageLoad = useCallback((e) => {
    setIsImageLoaded(true);
    const { naturalWidth, naturalHeight } = e.target;
    setImageSize({ width: naturalWidth, height: naturalHeight });
    
    // Call parent's onLoad if provided
    if (onLoad) {
      onLoad(e);
    }
  }, [onLoad]);

  // Prevent magnifier from going outside viewport
  const getConstrainedPosition = useCallback((x, y) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let constrainedX = x;
    let constrainedY = y;
    
    // Keep magnifier within viewport bounds
    if (x < 10) constrainedX = 10;
    if (y < 10) constrainedY = 10;
    if (x + magnifierSize > viewportWidth - 10) constrainedX = viewportWidth - magnifierSize - 10;
    if (y + magnifierSize > viewportHeight - 10) constrainedY = viewportHeight - magnifierSize - 10;
    
    return { x: constrainedX, y: constrainedY };
  }, [magnifierSize]);

  const constrainedPos = getConstrainedPosition(magnifierPos.x, magnifierPos.y);

  return (
    <div className={`relative ${className}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl ${
          isMobile ? 'cursor-pointer' : 'cursor-crosshair'
        }`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onLoad={handleImageLoad}
        onError={(e) => {
          e.target.src = getFallbackImageUrl();
          setIsImageLoaded(true);
          
          // Call parent's onError if provided
          if (onError) {
            onError(e);
          }
        }}
        style={{
          maxHeight: 'calc(100vh - 200px)',
          maxWidth: 'calc(100vw - 100px)',
          touchAction: isMobile ? 'none' : 'auto' // Prevent default touch behaviors on mobile
        }}
      />
      
      {/* Magnifier Lens */}
      {showMagnifier && isImageLoaded && (
        <div
          ref={magnifierRef}
          className="fixed pointer-events-none z-[60] border-2 border-white shadow-2xl rounded-full"
          style={{
            left: `${constrainedPos.x}px`,
            top: `${constrainedPos.y}px`,
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            backgroundImage: `url(${src})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${imageSize.width * zoomLevel}px ${imageSize.height * zoomLevel}px`,
            backgroundPosition: `-${(imagePos.x * imageSize.width * zoomLevel) / 100 - magnifierSize / 2}px -${(imagePos.y * imageSize.height * zoomLevel) / 100 - magnifierSize / 2}px`,
            backgroundColor: 'white',
            boxShadow: '0 0 0 3px rgba(0,0,0,0.1), 0 8px 32px rgba(0,0,0,0.3)'
          }}
        >
          {/* Crosshair indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-0.5 bg-white bg-opacity-50 absolute"></div>
            <div className="h-full w-0.5 bg-white bg-opacity-50 absolute"></div>
          </div>
          
          {/* Magnifier border effect */}
          <div 
            className="absolute inset-0 rounded-full border border-gray-300"
            style={{
              background: 'linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.1) 50%, transparent 52%)'
            }}
          ></div>
        </div>
      )}
      
      {/* Magnifier instruction hint */}
      {isImageLoaded && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm opacity-70 pointer-events-none">
          {isMobile ? 'Touch and hold to magnify' : 'Hover to magnify'}
        </div>
      )}
    </div>
  );
};

const ImageModal = ({ 
  images = [], 
  initialIndex = 0, 
  isOpen = false, 
  onClose,
  productTitle = 'Product'
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(2.5); // Default zoom level
  const modalRef = useRef(null);
  const imageRef = useRef(null);
  const thumbnailContainerRef = useRef(null);

  // Zoom constants
  const MIN_ZOOM = 1.5;
  const MAX_ZOOM = 5.0;
  const ZOOM_STEP = 0.5;

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Update current index when initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        goToPrevious();
        break;
      case 'ArrowRight':
        e.preventDefault();
        goToNext();
        break;
      case '+':
      case '=': // Handle both + and = keys (= is the unshifted + key)
        e.preventDefault();
        setZoomLevel(prev => Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 10) / 10));
        break;
      case '-':
      case '_': // Handle both - and _ keys
        e.preventDefault();
        setZoomLevel(prev => Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 10) / 10));
        break;
      default:
        break;
    }
  }, [isOpen, onClose]);

  // Add/remove keyboard event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  }, [images.length]);

  const goToImage = useCallback((index) => {
    if (index >= 0 && index < images.length) {
      setCurrentIndex(index);
    }
  }, [images.length]);

  // Handle touch events for swipe navigation
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Handle click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  // Image loading handler
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = (e) => {
    e.target.src = getFallbackImageUrl();
    setImageLoading(false);
  };

  // Set loading state when image changes
  useEffect(() => {
    if (isOpen && images[currentIndex]) {
      setImageLoading(true);
    }
  }, [currentIndex, isOpen, images]);

  // Scroll thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current && isOpen) {
      const thumbnail = thumbnailContainerRef.current.children[currentIndex];
      if (thumbnail) {
        thumbnail.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentIndex, isOpen]);

  if (!isOpen || images.length === 0) {
    return null;
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
      onClick={handleOverlayClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-60 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all duration-200 group"
        title="Close gallery"
      >
        <XMarkIcon className="h-6 w-6 text-white group-hover:text-gray-200" />
      </button>

      {/* Image Counter */}
      <div className="absolute top-4 left-4 z-60 bg-white bg-opacity-20 rounded-full px-4 py-2">
        <span className="text-white text-sm font-medium">
          {currentIndex + 1} of {images.length}
        </span>
      </div>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-60 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all duration-200 group"
          title="Previous image"
        >
          <ChevronLeftIcon className="h-6 w-6 text-white group-hover:text-gray-200" />
        </button>
      )}

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-60 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all duration-200 group"
          title="Next image"
        >
          <ChevronRightIcon className="h-6 w-6 text-white group-hover:text-gray-200" />
        </button>
      )}

      {/* Main Container with proper layout */}
      <div className="flex flex-col h-full w-full max-w-6xl mx-auto">
        {/* Image Display Area */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          <div className="relative max-w-full max-h-full">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-lg z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
            <ImageMagnifier
              src={getImageUrl(images[currentIndex])}
              alt={`${productTitle} - Image ${currentIndex + 1}`}
              magnifierSize={200}
              zoomLevel={zoomLevel}
              className="max-w-full max-h-full"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        </div>

        {/* Zoom Control */}
        <div className="flex justify-center mt-4 mb-2">
          <ZoomControl
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            step={0.5}
          />
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="mt-4">
            <div
              ref={thumbnailContainerRef}
              className="flex gap-2 overflow-x-auto pb-2 px-4 justify-center scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitScrollbar: { display: 'none' }
              }}
            >
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    index === currentIndex
                      ? 'border-white shadow-lg scale-110'
                      : 'border-gray-600 border-opacity-50 hover:border-white hover:border-opacity-70'
                  }`}
                  title={`View image ${index + 1}`}
                >
                  <img
                    src={getImageUrl(image)}
                    alt={`${productTitle} - Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = getFallbackImageUrl();
                    }}
                  />
                </button>
                ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ImageModal;