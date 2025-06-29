// Social sharing component for products, wishlists, and deals
import React, { useState } from 'react';

const SocialShare = ({ 
  contentType, 
  contentId, 
  title, 
  description, 
  imageUrl,
  className = '' 
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState('');

  const shareOptions = [
    {
      platform: 'facebook',
      name: 'Facebook',
      icon: '📘',
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white'
    },
    {
      platform: 'twitter',
      name: 'Twitter',
      icon: '🐦',
      color: 'bg-sky-500 hover:bg-sky-600',
      textColor: 'text-white'
    },
    {
      platform: 'linkedin',
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-blue-700 hover:bg-blue-800',
      textColor: 'text-white'
    },
    {
      platform: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white'
    },
    {
      platform: 'email',
      name: 'Email',
      icon: '📧',
      color: 'bg-gray-600 hover:bg-gray-700',
      textColor: 'text-white'
    },
    {
      platform: 'copy',
      name: 'Copy Link',
      icon: '🔗',
      color: 'bg-gray-100 hover:bg-gray-200',
      textColor: 'text-gray-700'
    }
  ];

  const handleShare = async (platform) => {
    try {
      // Get share URL from backend
      const response = await fetch(
        `/api/social/share-url?content_type=${contentType}&content_id=${contentId}&platform=${platform}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate share URL');
      }
      
      const data = await response.json();
      
      if (platform === 'copy') {
        // Copy to clipboard
        await navigator.clipboard.writeText(data.content_url);
        setShareSuccess('Link copied to clipboard!');
        setTimeout(() => setShareSuccess(''), 3000);
      } else {
        // Open share URL in new window
        const width = 600;
        const height = 400;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        window.open(
          data.share_url,
          'share',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
        
        // Track the share
        await trackShare(platform, data.content_url);
      }
      
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    }
  };

  const trackShare = async (platform, contentUrl) => {
    try {
      await fetch('/api/social/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          share_type: contentType,
          content_id: contentId,
          content_title: title,
          content_url: contentUrl,
          content_image: imageUrl,
          platform: platform
        })
      });
    } catch (error) {
      console.error('Error tracking share:', error);
    }
  };

  const getContentTypeDisplay = () => {
    const types = {
      'product': '🛍️ Product',
      'wishlist': '❤️ Wishlist',
      'deal': '💰 Deal',
      'review': '⭐ Review'
    };
    return types[contentType] || '📄 Content';
  };

  return (
    <>
      {/* Share button */}
      <button
        onClick={() => setShowShareModal(true)}
        className={`flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors ${className}`}
        title="Share this content"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
        <span>Share</span>
      </button>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Share {getContentTypeDisplay()}
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex space-x-3">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Content preview"
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{title}</h4>
                    {description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Share options */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {shareOptions.map((option) => (
                  <button
                    key={option.platform}
                    onClick={() => handleShare(option.platform)}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${option.color} ${option.textColor}`}
                  >
                    <span className="text-lg">{option.icon}</span>
                    <span className="font-medium">{option.name}</span>
                  </button>
                ))}
              </div>

              {/* Success message */}
              {shareSuccess && (
                <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                  {shareSuccess}
                </div>
              )}

              {/* Share stats (if user has shared before) */}
              <div className="text-center">
                <div className="text-sm text-gray-500">
                  Help others discover great deals by sharing!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Quick share button for inline use
export const QuickShareButton = ({ contentType, contentId, title, size = 'sm' }) => {
  const [sharing, setSharing] = useState(false);

  const quickShare = async () => {
    setSharing(true);
    
    try {
      // Get share URL and copy to clipboard
      const response = await fetch(
        `/api/social/share-url?content_type=${contentType}&content_id=${contentId}&platform=copy`
      );
      
      if (response.ok) {
        const data = await response.json();
        await navigator.clipboard.writeText(data.content_url);
        
        // Show success feedback
        const button = document.activeElement;
        const originalText = button.innerHTML;
        button.innerHTML = '✓ Copied!';
        button.classList.add('bg-green-500', 'text-white');
        
        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove('bg-green-500', 'text-white');
        }, 2000);
      }
    } catch (error) {
      console.error('Error copying link:', error);
    } finally {
      setSharing(false);
    }
  };

  const buttonSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <button
      onClick={quickShare}
      disabled={sharing}
      className={`${buttonSizes[size]} flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50`}
      title="Copy share link"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
      </svg>
    </button>
  );
};

// Social share widget for displaying share counts
export const SocialShareWidget = ({ contentType, contentId, showCounts = true }) => {
  const [shareCounts, setShareCounts] = useState({
    facebook: 0,
    twitter: 0,
    total: 0
  });

  useEffect(() => {
    if (showCounts) {
      fetchShareCounts();
    }
  }, [contentType, contentId, showCounts]);

  const fetchShareCounts = async () => {
    try {
      // **MANUAL IMPLEMENTATION NEEDED**: Implement share count tracking
      // You'll need to create an endpoint to get share counts for content
      
      // Mock data for now
      setShareCounts({
        facebook: Math.floor(Math.random() * 100),
        twitter: Math.floor(Math.random() * 50),
        total: Math.floor(Math.random() * 200)
      });
    } catch (error) {
      console.error('Error fetching share counts:', error);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <SocialShare
        contentType={contentType}
        contentId={contentId}
        title="Check this out!"
        className="flex-shrink-0"
      />
      
      {showCounts && shareCounts.total > 0 && (
        <div className="text-sm text-gray-500">
          {shareCounts.total} shares
        </div>
      )}
    </div>
  );
};

export default SocialShare;