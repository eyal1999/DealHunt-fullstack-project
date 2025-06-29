// Role and permissions management component
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon, 
  UserGroupIcon, 
  KeyIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const RoleManagement = () => {
  const [userPermissions, setUserPermissions] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleDefinitions, setRoleDefinitions] = useState({});

  useEffect(() => {
    loadAvailableRoles();
    loadAvailablePermissions();
    loadMyPermissions();
  }, []);

  const loadAvailableRoles = async () => {
    try {
      const response = await fetch('/api/user-management/roles');
      if (response.ok) {
        const roles = await response.json();
        setAvailableRoles(roles);
        
        // Create role definitions with permissions
        const definitions = {};
        for (const role of roles) {
          definitions[role.value] = {
            name: role.name,
            description: role.description || `${role.name} role`,
            permissions: await getRolePermissions(role.value)
          };
        }
        setRoleDefinitions(definitions);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadAvailablePermissions = async () => {
    try {
      const response = await fetch('/api/user-management/permissions');
      if (response.ok) {
        const permissions = await response.json();
        setAvailablePermissions(permissions);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const loadMyPermissions = async () => {
    try {
      const response = await fetch('/api/user-management/my-permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const permissions = await response.json();
        setUserPermissions(permissions);
      }
    } catch (error) {
      console.error('Error loading my permissions:', error);
    }
  };

  const getRolePermissions = async (roleValue) => {
    // This would typically come from a role definition API
    // For now, we'll define permissions based on role
    const rolePermissions = {
      'super_admin': [
        'manage_users', 'view_user_details', 'modify_user_roles', 'delete_users',
        'manage_products', 'moderate_reviews', 'manage_categories',
        'access_admin_panel', 'view_system_stats', 'manage_system_settings', 'access_logs',
        'manage_marketplaces', 'configure_apis', 'view_analytics', 'export_data',
        'view_user_analytics', 'manage_deal_alerts', 'trigger_manual_hunts',
        'unlimited_wishlists', 'priority_support', 'advanced_analytics', 'bulk_operations'
      ],
      'admin': [
        'manage_users', 'view_user_details', 'modify_user_roles',
        'manage_products', 'moderate_reviews', 'manage_categories',
        'access_admin_panel', 'view_system_stats', 'manage_marketplaces',
        'view_analytics', 'export_data', 'manage_deal_alerts', 'trigger_manual_hunts'
      ],
      'moderator': [
        'view_user_details', 'moderate_reviews', 'manage_categories',
        'access_admin_panel', 'view_analytics'
      ],
      'premium_user': [
        'unlimited_wishlists', 'priority_support', 'advanced_analytics',
        'bulk_operations', 'view_analytics', 'export_data'
      ],
      'regular_user': [],
      'guest': []
    };

    return rolePermissions[roleValue] || [];
  };

  const searchUsers = async (query) => {
    if (!query) return [];
    
    try {
      // This would be a user search API
      // For now, mock some users
      const mockUsers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'regular_user' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'premium_user' },
        { id: '3', name: 'Admin User', email: 'admin@example.com', role: 'admin' }
      ];
      
      return mockUsers.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  const assignRole = async (userId, role) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/user-management/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role })
      });

      if (response.ok) {
        alert('Role assigned successfully');
        setSelectedUser('');
        setSelectedRole('');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to assign role');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      alert('Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = async (userId) => {
    try {
      const response = await fetch(`/api/user-management/users/${userId}/role`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        return data.role;
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }
    return null;
  };

  const hasPermission = (permission) => {
    return userPermissions.includes(permission);
  };

  const getPermissionDescription = (permission) => {
    const descriptions = {
      'manage_users': 'Create, edit, and manage user accounts',
      'view_user_details': 'View detailed user information and profiles',
      'modify_user_roles': 'Assign and change user roles',
      'delete_users': 'Delete user accounts',
      'manage_products': 'Add, edit, and remove products',
      'moderate_reviews': 'Moderate user reviews and ratings',
      'manage_categories': 'Manage product categories',
      'access_admin_panel': 'Access administrative interface',
      'view_system_stats': 'View system statistics and metrics',
      'manage_system_settings': 'Configure system settings',
      'access_logs': 'View system and audit logs',
      'manage_marketplaces': 'Configure marketplace integrations',
      'configure_apis': 'Configure external API settings',
      'view_analytics': 'View analytics and reports',
      'export_data': 'Export data and reports',
      'view_user_analytics': 'View detailed user analytics',
      'manage_deal_alerts': 'Manage deal alert configurations',
      'trigger_manual_hunts': 'Manually trigger deal hunting',
      'unlimited_wishlists': 'Create unlimited wishlists',
      'priority_support': 'Access to priority customer support',
      'advanced_analytics': 'Access advanced analytics features',
      'bulk_operations': 'Perform bulk operations on data'
    };
    return descriptions[permission] || permission.replace(/_/g, ' ');
  };

  const [searchResults, setSearchResults] = useState([]);

  const handleUserSearch = async (query) => {
    setSearchTerm(query);
    if (query.length > 2) {
      const results = await searchUsers(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Role Management</h2>
        </div>
        <p className="text-gray-600">
          Manage user roles and permissions across the platform.
        </p>
      </div>

      {/* My Permissions */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <KeyIcon className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-medium text-gray-900">My Permissions</h3>
        </div>
        
        {userPermissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {userPermissions.map(permission => (
              <div key={permission} className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-green-900">{permission.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-green-700">{getPermissionDescription(permission)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No special permissions assigned.</p>
        )}
      </div>

      {/* Role Assignment */}
      {hasPermission('modify_user_roles') && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <UserGroupIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Assign Role to User</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* User Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search User
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleUserSearch(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Search by name or email..."
              />
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-300 rounded max-h-40 overflow-y-auto">
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user.id);
                        setSearchTerm(user.name);
                        setSearchResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email} • {user.role}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Choose a role...</option>
                {availableRoles.map(role => (
                  <option key={role.value} value={role.value}>{role.name}</option>
                ))}
              </select>
            </div>

            {/* Assign Button */}
            <div className="flex items-end">
              <button
                onClick={() => assignRole(selectedUser, selectedRole)}
                disabled={!selectedUser || !selectedRole || loading}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Definitions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Role Definitions</h3>
          <p className="text-sm text-gray-600 mt-1">
            Overview of all available roles and their permissions.
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {availableRoles.map(role => {
            const definition = roleDefinitions[role.value];
            const permissions = definition?.permissions || [];
            
            return (
              <div key={role.value} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{role.name}</h4>
                    <p className="text-sm text-gray-600">{definition?.description}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    role.value === 'super_admin' ? 'bg-red-100 text-red-800' :
                    role.value === 'admin' ? 'bg-purple-100 text-purple-800' :
                    role.value === 'moderator' ? 'bg-blue-100 text-blue-800' :
                    role.value === 'premium_user' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {role.value}
                  </span>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Permissions ({permissions.length})
                  </h5>
                  {permissions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {permissions.map(permission => (
                        <div key={permission} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <CheckIcon className="w-3 h-3 text-green-600 flex-shrink-0" />
                          <span className="text-xs text-gray-700">{permission.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No special permissions</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Reference */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Permission Reference</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Complete list of all available permissions and their descriptions.
          </p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePermissions.map(permission => (
              <div key={permission.value} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{permission.name}</h4>
                  {hasPermission(permission.value) ? (
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  ) : (
                    <XMarkIcon className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-600">{getPermissionDescription(permission.value)}</p>
                <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                  {permission.value}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;