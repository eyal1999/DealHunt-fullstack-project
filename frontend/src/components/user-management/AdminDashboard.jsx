// Admin dashboard for user management
import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [adminActions, setAdminActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    limit: 50,
    offset: 0
  });
  const [availableOptions, setAvailableOptions] = useState({
    roles: [],
    statuses: [],
    permissions: []
  });

  useEffect(() => {
    loadSystemStats();
    loadUsers();
    loadAdminActions();
    loadAvailableOptions();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/user-management/admin/stats/system', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const stats = await response.json();
        setSystemStats(stats);
      }
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/user-management/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
      } else {
        console.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminActions = async () => {
    try {
      const response = await fetch('/api/user-management/admin/actions?limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const actions = await response.json();
        setAdminActions(actions);
      }
    } catch (error) {
      console.error('Error loading admin actions:', error);
    }
  };

  const loadAvailableOptions = async () => {
    try {
      const [rolesRes, statusesRes, permissionsRes] = await Promise.all([
        fetch('/api/user-management/roles'),
        fetch('/api/user-management/status-types'),
        fetch('/api/user-management/permissions')
      ]);

      const [roles, statuses, permissions] = await Promise.all([
        rolesRes.json(),
        statusesRes.json(),
        permissionsRes.json()
      ]);

      setAvailableOptions({
        roles: roles || [],
        statuses: statuses.status_types || [],
        permissions: permissions || []
      });
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await fetch(`/api/user-management/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        loadUsers();
        loadAdminActions();
        alert('Role updated successfully');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const response = await fetch(`/api/user-management/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        loadUsers();
        loadAdminActions();
        alert('Status updated successfully');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDeleteUser = async (userId, softDelete = true) => {
    const action = softDelete ? 'soft delete' : 'permanently delete';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/user-management/admin/users/${userId}?soft_delete=${softDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        loadUsers();
        loadAdminActions();
        alert('User deleted successfully');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'text-red-600 bg-red-100';
      case 'admin': return 'text-purple-600 bg-purple-100';
      case 'moderator': return 'text-blue-600 bg-blue-100';
      case 'premium_user': return 'text-green-600 bg-green-100';
      case 'regular_user': return 'text-gray-600 bg-gray-100';
      case 'guest': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'suspended': return 'text-yellow-600 bg-yellow-100';
      case 'banned': return 'text-red-600 bg-red-100';
      case 'pending_verification': return 'text-blue-600 bg-blue-100';
      case 'deleted': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & System Stats */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">User management and system administration</p>
          </div>
          <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
        </div>

        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <UsersIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Users</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{systemStats.total_users}</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Active Sessions</span>
              </div>
              <div className="text-2xl font-bold text-green-900 mt-1">{systemStats.active_sessions}</div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Recent Activity</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900 mt-1">{systemStats.recent_activities_24h}</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm font-medium text-purple-900">Admins</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                {(systemStats.users_by_role?.admin || 0) + (systemStats.users_by_role?.super_admin || 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value, offset: 0 }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Roles</option>
              {availableOptions.roles.map(role => (
                <option key={role.value} value={role.value}>{role.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, offset: 0 }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Statuses</option>
              {availableOptions.statuses.map(status => (
                <option key={status.value} value={status.value}>{status.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), offset: 0 }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ role: '', status: '', limit: 50, offset: 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Users ({users.length})</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 mt-2">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No users found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.picture_url ? (
                          <img 
                            src={user.picture_url} 
                            alt={user.full_name}
                            className="w-8 h-8 rounded-full mr-3"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                            <UsersIcon className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.current_role}
                        onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getRoleColor(user.current_role)}`}
                      >
                        {availableOptions.roles.map(role => (
                          <option key={role.value} value={role.value}>{role.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.status || 'active'}
                        onChange={(e) => handleStatusChange(user.user_id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(user.status || 'active')}`}
                      >
                        {availableOptions.statuses.map(status => (
                          <option key={status.value} value={status.value}>{status.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewUserDetails(user)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.user_id, true)}
                          className="text-yellow-600 hover:text-yellow-800"
                          title="Soft delete"
                        >
                          <ExclamationTriangleIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.user_id, false)}
                          className="text-red-600 hover:text-red-800"
                          title="Permanent delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, filters.offset + users.length)} of results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              disabled={filters.offset === 0}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              disabled={users.length < filters.limit}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Recent Admin Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Admin Actions</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {adminActions.slice(0, 10).map(action => (
            <div key={action.action_id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{action.description}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Action: {action.action_type} | Admin: {action.admin_user_id}
                    {action.target_user_id && ` | Target: ${action.target_user_id}`}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(action.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">User Details</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="text-sm text-gray-900">{selectedUser.full_name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="text-sm text-gray-900">{selectedUser.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <div className={`inline-block text-xs px-2 py-1 rounded-full ${getRoleColor(selectedUser.current_role)}`}>
                    {selectedUser.current_role}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className={`inline-block text-xs px-2 py-1 rounded-full ${getStatusColor(selectedUser.status || 'active')}`}>
                    {selectedUser.status || 'active'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <div className="text-sm text-gray-900">
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Login</label>
                  <div className="text-sm text-gray-900">
                    {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;