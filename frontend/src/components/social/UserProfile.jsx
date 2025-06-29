// User profile component for social features
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const UserProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reviews');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchProfile();
    checkIfOwnProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/social/profile/${userId}`);
      
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        
        // Fetch additional data based on privacy settings
        if (profileData.show_reviews) {
          await fetchUserReviews();
        }
        
        await fetchFollowers();
        await fetchFollowing();
        await checkFollowStatus();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfOwnProfile = async () => {
    try {
      const response = await fetch('/api/social/profile/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const myProfile = await response.json();
        setIsOwnProfile(myProfile.user_id === userId);
      }
    } catch (error) {
      console.error('Error checking profile ownership:', error);
    }
  };

  const fetchUserReviews = async () => {
    try {
      // **MANUAL IMPLEMENTATION NEEDED**: Create endpoint to get user's reviews
      // For now, we'll use mock data
      setReviews([]);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  };

  const fetchFollowers = async () => {
    try {
      const response = await fetch(`/api/social/users/${userId}/followers?limit=6`);
      if (response.ok) {
        const data = await response.json();
        setFollowers(data.followers);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const fetchFollowing = async () => {
    try {
      const response = await fetch(`/api/social/users/${userId}/following?limit=6`);
      if (response.ok) {
        const data = await response.json();
        setFollowing(data.following);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (isOwnProfile) return;
    
    try {
      const response = await fetch('/api/social/profile/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const myProfile = await response.json();
        // Check if current user is following this profile
        const followingResponse = await fetch(`/api/social/users/${myProfile.user_id}/following`);
        if (followingResponse.ok) {
          const followingData = await followingResponse.json();
          const isFollowingUser = followingData.following.some(user => user.user_id === userId);
          setIsFollowing(isFollowingUser);
        }
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/social/follow/${userId}`, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        // Update follower count
        setProfile(prev => ({
          ...prev,
          follower_count: prev.follower_count + (isFollowing ? -1 : 1)
        }));
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    }
  };

  const formatJoinDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600">This user profile doesn't exist or has been made private.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
                  {profile.display_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {profile.display_name}
              </h1>
              
              {profile.bio && (
                <p className="text-gray-600 mb-3">{profile.bio}</p>
              )}

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                {profile.location && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{profile.location}</span>
                  </div>
                )}
                
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>Website</span>
                  </a>
                )}
                
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Joined {formatJoinDate(profile.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{profile.review_count || 0}</div>
            <div className="text-sm text-gray-500">Reviews</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{profile.follower_count || 0}</div>
            <div className="text-sm text-gray-500">Followers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{profile.following_count || 0}</div>
            <div className="text-sm text-gray-500">Following</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{profile.helpful_votes_received || 0}</div>
            <div className="text-sm text-gray-500">Helpful Votes</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['reviews', 'followers', 'following'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'reviews' && (
            <div>
              {profile.show_reviews ? (
                reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{review.title}</h3>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600">{review.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-gray-500">No reviews yet</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🔒</div>
                  <p className="text-gray-500">Reviews are private</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'followers' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {followers.map((follower) => (
                <Link
                  key={follower.user_id}
                  to={`/profile/${follower.user_id}`}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                    {follower.avatar_url ? (
                      <img
                        src={follower.avatar_url}
                        alt={follower.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        {follower.display_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{follower.display_name}</p>
                    <p className="text-sm text-gray-500 truncate">{follower.review_count} reviews</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === 'following' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {following.map((user) => (
                <Link
                  key={user.user_id}
                  to={`/profile/${user.user_id}`}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        {user.display_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.display_name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.review_count} reviews</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedProfile) => {
            setProfile(updatedProfile);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};

// Edit Profile Modal Component
const EditProfileModal = ({ profile, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    display_name: profile.display_name || '',
    bio: profile.bio || '',
    location: profile.location || '',
    website: profile.website || '',
    profile_public: profile.profile_public ?? true,
    show_reviews: profile.show_reviews ?? true,
    show_wishlists: profile.show_wishlists ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/social/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        onUpdate(updatedProfile);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Edit Profile</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell others about yourself..."
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="City, Country"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourwebsite.com"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {/* Privacy Settings */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900">Privacy Settings</h4>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.profile_public}
                  onChange={(e) => setFormData(prev => ({ ...prev, profile_public: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Make profile public</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.show_reviews}
                  onChange={(e) => setFormData(prev => ({ ...prev, show_reviews: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Show my reviews</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.show_wishlists}
                  onChange={(e) => setFormData(prev => ({ ...prev, show_wishlists: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Show my wishlists</span>
              </label>
            </div>

            {/* Submit buttons */}
            <div className="flex space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;